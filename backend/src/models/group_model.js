import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  Name: { 
    type: String, 
    required: true 
  },
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  }, 
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  profilePic: { 
    type: String,
    default: "/group.png" 
  },
  description: {
    type: String,
    default: ""
  },
  unreadCounts: { 
    type: Map,
    of: Number,
    default: {}
  },
}, { timestamps: true });

const Group = mongoose.model("Group", groupSchema);
export default Group;
