import { useState } from "react";
import { X, Users, Camera } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

const CreateGroup = ({ isOpen, onClose }) => {
  const { users, createGroup } = useChatStore();
  const actualUsers = users;
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupImage, setGroupImage] = useState(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setGroupImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setLoading(true);
    try {
      await createGroup({
        Name: groupName.trim(),
        members: selectedMembers,
        profilePic: groupImage,
        description: description.trim(),
      });
      
      onClose();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setGroupName("");
    setSelectedMembers([]);
    setGroupImage(null);
    setDescription("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-200 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} />
            Create Groups
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Group Image */}
          <div className="flex justify-center">
            <div className="relative">
            <img
                src={groupImage || "/avatar.png"}
                alt="Group"
                className="size-20 rounded-full object-cover border-4"
            />
            <label
                htmlFor="group-avatar-upload"
                className="absolute bottom-0 right-0 bg-base-content hover:scale-105 p-2 rounded-full cursor-pointer transition-all duration-200"
            >
                <Camera className="w-4 h-4 text-base-200" />
                <input
                  type="file"
                  id="group-avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
            </label>
            </div>
          </div>

          {/* Group Name */}
          <div>
            <label className="label">
              <span className="label-text text-zinc-400">Group Name*</span>
            </label>
            <input
              type="text "
              placeholder="Enter group name"
              className="input bg-base-100 rounded-lg border-white text-white w-full"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">
              <span className="label-text text-zinc-400">Description</span>
            </label>
            <textarea
              placeholder="Group description (optional)"
              className="textarea bg-base-100 rounded-lg border-white text-white w-full h-20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Members Selection */}
          <div>
            <label className="label">
              <span className="label-text text-zinc-400">Add Members* ({selectedMembers.length} selected)</span>
            </label>
            <div className="border border-base-300 rounded-lg max-h-40 overflow-y-auto">
              {actualUsers.map((user) => (
                <label key={user._id} className="flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm bg-base-100 border-white"
                    checked={selectedMembers.includes(user._id)}
                    onChange={() => toggleMember(user._id)}
                  />
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.Name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium">{user.Name}</span>
                </label>  
              ))}
              {actualUsers.length === 0 && (
                <div className="text-center py-4 text-base-content/60">
                  No users available
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGroup}
              className="btn btn-primary flex-1"
              disabled={loading || !groupName.trim() || selectedMembers.length === 0}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>{' '}
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;