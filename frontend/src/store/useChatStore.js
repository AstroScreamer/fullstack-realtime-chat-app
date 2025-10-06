import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    groups: [],
    selectedChat: null,
    setSelectedChat: (chat) => set({ selectedChat: chat }),
    isUsersLoading: false,
    isGroupsLoading: false,
    isMessagesLoading: false,
    typingUsers: {},
    
    // sort users by latest activity
    sortUsersByLatestActivity: () => {
        set((state) => {
            const sortedUsers = [...state.users].sort((a, b) => {
                const aTime = a.lastMessageTime || a.updatedAt || 0;
                const bTime = b.lastMessageTime || b.updatedAt || 0;
                return new Date(bTime) - new Date(aTime);
            });
            
            const sortedGroups = [...state.groups].sort((a, b) => {
                const aTime = a.lastMessageTime || a.updatedAt || 0;
                const bTime = b.lastMessageTime || b.updatedAt || 0;
                return new Date(bTime) - new Date(aTime);
            });
            return { users: sortedUsers, groups: sortedGroups };
        });
    },

    // users
    getUsers: async () => {
        set({ isUsersLoading: true });  
        try {
            const res = await axiosInstance.get("/messages/users");
            set({ users: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message);
        } finally {
            set({ isUsersLoading: false });
        }
    },

    // groups
    getGroups: async () => {
        set({ isGroupsLoading: true });
        try {
        const res = await axiosInstance.get("/groups");
        set({ groups: res.data });
        } catch (error) {
        toast.error(error.response?.data?.message);
        } finally {
        set({ isGroupsLoading: false });
        }
    },
    
    // messages
    getMessages: async (id, isGroup = false) => {
        set({ isMessagesLoading: true });
        try {
            const endpoint = isGroup
            ? `/groups/${id}/messages`
            : `/messages/${id}`;
            const res = await axiosInstance.get(endpoint);
            set({ messages: res.data });
        } catch (err) {
            console.error("getMessages error", err);
        } finally {
            set({ isMessagesLoading: false });
        }
    }, 
    
    // sendMessage
    sendMessage: async ({ text, image }) => {
        try {
            // check selectedChat is set
            const { selectedChat } = get();  // from zustand get()

            if (!selectedChat?._id) return;

            // Decide endpoint based on type
            let endpoint;
            if (selectedChat.type === 'group') {
            endpoint = `/groups/${selectedChat._id}/messages`;
            } else {
            endpoint = `/messages/send/${selectedChat._id}`;
            }

            // Call API
            const res = await axiosInstance.post(endpoint, { text, image });

            // Update local state instantly
            set((state) => ({
            messages: [...state.messages, res.data],
            }));

            return res.data;
        } catch (err) {
            console.error('Error sending message', err);
            throw err;
        }
    },


    // socket subscribe
    subscribeToMessages: () => {
        const { selectedChat } = get();
        if(!selectedChat) return;
        
        const socket = useAuthStore.getState().socket;

        socket.off("typing");
        socket.off("stopTyping");
        socket.off("newMessage");
        socket.off("newGroupMessage");
        
        // personal messages
        socket.on("newMessage", (newMessage) => {
            const { sortUsersByLatestActivity } = get();
            
            if (
                selectedChat.type !== "group" &&
                (newMessage.senderId === selectedChat._id ||
                newMessage.receiverId === selectedChat._id)
            ) {
                set({ messages: [...get().messages, newMessage] });
            }
            
            // Update user's last message time and reorder
            set((state) => ({
                users: state.users.map(user => 
                    user._id === newMessage.senderId || user._id === newMessage.receiverId
                        ? { ...user, lastMessageTime: newMessage.createdAt }
                        : user
                )
            }));
            
            sortUsersByLatestActivity();
        });

        // group messages
        socket.on("newGroupMessage", (newMessage) => {
            const { sortUsersByLatestActivity } = get();
            
            if (
                selectedChat.type === "group" &&
                newMessage.groupId === selectedChat._id
            ) {
                set({ messages: [...get().messages, newMessage] });
            }
            
            // Update group's last message time and reorder
            set((state) => ({
                groups: state.groups.map(group => 
                    group._id === newMessage.groupId
                        ? { ...group, lastMessageTime: newMessage.createdAt }
                        : group
                )
            }));
            
            sortUsersByLatestActivity();
        });

        socket.on("typing", ({ from }) => {
            set((state) => ({
                typingUsers: { ...state.typingUsers, [from]: true }
            }));
        });

        socket.on("stopTyping", ({ from }) => {
            set((state) => {
                const updated = { ...state.typingUsers };
                delete updated[from];
                return { typingUsers: updated };
            });
        });

        socket.on("messageSeen", ({ messageId }) => {
            set((state) => ({
                messages: state.messages.map(m =>
                    m._id === messageId ? { ...m, seen: true } : m
                ),
            }));    
        });
    },

    // socket unsubscribe
    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("newGroupMessage");
        socket.off("typing");
        socket.off("stopTyping");
        socket.off("messageSeen");
    },
}))