import React, { useState } from "react";

const TaskCard = ({ task, onDone, onSnooze }) => {
    const [expanded, setExpanded] = useState(false);

    const [isCustomSnooze, setIsCustomSnooze] = useState(false);
    const [customSnoozeDate, setCustomSnoozeDate] = useState("");

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

    const handleSnoozeSelect = (minutes) => {
        const targetDate = new Date();
        targetDate.setMinutes(targetDate.getMinutes() + minutes);
        if (onSnooze) onSnooze(task._id, targetDate.toISOString());
        setExpanded(false);
        setIsCustomSnooze(false);
    };

    const handleCustomSnoozeConfirm = (e) => {
        e.stopPropagation();
        if (customSnoozeDate && onSnooze) {
            const isoString = new Date(customSnoozeDate).toISOString();
            onSnooze(task._id, isoString);
            setExpanded(false);
            setIsCustomSnooze(false);
            setCustomSnoozeDate("");
        }
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
                    {!task.snoozedUntil ? (
                        isCustomSnooze ? (
                            <div className="custom-snooze-container">
                                <input
                                    type="datetime-local"
                                    className="custom-snooze-input"
                                    value={customSnoozeDate}
                                    onChange={(e) => setCustomSnoozeDate(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                />
                                <button className="btn-confirm-snooze" onClick={handleCustomSnoozeConfirm}>
                                    Confirm
                                </button>
                                <button className="btn-cancel-snooze" onClick={(e) => { e.stopPropagation(); setIsCustomSnooze(false); }}>
                                    ✖
                                </button>
                            </div>
                        ) : (
                            <div className="snooze-dropdown">
                                <button className="btn-snooze">⏰ Snooze ▼</button>
                                <div className="snooze-menu">
                                    <span onClick={(e) => { e.stopPropagation(); handleSnoozeSelect(5); }}>5 Minutes</span>
                                    <span onClick={(e) => { e.stopPropagation(); handleSnoozeSelect(60); }}>1 Hour</span>
                                    <span onClick={(e) => { e.stopPropagation(); handleSnoozeSelect(24 * 60); }}>Tomorrow</span>
                                    <span onClick={(e) => { e.stopPropagation(); handleSnoozeSelect(7 * 24 * 60); }}>Next Week</span>
                                    <span onClick={(e) => { e.stopPropagation(); setIsCustomSnooze(true); }}>Custom...</span>
                                </div>
                            </div>
                        )
                    ) : (
                        <span className="task-snoozed-badge">
                            💤 Snoozed until {new Date(task.snoozedUntil).toLocaleDateString()} {new Date(task.snoozedUntil).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskCard;
