import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import { extractTaskFromEmail } from './groqService.js';
import Task from '../models/Task.js';

let client;
let qrCodeBase64 = null;
let isReady = false;

/**
 * Initialize WhatsApp Client
 */
export const initWhatsApp = () => {
    if (client) return;

    console.log("📱 Initializing WhatsApp Client...");
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            headless: 'new', // Use the newer headless mode
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ],
            bypassCSP: true,
        }
    });

    client.on('qr', (qr) => {
        console.log("🎫 WhatsApp QR Code generated.");
        qrcode.toDataURL(qr, (err, url) => {
            if (!err) qrCodeBase64 = url;
        });
        isReady = false;
    });

    client.on('ready', () => {
        console.log("✅ WhatsApp Client is READY!");
        qrCodeBase64 = null;
        isReady = true;
    });

    client.on('authenticated', () => {
        console.log("🔓 WhatsApp Authenticated.");
    });

    client.on('auth_failure', (msg) => {
        console.error("❌ WhatsApp Auth Failure:", msg);
        qrCodeBase64 = null;
        isReady = false;
    });

    client.on('disconnected', (reason) => {
        console.log("🔌 WhatsApp Disconnected:", reason);
        qrCodeBase64 = null;
        isReady = false;
    });

    try {
        client.initialize().catch(err => {
            console.error("❌ Failed to initialize WhatsApp Client:", err.message);
            isReady = false;
        });
    } catch (error) {
        console.error("❌ Critical WhatsApp Init Error:", error);
    }
};

export const getWhatsAppStatus = () => ({
    isReady,
    qrCode: qrCodeBase64
});

/**
 * Sync tasks from unread WhatsApp messages
 */
export const syncWhatsAppTasks = async (userId) => {
    if (!isReady) throw new Error("WHATSAPP_NOT_READY");

    try {
        const chats = await client.getChats();
        const unreadChats = chats.filter(chat => chat.unreadCount > 0);

        console.log(`💬 Found ${unreadChats.length} chats with unread messages.`);

        let totalCreated = 0;
        const tasksCreated = [];

        for (const chat of unreadChats) {
            const messages = await chat.fetchMessages({ limit: chat.unreadCount });

            for (const msg of messages) {
                if (msg.fromMe) continue;

                // Simple check: is there an existing task for this message ID?
                const existing = await Task.findOne({ userId, sourceId: msg.id._serialized });
                if (existing) continue;

                console.log(`🤖 Processing WhatsApp message from ${chat.name}...`);

                // Use the same extraction logic as Gmail
                const aiResult = await extractTaskFromEmail({
                    subject: `WhatsApp Chat with ${chat.name}`,
                    from: chat.name,
                    snippet: msg.body
                });

                if (aiResult.isActionable) {
                    const newTask = await Task.create({
                        userId,
                        title: aiResult.title,
                        description: aiResult.description,
                        priority: aiResult.priority || "medium",
                        dueDate: aiResult.dueDate ? new Date(aiResult.dueDate) : null,
                        source: "whatsapp",
                        sourceId: msg.id._serialized,
                    });
                    tasksCreated.push(newTask);
                    totalCreated++;
                }
            }
            // Mark as read after sync
            await chat.sendSeen();
        }

        return tasksCreated;
    } catch (error) {
        console.error("WhatsApp Sync Error:", error);
        throw error;
    }
};
