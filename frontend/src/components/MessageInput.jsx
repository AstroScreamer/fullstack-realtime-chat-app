import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MessageInput = () => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, selectedChat, setDraft, getDraft, clearDraft } = useChatStore();
  const { socket } = useAuthStore();
  const typingTimeoutRef = useRef(null);
  const lastTypingTime = useRef(0); 

  useEffect(() => {
    if (selectedChat?._id) {
      const savedDraft = getDraft(selectedChat._id);
      setText(savedDraft);
    }
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [selectedChat?._id, getDraft]);

  useEffect(() => {
    if (selectedChat?._id) {
      setDraft(selectedChat._id, text);
    }
  }, [text, selectedChat?._id, setDraft]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTyping = () => {
    if (!socket || !selectedChat) return;
    
    const now = Date.now();
    if (now - lastTypingTime.current > 2000) {
      if (selectedChat.type === "group") {
        socket.emit("groupTyping", { groupId: selectedChat._id });
      } else {
        socket.emit("typing", { receiverId: selectedChat._id });
      }
      lastTypingTime.current = now;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedChat.type === "group") {
        socket.emit("groupStopTyping", { groupId: selectedChat._id });
      } else {
        socket.emit("stopTyping", { receiverId: selectedChat._id });
      }
    }, 3000);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    handleTyping();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      setText('');
      clearDraft(selectedChat._id);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (socket && selectedChat) {
        if (selectedChat.type === "group") {
          socket.emit("groupStopTyping", { groupId: selectedChat._id });
        } else {
          socket.emit("stopTyping", { receiverId: selectedChat._id });
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className='p-4 w-full'>
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className='flex items-center gap-2'>
        <div className='flex-1 flex gap-2'>
          {/* Text input */}
          <input
            type='text'
            className='w-full input input-bordered rounded-lg input-sm sm:input-md'
            placeholder='Type a message...'
            value={text}
            onChange={handleTextChange}
          />

          {/* File input */}
          <input
            type='file'
            accept='image/*'
            className='hidden'
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          {/* Image upload button */}
          <button
            type='button'
            className={`hidden sm:flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>

        {/* Send button */}
        <button
          type='submit'
          className='btn btn-circle'
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;