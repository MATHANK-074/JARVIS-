import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        priority: {
            type: String,
            enum: ["urgent", "medium", "low"],
            default: "medium",
        },
        status: {
            type: String,
            enum: ["pending", "completed"],
            default: "pending",
        },
        dueDate: {
            type: Date,
        },
        source: {
            type: String,
            default: null, // "gmail", "whatsapp", etc.
        },
        sourceId: {
            type: String, // ID of the email or message if applicable
        }
    },
    { timestamps: true }
);

const Task = mongoose.model("Task", TaskSchema);
export default Task;
