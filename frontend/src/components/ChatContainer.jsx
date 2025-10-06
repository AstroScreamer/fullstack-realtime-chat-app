import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeletons/MessageSkeleton';
import { formatMessageTime, getUserColor } from '../lib/utils';
import { axiosInstance } from '../lib/axios';


const ChatContainer = () => {
  const { 
    messages,
    getMessages,
    isMessagesLoading,
    selectedChat,
    subscribeToMessages,
    unsubscribeFromMessages
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);


  // Fetch + subscribe messages whenever chat changes
  useEffect(() => {
    if (!selectedChat?._id) return;

    const isGroup = selectedChat.type === "group";
    
    getMessages(selectedChat._id, isGroup);
    
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedChat?._id, selectedChat?.type, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Mark unseen messages as seen
  useEffect(() => {  
    if (!selectedChat || selectedChat.type === "group") return;
    
    messages
      .filter(m => m.senderId !== authUser._id && !m.seen)
      .forEach(m => {
        axiosInstance.patch(`/messages/seen/${m._id}`, {}, { withCredentials: true });
      });
  }, [messages, selectedChat, authUser._id]);

  // 🔹 Scroll to bottom when messages update
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a chat to start messaging
      </div>
    );
  }

  if(isMessagesLoading) {
    return (
    <div className='flex-1 flex flex-col overflow-auto'>
      <ChatHeader />
      <MessageSkeleton />
      <MessageInput />
    </div>
    );
  } 

  return (
    <div className='flex-1 flex flex-col overflow-auto'>
      <ChatHeader />

      <div 
        ref={messagesContainerRef}
        className='flex-1 overflow-y-auto p-4 space-y-4'
      >
        {messages.map((message) => {
          const sender = message.senderId?._id ? message.senderId : { _id: message.senderId };
          const isMine = sender._id === authUser._id;
          const isGroup = selectedChat?.type === "group";

          // pick a color for each sender (stable)
          const nameColor = getUserColor(sender._id); 

          return (
            <div
              key={message._id}
              className={`chat ${isMine ? "chat-end" : "chat-start"}`}
            >
              {/* Avatar */}
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isMine
                        ? authUser.profilePic || "/avatar.png"
                        : sender.profilePic || "/avatar.png"
                    }
                    alt="profile"
                  />
                </div>
              </div>

              {/* Header (time only for 1v1, name shown inside bubble for group) */}
              {!isGroup && (
                <div className="chat-header mb-1 flex items-center gap-1">
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>
              )}

              {/* Bubble */}
              <div className="chat-bubble flex flex-col">
                {/* Show sender name only for group and only if not our own message */}
                {isGroup && !isMine && (
                  <span 
                    className="font-semibold text-xs mb-1" style={{ color: nameColor }}>
                    {sender.Name || "User"}
                  </span>
                )}

                {/* Attachment */}
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}

                {/* Message text */}
                {message.text && <p>{message.text}</p>}

                {/* Time + status */}
                <div className="flex justify-between mt-1 items-center">
                  <time className="text-[10px] opacity-50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                  {isMine && (
                    <span className="text-[10px] opacity-60 self-end ml-2">
                      {message.seen ? "✓✓ Seen" : "✓ Delivered"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>
      <MessageInput />
    </div>
  )
}

export default ChatContainer;