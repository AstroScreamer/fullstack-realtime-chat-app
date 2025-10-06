import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SlidebarSkeleton from "./skeletons/SlidebarSkeleton";
import { MessageSquare, Users } from "lucide-react";
import { formatLastSeen } from "../lib/utils";
import CreateGroup from "./CreateGroup";



const Slidebar = () => {
  const { 
    getUsers, 
    getGroups,
    users = [],
    selectedChat,
    setSelectedChat, 
    isUsersLoading,   
    typingUsers = {} 
  } = useChatStore();

  const { onlineUsers = [] } = useAuthStore();
  const [showCreateGroup, setShowCreateGroup] = useState(false);


  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  // filter online only toggle
  const filteredUsers = users;

  if (isUsersLoading) {
    return <SlidebarSkeleton />;
  }

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-6" />
          <span className="font-medium hidden lg:block">Chats</span>
        </div>
      </div>
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

      {/* Users list */}
      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => {
          // check if this user is currently typing
          const isTyping = typingUsers?.[user._id];
          // otherwise online/offline
          let statusText = "";

          if (isTyping) {
            statusText = "is typing";
          } else if (onlineUsers.includes(user._id)) {
            statusText = "Online";
          } else {
            // offline but show last seen
            statusText = user.lastSeen
              ? `Last seen ${formatLastSeen(user.lastSeen)}`
              : "Offline";
          }

          return (
            <button
              key={user._id}
              onClick={() => setSelectedChat({...user, type: "user"})}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedChat?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user?.Name || user?.name || "User Avatar"}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium truncate">{user.Name}</div>
                <div className="text-sm text-zinc-400 truncate">{statusText}</div>
              </div>
            </button>
            
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No users</div>
        )}
      </div>
    </aside>
  );
};

export default Slidebar;