import { useEffect, useRef, useState, Fragment } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import {
  formatMessageTime,
  getUserColor,
  formatChatDate,
} from "../lib/utils";
import { axiosInstance } from "../lib/axios";
import { ArrowDown } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedChat,
  } = useChatStore();

  const { authUser, socket } = useAuthStore();

  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  // Fetch + subscribe messages whenever chat changes
  useEffect(() => {
    if (!selectedChat?._id) return;

    const isGroup = selectedChat.type === "group";

    getMessages(selectedChat._id, isGroup);

    if (isGroup && socket) {
      socket.emit("joinGroup", selectedChat._id);

      return () => {
        socket.emit("leaveGroup", selectedChat._id);
      };
    }
  }, [selectedChat?._id, selectedChat?.type, getMessages, socket]);

  // Mark unseen messages as seen (1v1 only)
  useEffect(() => {
    if (!selectedChat || selectedChat.type === "group" || isMessagesLoading)
      return;

    const unseenMessages = messages.filter((m) => {
      const senderId =
        typeof m.senderId === "object" ? m.senderId?._id : m.senderId;
      const receiverId =
        typeof m.receiverId === "object" ? m.receiverId?._id : m.receiverId;

      return (
        receiverId === authUser._id &&
        senderId !== authUser._id &&
        !m.seen
      );
    });

    if (unseenMessages.length === 0) return;

    unseenMessages.forEach(async (m) => {
      try {
        await axiosInstance.patch(
          `messages/seen/${m._id}`,
          {},
          { withCredentials: true }
        );
      } catch (err) {
        console.error(err.response?.data);
      }
    });
  }, [messages, selectedChat, authUser._id, isMessagesLoading]);

  // scroll to bottom
  const scrollToBottom = (smooth = true) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // Always go to bottom on new messages
  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Track scroll position to show/hide arrow button
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 120;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollButton(distanceFromBottom > threshold);
    };

    el.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [messages]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a chat to start messaging
      </div>
    );
  }

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <ChatHeader />

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message, index) => {
          const sender = message.senderId?._id
            ? message.senderId
            : { _id: message.senderId };

          const isMine = sender._id === authUser._id;
          const isGroup = selectedChat?.type === "group";
          const nameColor = getUserColor(sender._id);

          // ---- Date separator logic ----
          const currentDate = formatChatDate(message.createdAt);
          let showDateSeparator = false;

          if (index === 0) {
            showDateSeparator = true;
          } else {
            const prevMessage = messages[index - 1];
            const prevDate = formatChatDate(prevMessage.createdAt);
            if (prevDate !== currentDate) showDateSeparator = true;
          }

          return (
            <Fragment key={`${message._id}-${index}`}>
              {showDateSeparator && (
                <div className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-base-300 text-xs text-zinc-300">
                    {currentDate}
                  </span>
                </div>
              )}

              <div
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

                {/* For 1v1 you only showed time in header; keep that */}
                {!isGroup && (
                  <div className="chat-header mb-1 flex items-center gap-1">
                    <time className="text-xs opacity-50 ml-1">
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </div>
                )}

                {/* Bubble */}
                <div className="chat-bubble flex flex-col">
                  {isGroup && !isMine && (
                    <span
                      className="font-semibold text-xs mb-1"
                      style={{ color: nameColor }}
                    >
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
            </Fragment>
          );
        })}

        <div ref={messageEndRef} />
      </div>

      {/* Floating "scroll to bottom" button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-1/2 lg:right-1/2 h-10 w-10 rounded-full bg-base-300 hover:bg-base-200 flex items-center justify-center shadow-md border border-zinc-700 transition-colors"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
