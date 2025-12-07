import Group from "../models/group_model.js";
import Message from "../models/message_model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { Name, members = [], profilePic, description } = req.body;
    const admin = req.user._id;

    const allMembers = [...new Set([admin, ...members])];

    const newGroup = new Group({
      Name,
      admin,
      members: allMembers,
      profilePic,
      description,
    });

    await newGroup.save();

    allMembers.forEach(memberId => {
      const socketId = getReceiverSocketId(memberId);
      console.log(`Emit newGroup -> memberId=${memberId} socketId=${socketId}`);
      io.to(memberId).emit("newGroup", newGroup);
    });
    
    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all groups
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const groups = await Group.aggregate([
      { $match: { members: userId } },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "groupId",
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: "lastMessage"
        }
      },
      {
        $addFields: {
          lastMessageTime: {
            $ifNull: [
              { $arrayElemAt: ["$lastMessage.createdAt", 0] }, 
              "$createdAt"
            ]
          },
          type: "group"
        }
      },
      { $project: { lastMessage: 0 } }
    ]);

    await Group.populate(groups, [
      { path: "admin", select: "Name profilePic" },
      { path: "members", select: "Name profilePic email" }
    ]);

    const formattedGroups = groups.map(g => ({
      ...g,
      unreadCount: g.unreadCounts?.get?.(userId.toString?.()) || 0
    }));

    formattedGroups.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.status(200).json(formattedGroups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group details 
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate("admin", "Name profilePic")
      .populate("members", "Name profilePic email"); 

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
    const { members } = req.body; 

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only admin can add members" });
    }

    group.members = [...new Set([...group.members.map(m => m.toString()), ...members])];
    await group.save();
    for (const memberId of members) {
      const socketId = getReceiverSocketId(memberId);
      console.log(`Emit addedToGroup -> memberId=${memberId} socketId=${socketId}`);
      io.to(memberId).emit("addedToGroup", group);
      io.emit("addedToGroupBroadcast", { targetId: memberId, group });
    }

    for (const memberId of group.members) {
      const socketId = getReceiverSocketId(memberId);
      console.log(`Emit groupUpdated -> memberId=${memberId} socketId=${socketId}`);
      io.to(memberId).emit("groupUpdated", group);
      io.emit("groupUpdatedBroadcast", { targetId: memberId, group });
    }

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

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only admin can remove members" });
    }

    group.members = group.members.filter(m => m.toString() !== memberId);
    await group.save();

    console.log(`Emit removedFromGroup -> removed=${memberId}`);
    io.to(memberId).emit("removedFromGroup", { groupId });
    io.emit("removedFromGroupBroadcast", { targetId: memberId, groupId });

    for (const mId of group.members) {
      const sid = getReceiverSocketId(mId);
      console.log(`Emit groupUpdated after remove -> memberId=${mId} socketId=${sid}`);
      io.to(mId).emit("groupUpdated", group);
      io.emit("groupUpdatedBroadcast", { targetId: mId, group });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// leave group
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.admin.toString() === userId.toString())
      return res.status(403).json({ error: "Admin cannot leave group. Transfer admin first." });

    group.members = group.members.filter(m => m.toString() !== userId.toString());
    await group.save();

    const socketId = getReceiverSocketId(userId);
    console.log(`Emit leftGroup -> userId=${userId} socketId=${socketId}`);
    io.to(userId).emit("leftGroup", { groupId });
    io.emit("leftGroupBroadcast", { targetId: userId, groupId });

    for (const memberId of group.members) {
      const sid = getReceiverSocketId(memberId);
      console.log(`Emit groupUpdated after leave -> memberId=${memberId} socketId=${sid}`);
      if (sid) {
        io.to(sid).emit("groupUpdated", group);
      }
      io.emit("groupUpdatedBroadcast", { targetId: memberId, group });
    }

    res.status(200).json({ message: "Left group successfully", group });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// update group details
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { Name, description, profilePic } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only admin can update group" });
    }

    if (Name) group.Name = Name;
    if (description !== undefined) group.description = description;
    if (profilePic) group.profilePic = profilePic;

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate([
        { path: "admin", select: "Name profilePic" },
        { path: "members", select: "Name profilePic email" },
      ])
      .lean();

    const payload = {
      ...populatedGroup,
      _id: populatedGroup._id.toString(),
      type: "group",
    };

    group.members.forEach((memberId) => {
      const id = memberId.toString();
      const socketId = getReceiverSocketId(id);
      console.log(
        `Emit groupUpdated (updateGroup) -> memberId=${id} socketId=${socketId}`
      );
      io.to(id).emit("groupUpdated", payload);
    });

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Error updating group:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// delete group
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.admin.toString() !== userId.toString())
      return res.status(403).json({ error: "Only admin can delete group" });

    const memberIds = group.members.map(m => m.toString());
    console.log(`Deleting group ${groupId}, notifying members:`, memberIds);

    await Group.findByIdAndDelete(groupId);
    await Message.deleteMany({ groupId });

    memberIds.forEach(memberId => {
      console.log(`Emitting groupDeleted to room: ${memberId}`);
      io.to(memberId).emit("groupDeleted", { groupId });
    });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all messages in a group
export const getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await Message.find({ groupId: id })
      .populate("senderId", "Name profilePic")
      .sort({ createdAt: 1 }); 

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// transfer admin rights
export const transferAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newAdminId } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.admin.toString() !== userId.toString())
      return res.status(403).json({ error: "Only admin can transfer rights" });

    if (!group.members.some(m => m.toString() === newAdminId))
      return res.status(400).json({ error: "New admin must be a member" });

    group.admin = newAdminId;
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    console.error("Error transferring admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};