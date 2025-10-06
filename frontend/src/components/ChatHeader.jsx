import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatLastSeen } from "../lib/utils";

const ChatHeader = () => {
  const { selectedChat, setSelectedChat, typingUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();

  if (!selectedChat) {
    return (
      <div className="p-4 border-b border-base-300">
        <h2 className="text-lg font-semibold">Select a chat</h2>
      </div>
    );
  }

  // is this user typing?
  const isTyping = typingUsers?.[selectedChat._id];

  // status text logic
  let statusText = "";
  if (isTyping) {
    statusText = "Typing…";
  } else if (onlineUsers.includes(selectedChat._id)) {
    statusText = "Online";
  } else {
    statusText = selectedChat.lastSeen
      ? `Last seen ${formatLastSeen(selectedChat.lastSeen)}`
      : "Offline";
  }


  return (
    <div className="p-4 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedChat.profilePic || "/avatar.png"} alt={selectedChat.Name} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedChat.Name}</h3>
            <div className="text-xs text-zinc-400">
              {statusText}
            </div>
          </div>
        </div>

        {/* Close button */}
        <button onClick={() => setSelectedChat(null)}>
          <X />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
