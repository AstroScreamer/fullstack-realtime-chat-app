import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user_model.js";
import Group from "../models/group_model.js";


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"]
    },
});


const userSocketMap = {};
const userNameCache = {};

export function getReceiverSocketId(userId) {
    const entry = userSocketMap[userId];
    if (!entry) return undefined;
    for (const sid of entry) return sid;
    return undefined;
}

io.on("connection", (socket) => {
    
    const userId = socket.handshake.query.userId;
    if (userId) {
        socket.user = { _id: userId };
        if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
        userSocketMap[userId].add(socket.id);
        socket.join(userId);

        User.findById(userId).select("Name").then(user => {
            if (user) {
                userNameCache[userId] = user.Name;
                console.log(`${user.Name} is connected with socket ID - ${socket.id} and user ID - ${userId}`);
            }
        });
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Clear unread count when a user opens a chat
    socket.on("clearUnread", async ({ chatId, type }) => {
        const userId = socket.user._id;
        if (type === "group") {
            await Group.findByIdAndUpdate(chatId, {
            $set: { [`unreadCounts.${userId}`]: 0 },
            });
        } else {
            await User.findByIdAndUpdate(userId, {
            $set: { [`unreadCounts.${chatId}`]: 0 },
            });
        }
        io.to(userId).emit("unreadCleared", { chatId });
    });

    // 1v1 typing events
    socket.on("typing", ({ receiverId }) => {
        io.to(receiverId).emit("typing", {
            from: userId,
            name: userNameCache[userId] || "Someone",
        });
    });

    socket.on("stopTyping", ({ receiverId }) => {
        io.to(receiverId).emit("stopTyping", { from: userId });
    });

    // Group Typing Events
    socket.on("groupTyping", ({ groupId }) => {
        socket.to(groupId).emit("groupTyping", { 
            from: userId, 
            userName: userNameCache[userId] || "Someone",
            groupId,
        });
    });

    socket.on("groupStopTyping", ({ groupId }) => {
        socket.to(groupId).emit("groupStopTyping", { from: userId, groupId });
    });

    // When a user opens a group chat, they join that group room
    socket.on("joinGroup", async (groupId) => {
        try {
            const group = await Group.findById(groupId);
            if (!group) return;
            socket.join(groupId);
        } catch (err) {
            console.log("Error joining group:", err.message);
        }
    });

    // When a user leaves or switches chat, remove them from that room
    socket.on("leaveGroup", (groupId) => {
        socket.leave(groupId);
    });

    socket.on("disconnect", async () => {
        if (userId) {
            await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            const set = userSocketMap[userId];
            if (set) {
                set.delete(socket.id);
                if (set.size === 0) {
                    delete userSocketMap[userId];
                    delete userNameCache[userId];
                }
            }
            User.findById(userId).select("Name").then(user => {
                if (user) {
                    console.log(`${user.Name} is disconnected with socket ID - ${socket.id} and user ID - ${userId}`);
                }
            });
            console.log(`userSocketMap[${userId}] now has ${userSocketMap[userId] ? userSocketMap[userId].size : 0} socket(s)`);
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });
})


export { io, app, server };