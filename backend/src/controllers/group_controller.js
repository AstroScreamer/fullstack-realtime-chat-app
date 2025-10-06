import Group from "../models/group_model.js";
import Message from "../models/message_model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { Name, members = [], profilePic, description } = req.body;
    const admin = req.user._id;

    // Ensure admin is also part of members
    const allMembers = [...new Set([admin, ...members])];

    const newGroup = new Group({
      Name,
      admin,
      members: allMembers,
      profilePic,
      description,
    });

    await newGroup.save();

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all groups of logged-in user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId })
      .populate("admin", "Name profilePic")
      .populate("members", "Name profilePic");

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group details by ID
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate("admin", "Name profilePic")
      .populate("members", "Name profilePic");

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add members to a group
export const addMembersToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body; // array of user IDs to add

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Only admin can add members
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only admin can add members" });
    }

    // Add unique members
    group.members = [...new Set([...group.members.map(m => m.toString()), ...members])];
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    console.error("Error adding members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove member from a group
export const removeMemberFromGroup = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Only admin can remove members
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only admin can remove members" });
    }

    // Remove member
    group.members = group.members.filter(m => m.toString() !== memberId);
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all messages in a group
export const getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await Message.find({ groupId: id })
      .populate("senderId", "Name profilePic")
      .sort({ createdAt: 1 }); // sort by time ascending

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// send messages in a group 
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl,
    });

    await newMessage.save();
    await newMessage.populate("senderId", "Name profilePic");

    // Emit to all group members
    const group = await Group.findById(groupId);
    group.members.forEach((userId) => {
      const receiverSocketId = getReceiverSocketId(userId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newGroupMessage", newMessage);
      }
    });

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error(`Error in sendGroupMessage controller: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

