import express from "express";
import {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addMembersToGroup,
  removeMemberFromGroup,
  getGroupMessages,
  sendGroupMessage
} from "../controllers/group_controller.js";
import { protectRoute } from "../middleware/auth_middleware.js";

const router = express.Router();

// Create a new group
router.post("/", protectRoute, createGroup);

// Get all groups of logged in user
router.get("/", protectRoute, getUserGroups);

// Get one group detail
router.get("/:groupId", protectRoute, getGroupDetails);

// Add members
router.post("/:groupId/members", protectRoute, addMembersToGroup);

// Remove member
router.delete("/:groupId/members/:memberId", protectRoute, removeMemberFromGroup);

// Get group messages
router.get("/:id/messages", protectRoute, getGroupMessages);

// send group messages
router.post("/:groupId/messages", protectRoute, sendGroupMessage);


export default router;
