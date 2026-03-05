import express from "express";
import jwt from "jsonwebtoken";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { syncGmail, syncCalendar, syncWhatsApp } from "../services/syncService.js";
import { getWhatsAppStatus } from "../services/whatsappService.js";

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
            return res.status(400).json({ message: "Google account not connected" });
        }

        const newTasks = await syncGmail(req.userId, user.accessToken);
        res.json({ message: `Sync complete. Found ${newTasks.length} new tasks.`, tasks: newTasks });

    } catch (error) {
        if (error.message === "GROQ_API_KEY_MISSING") {
            return res.status(500).json({ message: "Groq API Key missing" });
        }
        res.status(500).json({ message: "Gmail sync failed" });
    }
});

// @route   GET /api/tasks/sync-calendar
// @desc    Sync tasks from Google Calendar
router.get("/sync-calendar", auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || !user.accessToken) {
            return res.status(400).json({ message: "Google account not connected" });
        }

        const newTasks = await syncCalendar(req.userId, user.accessToken);
        res.json({ message: `Sync complete. Found ${newTasks.length} new tasks.`, tasks: newTasks });
    } catch (error) {
        res.status(500).json({ message: "Calendar sync failed" });
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

// @route   GET /api/tasks/whatsapp-status
// @desc    Get WhatsApp connection status and QR code
router.get("/whatsapp-status", auth, (req, res) => {
    res.json(getWhatsAppStatus());
});

// @route   GET /api/tasks/sync-whatsapp
// @desc    Sync tasks from WhatsApp unread messages
router.get("/sync-whatsapp", auth, async (req, res) => {
    try {
        console.log("💬 Sync Start: Fetching WhatsApp unread for", req.userId);
        const newTasks = await syncWhatsApp(req.userId);
        res.json({ message: `Sync complete. Found ${newTasks.length} new tasks.`, tasks: newTasks });
    } catch (error) {
        if (error.message === "WHATSAPP_NOT_READY") {
            return res.status(400).json({ message: "WhatsApp is not connected. Please scan the QR code first." });
        }
        console.error("WhatsApp Sync Error:", error);
        res.status(500).json({ message: "WhatsApp synchronization failed" });
    }
});

export default router;
