import { X, Users, Edit, Trash2, LogOut, UserMinus, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useState, useEffect } from "react";

const GroupSettings = ({ group, onClose }) => {
  const { authUser } = useAuthStore();
  const {
    updateGroup,
    deleteGroup,
    leaveGroup,
    removeMemberFromGroup,
    getGroupDetails,
    addMemberToGroup,
    getSlidebarChats,
    setSelectedChat,
    users = [],
    transferAdmin
  } = useChatStore();

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(group.Name);
  const [newDesc, setNewDesc] = useState(group.description || "");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  
  const [pendingMembersToAdd, setPendingMembersToAdd] = useState([]);
  const [pendingMembersToRemove, setPendingMembersToRemove] = useState([]);

  useEffect(() => {
    if (!group) return;
    setNewName(group.Name);
    setNewDesc(group.description || "");
    setPendingMembersToAdd([]);
    setPendingMembersToRemove([]);
  }, [group]);

  useEffect(() => {
    getSlidebarChats();
  }, [getSlidebarChats]);

  const displayGroup = group || {};

  const isAdmin = () => {
    const adminId = typeof displayGroup.admin === "object" ? displayGroup.admin._id : displayGroup.admin;
    return adminId?.toString() === authUser?._id?.toString();
  };

  const isUserAdmin = (memberId) => {
    const adminId = typeof displayGroup.admin === "object" ? displayGroup.admin._id : displayGroup.admin;
    return adminId?.toString() === memberId?.toString();
  };

  const rawMembers = displayGroup.members || [];
  const resolvedMembers = rawMembers.map((m) => {
    const id = m && (m._id || m);
    if (!id) return null;
    if (typeof m === 'object' && m.Name) return m;
    if (displayGroup.admin && (displayGroup.admin._id || displayGroup.admin) == id) {
      if (typeof displayGroup.admin === 'object' && displayGroup.admin.Name) return displayGroup.admin;
    }
    const fromUsers = users.find((u) => u._id === id);
    if (fromUsers) return fromUsers;
    if (authUser && authUser._id === id) return authUser;
    return { _id: id, Name: 'Unknown', profilePic: null };
  }).filter(Boolean);

  const seen = new Set();
  const displayMembers = [];
  for (const mem of resolvedMembers) {
    if (!seen.has(mem._id)) {
      seen.add(mem._id);
      displayMembers.push(mem);
    }
  }

  const membersWithPendingChanges = [
    ...displayMembers.filter(m => !pendingMembersToRemove.includes(m._id)),
    ...pendingMembersToAdd.map(userId => {
      const user = users.find(u => u._id === userId);
      return user || { _id: userId, Name: 'Unknown', profilePic: null };
    })
  ];

  const effectiveMemberCount = membersWithPendingChanges.length || 0;

  const isSoloAdmin = isAdmin() && effectiveMemberCount === 1;

  const currentMemberIds = new Set([
    ...displayMembers.map(m => m._id),
    ...pendingMembersToAdd
  ]);
  const availableUsers = users.filter(
    (user) => user.type !== 'group' && !currentMemberIds.has(user._id)
  );

  const handlePendingAddMember = (userId) => {
    setPendingMembersToAdd(prev => [...prev, userId]);
  };

  const handlePendingRemoveMember = (memberId) => {
    if (pendingMembersToAdd.includes(memberId)) {
      setPendingMembersToAdd(prev => prev.filter(id => id !== memberId));
    } else {
      setPendingMembersToRemove(prev => [...prev, memberId]);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateGroup(group._id, { Name: newName, description: newDesc });

      if (pendingMembersToAdd.length > 0) {
        await addMemberToGroup(group._id, pendingMembersToAdd);
      }

      for (const memberId of pendingMembersToRemove) {
        await removeMemberFromGroup(group._id, memberId);
      }

      await getGroupDetails(group._id);
      await getSlidebarChats();

      setEditing(false);
      setPendingMembersToAdd([]);
      setPendingMembersToRemove([]);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleCancel = () => {
    setNewName(group.Name);
    setNewDesc(group.description || "");
    setPendingMembersToAdd([]);
    setPendingMembersToRemove([]);
    setEditing(false);
  };

  const handleLeave = async () => {
    if (isAdmin()) {
      setShowTransferModal(true);
    } else {
      if (!window.confirm("Leave this group?")) return;
      await leaveGroup(group._id);
      if (typeof getSlidebarChats === 'function') await getSlidebarChats();
      if (typeof setSelectedChat === 'function') setSelectedChat(null);
      onClose();
    }
  };

  const handleTransferAndLeave = async () => {
    if (!selectedNewAdmin) {
      alert("Please select a new admin");
      return;
    }
    try {
      await transferAdmin(group._id, selectedNewAdmin);
      await leaveGroup(group._id);
      if (typeof getSlidebarChats === 'function') await getSlidebarChats();
      if (typeof setSelectedChat === 'function') setSelectedChat(null);
      onClose();
    } catch (err) {
      console.error("Transfer failed:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this group permanently?")) return;
    await deleteGroup(group._id);
    if (typeof getSlidebarChats === 'function') await getSlidebarChats();
    if (typeof setSelectedChat === 'function') setSelectedChat(null);
    onClose();
  };

  return (
    <div className="bg-base-200 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users size={20} />
          Group Settings
        </h2>
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Group Info */}
        <div className="flex justify-center">
          <img
            src={displayGroup.profilePic || "/avatar.png"}
            alt={displayGroup.Name}
            className="size-20 rounded-full object-cover"
          />
        </div>

        {editing ? (
          <>
            <div>
              <label htmlFor="group-name" className="label">
                <span className="label-text">Group Name</span>
              </label>
              <input
                id="group-name"
                type="text"
                className="input input-bordered w-full"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="group-desc" className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                id="group-desc"
                className="textarea textarea-bordered w-full h-20 resize-none"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="text-center">
            <h3 className="text-xl font-bold">{displayGroup.Name}</h3>
            {displayGroup.description && (
              <p className="text-sm text-zinc-400 mt-1">{displayGroup.description}</p>
            )}
          </div>
        )}

        {/* Members List */}
        <div>
          <h4 className="font-semibold mb-2">
            Members ({membersWithPendingChanges.length || 0})
            {editing && (pendingMembersToAdd.length > 0 || pendingMembersToRemove.length > 0) && (
              <span className="text-xs text-warning ml-2">
                (Unsaved changes)
              </span>
            )}
          </h4>
          <div className="border border-base-300 rounded-lg max-h-60 overflow-y-auto">
            {membersWithPendingChanges.map((member, i) => {
              const isPendingAdd = pendingMembersToAdd.includes(member._id);
              
              return (
                <div
                  key={member._id || i}
                  className={`flex items-center justify-between p-3 hover:bg-base-300 ${
                    isPendingAdd ? 'bg-success/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.profilePic || "/avatar.png"}
                      alt={member.Name || "Member"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.Name || "Unknown"}</span>
                      {isUserAdmin(member._id) && (
                        <span className="badge badge-primary badge-sm">Admin</span>
                      )}
                      {isPendingAdd && (
                        <span className="badge badge-success badge-sm">New</span>
                      )}
                    </div>
                  </div>

                  {editing && isAdmin() && !isUserAdmin(member._id) && (
                    <button
                      onClick={() => handlePendingRemoveMember(member._id)}
                      className="btn btn-ghost btn-sm text-error"
                    >
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {editing && isAdmin() && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <UserPlus size={18} />
              Add Members
            </h4>
            <div className="border border-base-300 rounded-lg max-h-48 overflow-y-auto">
              {availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 hover:bg-base-300"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.Name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <span>{user.Name}</span>
                    </div>
                    <button
                      onClick={() => handlePendingAddMember(user._id)}
                      className="btn btn-primary btn-sm"
                    >
                      <UserPlus size={16} />
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-zinc-500">
                  All users are already members
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 space-y-2">
          {isAdmin() && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn btn-outline w-full flex items-center justify-center gap-2"
            >
              <Edit size={16} /> Edit Group
            </button>
          )}

          {editing && isAdmin() && (
            <>
              <button
                onClick={handleCancel}
                className="btn btn-outline w-full flex items-center justify-center gap-2"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                Save Changes
              </button>
            </>
          )}
         
          {!isSoloAdmin && (
            <button
              onClick={handleLeave}
              className="btn btn-warning w-full flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Leave Group
            </button>
          )}


          {isAdmin() && (
            <button
              onClick={handleDelete}
              className="btn btn-error w-full flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Delete Group
            </button>
          )}
        </div>
      </div>

      {/* Transfer Admin Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-200 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Transfer Admin Rights</h3>
            <p className="text-sm text-zinc-400 mb-4">
              You must transfer admin rights to another member before leaving the group.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {displayMembers
                .filter((m) => (m._id || m) !== authUser._id)
                .map((member) => (
                  <button
                    key={member._id}
                    onClick={() => setSelectedNewAdmin(member._id)}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 ${
                      selectedNewAdmin === member._id
                        ? "bg-primary text-primary-content"
                        : "bg-base-300 hover:bg-base-100"
                    }`}
                  >
                    <img
                      src={member.profilePic || "/avatar.png"}
                      alt={member.Name}
                      className="w-10 h-10 rounded-full"
                    />
                    <span>{member.Name}</span>
                  </button>
                ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedNewAdmin(null);
                }}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferAndLeave}
                disabled={!selectedNewAdmin}
                className="btn btn-primary flex-1"
              >
                Transfer & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettings;