import React, { useState } from "react";

const TaskCard = ({ task, onDone, onSnooze }) => {
    const [expanded, setExpanded] = useState(false);

    const priorityIcon = {
        urgent: "🔴",
        medium: "🟡",
        low: "🟢",
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    };

    return (
        <div
            className={`task-card ${task.priority}`}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="task-title">{task.title}</div>

            {(expanded || task.description) && (
                <div className="task-desc">
                    {task.description || "No additional details."}
                </div>
            )}

            <div className="task-meta">
                <span className={`task-tag ${task.priority}`}>
                    {priorityIcon[task.priority]} {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>

                {task.dueDate && (
                    <span className="task-date">
                        📅 {formatDate(task.dueDate)}
                    </span>
                )}

                {task.source && (
                    <span className="task-date">✉️ Gmail</span>
                )}
            </div>

            {expanded && (
                <div className="task-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-done" onClick={() => onDone && onDone(task._id)}>
                        ✅ Done
                    </button>
                    <button className="btn-snooze" onClick={() => onSnooze && onSnooze(task._id)}>
                        ⏰ Snooze
                    </button>
                </div>
            )}
        </div>
    );
};

export default TaskCard;
