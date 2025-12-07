import { useEffect, useMemo, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SlidebarSkeleton from "./skeletons/SlidebarSkeleton";
import { MessageSquare, Users } from "lucide-react";
import { formatLastSeen } from "../lib/utils";
import CreateGroup from "./CreateGroup";

const Slidebar = () => {
  const getSlidebarChats = useChatStore((state) => state.getSlidebarChats);
  const users = useChatStore((state) => state.users);
  const groups = useChatStore((state) => state.groups);
  const selectedChat = useChatStore((state) => state.selectedChat);
  const setSelectedChat = useChatStore((state) => state.setSelectedChat);
  const isUsersLoading = useChatStore((state) => state.isUsersLoading);
  const isGroupsLoading = useChatStore((state) => state.isGroupsLoading);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const lastUpdate = useChatStore((state) => state.lastUpdate);
  const unreadCounts = useChatStore((state) => state.unreadCounts);

  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    getSlidebarChats();
  }, []);

  const freshUsers = Array.isArray(users) ? users : [];
  const freshGroups = Array.isArray(groups) ? groups : [];

  const allChats = useMemo(() => {
    const normalizedGroups = freshGroups.map((g) => ({
        ...g,
        type: "group",
    }));

    const combined = [...freshUsers, ...normalizedGroups];

    const unique = combined.filter(
        (chat, index, self) => index === self.findIndex((c) => c._id === chat._id)
    );

    const sorted = unique.sort((a, b) => {
        const aTime = new Date(a.lastMessageTime || a.createdAt || 0).getTime();
        const bTime = new Date(b.lastMessageTime || b.createdAt || 0).getTime();
        return bTime - aTime;
    });

    return sorted;
  }, [freshUsers, freshGroups, lastUpdate]);

  if (isUsersLoading || isGroupsLoading) {
    return <SlidebarSkeleton />;
  }

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="border-b border-base-300 w-full p-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-6" />
          <span className="font-medium hidden lg:block">Chats</span>
        </div>
      </div>

      {/* Create Group Section */}
      <div className="flex items-center flex-wrap justify-between px-3 mb-2">
        <h4 className="text font-medium">Create Groups</h4>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="btn btn-ghost btn-xs hover:bg-base-300 mt-1"
          title="Create Group"
        >
          <Users size={20} />
        </button>
      </div>

      <CreateGroup
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />

      {/* Chats List */}
      <div className="overflow-y-auto w-full py-3">
        {allChats.map((chat) => {
          const isGroup = chat.type === "group";
          const displayChat =
            isGroup && selectedChat && selectedChat._id === chat._id
              ? selectedChat
              : chat;

          const unreadCount = unreadCounts[displayChat._id] || 0;

          // Status text logic
          let statusText = "";
          if (displayChat.type === "group") {
            statusText = `${displayChat.members?.length || 0} members`;
          } else {
            const isTyping = typingUsers?.[displayChat._id];
            if (isTyping) {
              statusText = "is typing...";
            } else if (onlineUsers.includes(displayChat._id)) {
              statusText = "Online";
            } else if (displayChat.lastSeen) {
              statusText = `Last seen ${formatLastSeen(displayChat.lastSeen)}`;
            } else {
              statusText = "Offline";
            }
          }

          return (
              <button
              key={displayChat._id}
              onClick={() => {
                setSelectedChat(displayChat);
                
                if (unreadCount > 0) {
                  const socket = useChatStore.getState().socket;
                  socket?.emit("clearUnread", { 
                    chatId: displayChat._id, 
                    type: displayChat.type || "user" 
                  });
                }
              }}

              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedChat?._id === displayChat._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={displayChat.profilePic || "/avatar.png"}
                  alt={displayChat?.Name || "Avatar"}
                  className="size-12 object-cover rounded-full"
                />
                
                {/* Online indicator for users (not groups) */}
                {displayChat.type !== "group" && onlineUsers.includes(displayChat._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}

                {/* Unread badge - ONLY on small/medium screens (at top-right of avatar) */}
                {unreadCount > 0 && (
                  <span
                    className="lg:hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold 
                    rounded-full h-5 w-5 flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              {/* Chat Info - visible on large screens */}
              <div className="hidden lg:flex items-center gap-2 text-left min-w-0 flex-1">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{displayChat.Name}</div>
                  <div className="text-sm text-zinc-400 truncate">{statusText}</div>
                </div>
                
                {/* Unread badge - ONLY on large screens (next to name) */}
                {unreadCount > 0 && (
                  <span
                    className="bg-red-500 text-white text-xs font-semibold 
                    rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center flex-shrink-0"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {allChats.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No chats</div>
        )}
      </div>
    </aside>
  );
};

export default Slidebar;
