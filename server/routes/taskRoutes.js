import express from "express";
import jwt from "jsonwebtoken";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { fetchRecentEmails } from "../services/gmailService.js";
import { extractTaskFromEmail } from "../services/groqService.js";

const router = express.Router();

// Middleware to protect routes
const auth = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};

// @route   GET /api/tasks
// @desc    Get all tasks for logged in user
router.get("/", auth, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.userId, status: "pending" }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// @route   GET /api/tasks/sync-gmail
// @desc    Sync tasks from Gmail using AI
router.get("/sync-gmail", auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || !user.accessToken) {
            return res.status(400).json({ message: "Google account not connected or tokens missing" });
        }

        // 1. Fetch recent emails
        console.log("📥 Sync Start: Fetching unread emails for", user.email);
        const emails = await fetchRecentEmails(user.accessToken);
        console.log(`📑 Found ${emails.length} unread emails snippets.`);

        if (emails.length === 0) {
            return res.json({ message: "No unread emails to sync.", tasks: [] });
        }

        // 2. Process each email with OpenAI in parallel
        console.log("🤖 Processing emails with AI in parallel...");
        const syncResults = await Promise.all(emails.map(async (email) => {
            try {
                // Check if task from this email already exists
                const existing = await Task.findOne({ userId: req.userId, sourceId: email.id });
                if (existing) return null;

                const result = await extractTaskFromEmail(email);

                if (result.isActionable) {
                    return await Task.create({
                        userId: req.userId,
                        title: result.title,
                        description: result.description,
                        priority: result.priority,
                        dueDate: result.dueDate,
                        source: "gmail",
                        sourceId: email.id,
                    });
                }
            } catch (err) {
                console.error(`❌ Error processing email ${email.id}:`, err);
            }
            return null;
        }));

        const newTasks = syncResults.filter(task => task !== null);
        console.log(`✅ Sync complete. Created ${newTasks.length} new tasks.`);

        res.json({ message: `Sync complete. Found ${newTasks.length} new tasks.`, tasks: newTasks });

    } catch (error) {
        if (error.message === "GROQ_API_KEY_MISSING") {
            return res.status(500).json({ message: "Groq API Key is missing. Please add GROQ_API_KEY to your .env file." });
        }
        console.error("Sync Error:", error);
        res.status(500).json({ message: "Synchronization failed" });
    }

});

// @route   POST /api/tasks
// @desc    Create a new task
router.post("/", auth, async (req, res) => {
    try {
        const { title, description, priority, dueDate, source } = req.body;
        const newTask = await Task.create({
            userId: req.userId,
            title,
            description,
            priority,
            dueDate,
            source,
        });
        res.status(201).json(newTask);
    } catch (error) {
        res.status(400).json({ message: "Error creating task" });
    }
});

// @route   PATCH /api/tasks/:id
// @desc    Update a task
router.patch("/:id", auth, async (req, res) => {
    try {
        const updatedTask = await Task.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true }
        );
        if (!updatedTask) return res.status(404).json({ message: "Task not found" });
        res.json(updatedTask);
    } catch (error) {
        res.status(400).json({ message: "Error updating task" });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
router.delete("/:id", auth, async (req, res) => {
    try {
        const deletedTask = await Task.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
        });
        if (!deletedTask) return res.status(404).json({ message: "Task not found" });
        res.json({ message: "Task removed" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
