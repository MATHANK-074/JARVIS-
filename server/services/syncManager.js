import User from "../models/User.js";
import Task from "../models/Task.js";
import { syncGmail, syncCalendar, syncWhatsApp } from "./syncService.js";
import { getWhatsAppStatus } from "./whatsappService.js";

const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes
let isSyncing = false;

/**
 * Sync all users who have active integration tokens
 */
export const syncAllUsersData = async () => {
    if (isSyncing) {
        console.log("⏳ [SyncManager] Sync already in progress, skipping...");
        return;
    }

    isSyncing = true;
    console.log("🔄 [SyncManager] Starting background sync for all users...");

    try {
        const users = await User.find({ accessToken: { $exists: true } });
        console.log(`👥 [SyncManager] Found ${users.length} users to sync.`);

        for (const user of users) {
            try {
                // 1. WhatsApp Sync (Global client for now)
                const waStatus = getWhatsAppStatus();
                if (waStatus.isReady) {
                    await syncWhatsApp(user._id);
                }

                // 2. Gmail Sync
                await syncGmail(user._id, user.accessToken);

                // 3. Calendar Sync
                await syncCalendar(user._id, user.accessToken);

                // 4. Priority Auto-Escalation
                await autoEscalateTasks(user._id);

            } catch (userErr) {
                console.error(`❌ [SyncManager] Error syncing data for user ${user.email}:`, userErr.message);
            }
        }
    } catch (error) {
        console.error("❌ [SyncManager] Global Sync Error:", error);
    } finally {
        isSyncing = false;
        console.log("✅ [SyncManager] Background sync cycle completed.");
    }
};

/**
 * Escalate priorities based on impending due dates
 */
const autoEscalateTasks = async (userId) => {
    try {
        const tasks = await Task.find({ userId, status: "pending", dueDate: { $exists: true, $ne: null } });
        const now = new Date();

        let updatedCount = 0;
        for (const task of tasks) {
            // Check if task is currently snoozed
            if (task.snoozedUntil) {
                if (new Date(task.snoozedUntil) > now) {
                    continue; // Skip this task, it's snoozed
                } else {
                    // Snooze period expired, clear it
                    task.snoozedUntil = null;
                }
            }

            const hoursDiff = (new Date(task.dueDate) - now) / (1000 * 60 * 60);

            let newPriority = task.priority;
            if (hoursDiff < 24 && task.priority !== "urgent") {
                newPriority = "urgent";
            } else if (hoursDiff < 72 && task.priority === "low") {
                newPriority = "medium";
            }

            if (newPriority !== task.priority || task.snoozedUntil === null) {
                task.priority = newPriority;
                await task.save();
                updatedCount++;
            }
        }
        if (updatedCount > 0) {
            console.log(`📈 [SyncManager] Escalated priority of ${updatedCount} tasks for User ${userId}`);
        }
    } catch (error) {
        console.error(`❌ [SyncManager] Auto-Escalation Error for User ${userId}:`, error.message);
    }
};

/**
 * Initialize the background sync scheduler
 */
export const startBackgroundSync = () => {
    console.log(`⏰ [SyncManager] Background sync scheduled every ${SYNC_INTERVAL / 1000 / 60} minutes.`);

    // Run once on startup after a short delay
    setTimeout(syncAllUsersData, 10000);

    // Schedule periodic runs
    setInterval(syncAllUsersData, SYNC_INTERVAL);
};
