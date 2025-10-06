import { useRef, useState } from 'react'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';


const MessageInput = () => {
  const [ text, setText ] = useState('');
  const [ imagePreview, setImagePreview ] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, selectedChat } = useChatStore();
  const { socket } = useAuthStore();
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Handle image select
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if(!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    }
    reader.readAsDataURL(file);
  }

  // Remove selected image
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Send message
  const handleSendMessage = async(e) => {
    e.preventDefault();
    if(!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // stop typing emit (1v1 only)
      if (socket && selectedChat?.type !== 'group') {
        socket.emit("stopTyping", { receiverId: selectedChat._id }); // stop typing on send
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  // typing indicator handler (on input change)
  const handleTyping = (value) => {
    setText(value);

    // only for 1v1 chats
    if (socket && selectedChat?.type !== 'group') {
      socket.emit('typing', { receiverId: selectedChat._id });

      if (typingTimeout) clearTimeout(typingTimeout);

      setTypingTimeout(
        setTimeout(() => {
          socket.emit('stopTyping', { receiverId: selectedChat._id });
        }, 1000)
      );
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

      <form onSubmit={handleSendMessage} className='flex items-cneter gap-2'>
        <div className='flex-1 flex gap-2'>
          {/* Text input */}
          <input
            type='text'
            className='w-full input input-bordered rounded-lg input-sm sm:input-md'
            placeholder='Type a message...'
            value={text}
            onChange={(e) =>  
              handleTyping(e.target.value)}
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