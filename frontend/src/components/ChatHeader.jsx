import { X, Settings } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatLastSeen } from "../lib/utils";
import GroupSettings from "./GroupSettings";
import { useState } from "react";

const ChatHeader = () => {
  const { selectedChat, setSelectedChat, typingUsers } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  const handleCloseSettings = () => {
    setShowGroupSettings(false);
  };

  if (!selectedChat) {
    return (
      <div className="p-4 border-b border-base-300">
        <h2 className="text-lg font-semibold">Select a chat</h2>
      </div>
    );
  }

  const isGroupChat = selectedChat.type === "group";
  let statusText = "";

  if (isGroupChat) {
    const groupPrefix = `group_${selectedChat._id}_`;
    const groupTypingMembers = Object.entries(typingUsers)
        .filter(([key]) => { 
            if (!key.startsWith(groupPrefix)) return false;
            
            const userId = key.replace(groupPrefix, '');
            
            return userId !== authUser._id && 
                   selectedChat.members?.some(m => (m._id || m).toString() === userId);
        })
        .map(([, userName]) => userName);

    if (groupTypingMembers.length > 0) {
        statusText = groupTypingMembers.length === 1
            ? `${groupTypingMembers[0]} is typing...`
            : `${groupTypingMembers.length} people are typing...`;
    } else {
        statusText = `${selectedChat.members?.length || 0} members`;
    }
  } else {
    const typingKey = `user_${selectedChat._id}`;
    const isTyping = typingUsers?.[typingKey];
    const isOnline = onlineUsers.includes(selectedChat._id);

    if (isTyping) {
      statusText = "is typing...";
    } else if (isOnline) {
      statusText = "Online";
    } else if (selectedChat.lastSeen) {
      statusText = `Last seen ${formatLastSeen(selectedChat.lastSeen)}`;
    } else {
      statusText = "Offline";
    }
  }

  return (
    <div className="p-4 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedChat.profilePic || "/avatar.png"} alt={selectedChat.Name} />
            </div>
          </div>

          <div>
            <h3 className="font-medium">{selectedChat.Name}</h3>
            <div className="text-xs text-zinc-400">{statusText}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {selectedChat?.type === 'group' && (
            <button 
              onClick={() => setShowGroupSettings(true)}
              className="hover:text-primary transition-colors"
            >
              <Settings size={20} />
            </button>
          )}

          {showGroupSettings && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <GroupSettings
                group={selectedChat}
                onClose={handleCloseSettings}
              />
            </div>
          )}

          <button onClick={() => setSelectedChat(null)}>
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;