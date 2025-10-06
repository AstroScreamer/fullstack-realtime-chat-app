import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        Name: {
            type: String,
            required: true,
            maxlength: 50,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        profilePic: {
            type: String,
            default: "",
        },
        lastSeen: { 
            type: Date,
            default: Date.now, 
        },
        resetPasswordToken: {
            type: String,
            default: undefined
        },
        resetPasswordExpires: {
            type: Date,
            default: undefined
        } 
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
