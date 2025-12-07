import express from "express";
import {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addMembersToGroup,
  removeMemberFromGroup,
  updateGroup,
  leaveGroup,
  deleteGroup,
  getGroupMessages,
  transferAdmin,
} from "../controllers/group_controller.js";
import { protectRoute } from "../middleware/auth_middleware.js";

const router = express.Router();

// Create a new group
router.post("/", protectRoute, createGroup);

// Get all groups of logged in user
router.get("/", protectRoute, getUserGroups);

// Get one group detail
router.get("/:groupId", protectRoute, getGroupDetails);

// Update group info (admin only)
router.put("/:groupId", protectRoute, updateGroup);

// Delete group (admin only)
router.delete("/:groupId", protectRoute, deleteGroup);

// Add members (admin only)
router.post("/:groupId/members", protectRoute, addMembersToGroup);

// Remove member (admin only)
router.delete("/:groupId/members/:memberId", protectRoute, removeMemberFromGroup);

// Leave group (for members)
router.post("/:groupId/leave", protectRoute, leaveGroup);

// Get group messages
router.get("/:id/messages", protectRoute, getGroupMessages);

// Transfer admin role
router.put("/:groupId/transfer-admin", protectRoute, transferAdmin);

export default router;
