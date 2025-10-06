import User from "../models/user_model.js";
import Message from "../models/message_model.js";
import Group from "../models/group_model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";


export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Get all users
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
                    { $and: [{ $eq: ["$senderId", "$$userId"] }, { $eq: ["$receiverId", loggedInUserId] }] },
                    { $and: [{ $eq: ["$senderId", loggedInUserId] }, { $eq: ["$receiverId", "$$userId"] }] }
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

    // Get all groups
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
            $ifNull: [{ $arrayElemAt: ["$lastMessage.createdAt", 0] }, new Date(0)]
          },
          type: "group"
        }
      },
      { $project: { lastMessage: 0 } }
    ]);

    // Combine and sort by lastMessageTime
    const allChats = [...users, ...groups].sort((a, b) => 
      new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    res.status(200).json(allChats);
  } catch (error) {
    console.log(`Error in getUsersForSidebar: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMessages = async (req, res) => {
  try{
    const { id } = req.params;
    const myId = req.user._id;

    let messages;

    // check if it's a group
    const group = await Group.findById(id);

    if (group) {
      // 🔹 Group messages
      messages = await Message.find({ groupId: id })
        .populate("senderId", "Name profilePic")
        .sort({ createdAt: 1 });
    } else {
      // 🔹 One-to-one messages
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

export const sendMessage = async (req, res) => {
    try {
      const { text, image } = req.body;
      const { id:receiverId } = req.params;
      const senderId = req.user._id;

      let imageUrl;
      if(image) {
        // upload image to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      }

      let newMessage;
      newMessage = new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl
      });

      await newMessage.save();
      await newMessage.populate("senderId", "Name profilePic");

            
      const receiverSocketId = getReceiverSocketId(receiverId);
      if(receiverSocketId) {                
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }
        
      return res.status(201).json(newMessage);
    } catch (error) {
        console.log(`Error in sendMessage controller: ${error.message}`);
        res.status(500).json({ error: 'Internal Server error' });
    }
};
    
export const markAsSeen = async (req, res) => {
  try {
    const { messageId } = req.params;
    const myId = req.user._id;

    // ensure only receiver can mark as seen
    const message = await Message.findOneAndUpdate(
      { _id: messageId, receiverId: myId },
      { $set: { seen: true } },
      { new: true }
    );

    if (!message) return res.status(404).json({ error: "Message not found" });

    // emit real-time to sender
    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageSeen", {
        messageId: message._id,
        receiverId: myId,
      });
    }

    res.json(message);
  } catch (error) {
    console.log("Error marking message as seen:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};