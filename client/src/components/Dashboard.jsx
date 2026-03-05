import React, { useState, useEffect } from "react";
import TaskCard from "./TaskCard";

const Dashboard = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncingCalendar, setSyncingCalendar] = useState(false);
    const [syncingWhatsApp, setSyncingWhatsApp] = useState(false);
    const [whatsappStatus, setWhatsappStatus] = useState({ isReady: false, qrCode: null });
    const [search, setSearch] = useState("");

    const fetchTasks = async (isSilent = false) => {
        try {
            const res = await fetch("http://localhost:5000/api/tasks", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();

                // If silent polling finds new tasks, show notification
                if (isSilent && data.length > tasks.length) {
                    const diff = data.length - tasks.length;
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("🤖 JARVIS: New Tasks Found!", {
                            body: `I found ${diff} new task(s) for you.`,
                            icon: "/logo.png"
                        });
                    }
                }

                // Check for upcoming deadlines (< 2 hours)
                if ("Notification" in window && Notification.permission === "granted") {
                    const now = new Date();
                    const notifiedTasks = JSON.parse(localStorage.getItem("notifiedDeadlines") || "[]");

                    data.forEach(task => {
                        if (task.dueDate && task.status === "pending") {
                            const hoursDiff = (new Date(task.dueDate) - now) / (1000 * 60 * 60);

                            if (hoursDiff > 0 && hoursDiff <= 2 && !notifiedTasks.includes(task._id)) {
                                new Notification("⏰ JARVIS: Deadline Alert!", {
                                    body: `Task "${task.title}" is due in less than 2 hours!`,
                                    icon: "/logo.png"
                                });
                                notifiedTasks.push(task._id);
                            }
                        }
                    });
                    localStorage.setItem("notifiedDeadlines", JSON.stringify(notifiedTasks));
                }

                setTasks(data);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWhatsAppStatus = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/tasks/whatsapp-status", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setWhatsappStatus(data);
            }
        } catch (err) {
            console.log("WhatsApp status check failed");
        }
    };

    useEffect(() => {
        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        fetchTasks();
        fetchWhatsAppStatus();

        const statusInterval = setInterval(fetchWhatsAppStatus, 5000); // 5s for QR
        const taskInterval = setInterval(() => fetchTasks(true), 120000); // 2m for auto-sync detection

        return () => {
            clearInterval(statusInterval);
            clearInterval(taskInterval);
        };
    }, [tasks.length]); // Re-run if length changes to maintain correct silent check

    const filtered = tasks.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase())
    );

    const byPriority = (p) => filtered.filter((t) => t.priority === p);

    const handleDone = async (id) => {
        try {
            // Mark as completed in DB
            const res = await fetch(`http://localhost:5000/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" }),
                credentials: "include",
            });
            if (res.ok) {
                // Optionally remove from view or keep if needed. For now, we remove.
                setTasks((prev) => prev.filter((t) => t._id !== id));
            }
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    const handleSnooze = async (id, snoozedUntilDate) => {
        try {
            // Move to low priority and set snoozedUntil in DB
            const res = await fetch(`http://localhost:5000/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priority: "low", snoozedUntil: snoozedUntilDate }),
                credentials: "include",
            });
            if (res.ok) {
                fetchTasks(); // Refresh to see changes across columns
            }
        } catch (error) {
            console.error("Error snoozing task:", error);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch("http://localhost:5000/api/tasks/sync-gmail", { credentials: "include" });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchTasks(); // Refresh list to show new tasks
            } else {
                alert("Sync failed: " + data.message);
            }
        } catch (error) {
            console.error("Sync Error:", error);
            alert("Something went wrong during sync.");
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncCalendar = async () => {
        setSyncingCalendar(true);
        try {
            const res = await fetch("http://localhost:5000/api/tasks/sync-calendar", { credentials: "include" });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchTasks();
            } else {
                alert("Calendar Sync failed: " + data.message);
            }
        } catch (error) {
            console.error("Error syncing calendar:", error);
            alert("Calendar Synchronization failed due to a network error.");
        } finally {
            setSyncingCalendar(false);
        }
    };

    const handleSyncWhatsApp = async () => {
        setSyncingWhatsApp(true);
        try {
            const res = await fetch("http://localhost:5000/api/tasks/sync-whatsapp", { credentials: "include" });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchTasks();
            } else {
                alert("WhatsApp Sync failed: " + data.message);
            }
        } catch (error) {
            console.error("Error syncing WhatsApp:", error);
            alert("WhatsApp Synchronization failed.");
        } finally {
            setSyncingWhatsApp(false);
        }
    };

    const urgentCount = tasks.filter((t) => t.priority === "urgent").length;
    const mediumCount = tasks.filter((t) => t.priority === "medium").length;
    const lowCount = tasks.filter((t) => t.priority === "low").length;

    if (loading) return <div className="loading-sub">Loading Tasks...</div>;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>
                    Good evening, <span>{user?.name?.split(" ")[0] || "User"}</span> 👋
                </h1>
                <p>Real-time AI Assistant Overview</p>
            </div>

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-icon total">📋</div>
                    <div className="stat-info">
                        <span className="stat-value">{tasks.length}</span>
                        <span className="stat-label">Total Tasks</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon urgent">🔴</div>
                    <div className="stat-info">
                        <span className="stat-value" style={{ color: "var(--urgent)" }}>{urgentCount}</span>
                        <span className="stat-label">Urgent</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon medium">🟡</div>
                    <div className="stat-info">
                        <span className="stat-value" style={{ color: "var(--medium)" }}>{mediumCount}</span>
                        <span className="stat-label">Medium</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon low">🟢</div>
                    <div className="stat-info">
                        <span className="stat-value" style={{ color: "var(--low)" }}>{lowCount}</span>
                        <span className="stat-label">Low Priority</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-controls">
                <div className="search-bar">
                    <span>🔍</span>
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="control-buttons">
                    <button
                        className={`btn-sync ${syncing ? 'loading' : ''}`}
                        onClick={handleSync}
                        disabled={syncing || syncingCalendar}
                    >
                        {syncing ? "🔄 Syncing..." : "✉️ Sync Gmail"}
                    </button>
                    <button
                        className={`btn-sync ${syncingCalendar ? 'loading' : ''}`}
                        onClick={handleSyncCalendar}
                        disabled={syncing || syncingCalendar || syncingWhatsApp}
                    >
                        {syncingCalendar ? "🔄 Syncing..." : "📅 Sync Calendar"}
                    </button>
                    <button
                        className={`btn-sync ${syncingWhatsApp ? 'loading' : ''}`}
                        onClick={handleSyncWhatsApp}
                        disabled={syncing || syncingCalendar || syncingWhatsApp || !whatsappStatus.isReady}
                    >
                        {syncingWhatsApp ? "🔄 Syncing..." : "💬 Sync WhatsApp"}
                    </button>
                    <button className="btn-add">＋ Add Task</button>
                </div>
            </div>

            {!whatsappStatus.isReady && whatsappStatus.qrCode && (
                <div className="whatsapp-qr-container">
                    <div className="qr-card">
                        <h3>💬 Connect WhatsApp</h3>
                        <p>Scan this QR code with your phone to sync messages.</p>
                        <img src={whatsappStatus.qrCode} alt="WhatsApp QR Code" />
                        <div className="qr-status">Waiting for scan...</div>
                    </div>
                </div>
            )}

            <div className="kanban-board">
                {["urgent", "medium", "low"].map((p) => (
                    <div className="kanban-column" key={p}>
                        <div className="column-header">
                            <div className="column-title">
                                <span className={`column-dot dot-${p}`}></span>
                                {p === "low" ? "Low Priority" : p.charAt(0).toUpperCase() + p.slice(1)}
                            </div>
                            <span className="column-count">{byPriority(p).length}</span>
                        </div>
                        <div className="task-list">
                            {byPriority(p).length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-icon">✅</span>
                                    <p>All clear!</p>
                                </div>
                            ) : (
                                byPriority(p).map((task) => (
                                    <TaskCard
                                        key={task._id}
                                        task={task}
                                        onDone={handleDone}
                                        onSnooze={handleSnooze}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
