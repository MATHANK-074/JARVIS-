import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        googleId: {
            type: String,
            unique: true,
        },
        avatar: {
            type: String,
        },
        accessToken: {
            type: String,
        },
        refreshToken: {
            type: String,
        },
        plan: {
            type: String,
            enum: ["free", "pro", "enterprise"],
            default: "free",
        },
    },
    { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
