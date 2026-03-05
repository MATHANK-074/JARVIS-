import React from "react";

const Navbar = ({ user, onLogout }) => {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <span className="logo-icon">🤖</span>
                AI Smart Assistant
            </div>

            <div className="navbar-right">
                <div className="nav-badge" title="Notifications">
                    🔔
                    <span className="badge-dot"></span>
                </div>
                <div className="nav-avatar" title={user?.name || "User"}>
                    {user?.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <button className="btn-logout" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
