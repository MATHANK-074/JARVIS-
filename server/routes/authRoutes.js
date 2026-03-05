import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// @route   GET /api/auth/google
// @desc    Redirect to Google OAuth
router.get(
    "/google",
    passport.authenticate("google", {
        scope: [
            "profile",
            "email",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/calendar",
        ],
    })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback — issues JWT
router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/" }),
    (req, res) => {
        // Sign a JWT with user ID
        const token = jwt.sign(
            { id: req.user._id, email: req.user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Send token via httpOnly cookie (secure)
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Redirect to frontend dashboard
        res.redirect(`${process.env.CLIENT_URL}/dashboard?login=success`);
    }
);

router.get("/me", async (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-accessToken -refreshToken -googleId");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout — clear cookie
router.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
});

export default router;
