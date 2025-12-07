import express from "express";
import { protectRoute } from "../middleware/auth_middleware.js";
import { getMessages, sendMessage, markAsSeen, getSlidebarChats } from "../controllers/message_controller.js";

const router = express.Router();

// Get sidebar chats (users + groups) with last message and unread counts
router.get("/slidebar", protectRoute, getSlidebarChats);

// Get messages with a specific user or group
router.get("/:id", protectRoute, getMessages);

// Send a message to a specific user or group
router.post("/send/:id", protectRoute, sendMessage);

// Mark a message as seen
router.patch("/seen/:messageId", protectRoute, markAsSeen);

export default router;