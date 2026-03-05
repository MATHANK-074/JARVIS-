import React from "react";

const Login = () => {
    const handleGoogleLogin = () => {
        window.location.href = "http://localhost:5000/api/auth/google";
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">🤖</div>
                <h1 className="login-title">AI Smart Assistant</h1>
                <p className="login-subtitle">
                    Your intelligent productivity companion — reads emails, extracts tasks,
                    schedules reminders, and responds to voice commands.
                </p>

                <button
                    className="btn-google"
                    onClick={handleGoogleLogin}
                    id="google-login-btn"
                >
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        width="20"
                    />
                    Continue with Google
                </button>

                <p className="login-hint">
                    🔒 Secure OAuth 2.0 — We never store your password
                </p>
            </div>
        </div>
    );
};

export default Login;
