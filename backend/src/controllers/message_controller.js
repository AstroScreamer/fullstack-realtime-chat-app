import User from "../models/user_model.js";
import Message from "../models/message_model.js";
import Group from "../models/group_model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";


// Get messages for either a user or a group
export const getMessages = async (req, res) => {
  try{
    const { id } = req.params;
    const myId = req.user._id;

    let messages;

    const group = await Group.findById(id);

    if (group) {
      messages = await Message.find({ groupId: id })
        .populate("senderId", "Name profilePic")
        .sort({ createdAt: 1 });
    } else {
      messages = await Message.find({
        $or: [
          { senderId: myId, receiverId: id },
          { senderId: id, receiverId: myId },
        ],
      })
        .populate("senderId", "Name profilePic")
        .sort({ createdAt: 1 });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.log(`Error in getMessages controller: ${error.message}`);
    res.status(500).json({ error: "Internal Server error" });
  }
};

// Send message to either a user or a group
export const sendMessage = async (req, res) => { 
  try {
    const { text, image } = req.body;
    const { id } = req.params; 
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const group = await Group.findById(id);
    let newMessage;

    if (group) {
      if (!group.members.includes(senderId.toString())) {
        return res.status(403).json({ error: "Not a group member" });
      }

      newMessage = new Message({
        senderId,
        groupId: id,
        text,
        image: imageUrl,
      });

      await newMessage.save();
      await newMessage.populate("senderId", "Name profilePic");

      for (const memberId of group.members) {
        const memberIdStr = memberId.toString();
        
        if (memberIdStr !== senderId.toString()) {
          const prevCount = group.unreadCounts?.get(memberIdStr) || 0;
          group.unreadCounts.set(memberIdStr, prevCount + 1);
          io.to(memberIdStr).emit("newMessage", newMessage);
        }
      }
      await group.save();

    } else {
      const receiver = await User.findById(id);
      if (!receiver) {
        return res.status(404).json({ error: "User not found" });
      }

      newMessage = new Message({
        senderId,
        receiverId: id,
        text,
        image: imageUrl,
      });

      await newMessage.save();
      await newMessage.populate("senderId", "Name profilePic");

      await User.findByIdAndUpdate(id, {
        $inc: { [`unreadCounts.${senderId}`]: 1 },
      });

      io.to(id.toString()).emit("newMessage", newMessage);
    }

    return res.status(201).json(newMessage);

  } catch (error) {
    console.log(`Error in sendMessage controller: ${error.message}`);
    res.status(500).json({ error: 'Internal Server error' });
  }
};

// Mark a message as seen
export const markAsSeen = async (req, res) => {
  try {
    const { messageId } = req.params;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    if (message.receiverId?.toString() !== myId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (message.seen) {
      return res.json(message);
    }

    message.seen = true;
    await message.save();

    const senderSocketId = getReceiverSocketId(message.senderId);
    console.log(`Emit messageSeen -> senderId=${message.senderId} socketId=${senderSocketId}`);
    io.to(message.senderId.toString()).emit("messageSeen", {
      messageId: message._id,
      receiverId: myId,
    });

    res.json(message);
  } catch (error) {
    console.log(`Error in markAsSeen controller: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get sidebar chats (users + groups) with unread counts AND lastMessageTime
export const getSlidebarChats = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const myUser = await User.findById(loggedInUserId).select('unreadCounts').lean();
    const myUnreadCounts = myUser?.unreadCounts || new Map();
    const users = await User.aggregate([
      { $match: { _id: { $ne: loggedInUserId } } },
      {
        $lookup: {
          from: "messages",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$senderId", "$$userId"] },
                        { $eq: ["$receiverId", loggedInUserId] }
                      ]
                    },
                    {
                      $and: [
                        { $eq: ["$senderId", loggedInUserId] },
                        { $eq: ["$receiverId", "$$userId"] }
                      ]
                    }
                  ]
                }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: "lastMessage"
        }
      },
      {
        $addFields: {
          lastMessageTime: {
            $ifNull: [{ $arrayElemAt: ["$lastMessage.createdAt", 0] }, "$createdAt"]
          },
          type: "user"
        }
      },
      { $project: { password: 0, lastMessage: 0 } }
    ]);

    const usersWithUnread = users.map(u => ({
      ...u,
      unreadCount: myUnreadCounts[u._id.toString()] || 0
    }));

    const groups = await Group.aggregate([
      { $match: { members: loggedInUserId } },
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
            $ifNull: [{ $arrayElemAt: ["$lastMessage.createdAt", 0] }, "$createdAt"]
          },
          type: "group"
        }
      },
      { $project: { lastMessage: 0 } }
    ]);

    const groupsWithUnread = groups.map(g => ({
      ...g,
      unreadCount: g.unreadCounts?.[loggedInUserId.toString()] || 
                   g.unreadCounts?.get?.(loggedInUserId.toString()) || 
                   0
    }));

    const allChats = [...usersWithUnread, ...groupsWithUnread].sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    res.status(200).json(allChats);
  } catch (error) {
    console.error("Error in getSlidebarChats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}; 