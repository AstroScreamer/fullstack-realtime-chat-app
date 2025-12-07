import User from "../models/user_model.js";
import Message from "../models/message_model.js";
import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import crypto from "crypto";
import { sendResetPasswordEmail } from "../lib/email.js";

// Signup
export const signup = async (req, res) => {
  const { Name, email, password } = req.body;
  try {
    if (!Name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long"});
    }

    const user = await User.findOne({ email });
        
    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }
        
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      Name,
      email,
      password: hashedPassword
    });

    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({ 
        _id: newUser._id,
        Name: newUser.Name,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    }
    else {
      return res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log(`Error in signup controller: ${error.message}`);
    res.status(500).json({message: "Internal server error"});
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if(!user && !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!user) {
      return res.status(400).json({ message: "Email is not registered" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) { 
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({ 
      _id: user._id,
      Name: user.Name,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log(`Error in login controller: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }    
};

// Logout
export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", {maxAge:0});
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log(`Error in logout controller: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(userId, { profilePic: uploadResponse.secure_url }, { new: true });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log(`Error in update profile: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Check Auth
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log(`Error in checkAuth controller: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete Account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.body) {
      return res.status(400).json({ 
        success: false,
        message: "Request body is missing" 
      });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        success: false,
        message: "Password is required to delete account" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid password" 
      });
    }

    await Message.deleteMany({ 
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });

    await User.findByIdAndDelete(userId);

    res.status(200).json({ 
      success: true,
      message: "Account deleted successfully" 
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    console.log('Change password request for user:', userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    console.log('Password changed successfully for user:', userId);

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Request Password Reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('Password reset requested for:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('User not found, but returning success');
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent"
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // Send email
    try {
      await sendResetPasswordEmail(user.email, resetUrl, user.fullName);
      console.log('Reset email sent successfully to:', email);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: "Error sending reset email. Please try again."
      });
    }

    res.status(200).json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent"
    });

  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    console.log('Password reset attempt with token');

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log('Password reset successful for user:', user.email);

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password."
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
