import Task from "../models/Task.js";
import { fetchRecentEmails } from "./gmailService.js";
import { extractTaskFromEmail } from "./groqService.js";
import { fetchUpcomingEvents } from "./calendarService.js";
import { syncWhatsAppTasks as waSync } from "./whatsappService.js";

/**
 * Synchronize Gmail messages into Tasks
 */
export const syncGmail = async (userId, accessToken) => {
    console.log(`📥 [Sync] Gmail for User ${userId}`);
    const emails = await fetchRecentEmails(accessToken);

    const results = await Promise.all(emails.map(async (email) => {
        try {
            const existing = await Task.findOne({ userId, sourceId: email.id });
            if (existing) return null;

            const result = await extractTaskFromEmail(email);
            if (result.isActionable) {
                return await Task.create({
                    userId,
                    title: result.title,
                    description: result.description,
                    priority: result.priority,
                    dueDate: result.dueDate,
                    source: "gmail",
                    sourceId: email.id,
                });
            }
        } catch (err) {
            console.error(`❌ [Sync] Gmail Error for email ${email.id}:`, err.message);
        }
        return null;
    }));

    return results.filter(t => t !== null);
};

/**
 * Synchronize Calendar events into Tasks
 */
export const syncCalendar = async (userId, accessToken) => {
    console.log(`📅 [Sync] Calendar for User ${userId}`);
    const events = await fetchUpcomingEvents(accessToken);

    const results = await Promise.all(events.map(async (event) => {
        try {
            const existing = await Task.findOne({ userId, sourceId: event.id });
            if (existing) return null;

            const startTime = new Date(event.start);
            const now = new Date();
            const hoursDiff = (startTime - now) / (1000 * 60 * 60);

            let priority = "low";
            if (hoursDiff < 24) priority = "urgent";
            else if (hoursDiff < 72) priority = "medium";

            return await Task.create({
                userId,
                title: event.summary,
                description: event.description || `Location: ${event.location}`,
                priority,
                dueDate: startTime,
                source: "calendar",
                sourceId: event.id,
            });
        } catch (err) {
            console.error(`❌ [Sync] Calendar Error for event ${event.id}:`, err.message);
        }
        return null;
    }));

    return results.filter(t => t !== null);
};

/**
 * Synchronize WhatsApp messages into Tasks
 */
export const syncWhatsApp = async (userId) => {
    console.log(`💬 [Sync] WhatsApp for User ${userId}`);
    return await waSync(userId);
};
