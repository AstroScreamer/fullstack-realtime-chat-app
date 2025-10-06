import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user_model.js";


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"]
    },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);
    
    const userId = socket.handshake.query.userId;
    if(userId) userSocketMap[userId] = socket.id;

    // io.emit() is used to send events to all the connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("typing", ({ receiverId }) => {
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { from: userId });
        }
    });

    socket.on("stopTyping", ({ receiverId }) => {
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("stopTyping", { from: userId });
        }
    });

    socket.on("disconnect", async () => {
        console.log("A user disconnected", socket.id);
        if (userId) {
            // update lastSeen in DB
            await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            delete userSocketMap[userId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });
})


export { io, app, server };