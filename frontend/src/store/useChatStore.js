import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    groups: [],
    selectedChat: null,
    isUsersLoading: false,
    isGroupsLoading: false,
    isMessagesLoading: false,
    typingUsers: {},
    drafts: {},
    lastUpdate: Date.now(),
    unreadCounts: {}, 


    setSelectedChat: (chat) => {
        const socket = useAuthStore.getState().socket;
        const prevChat = get().selectedChat;
        
        if (prevChat?.type === "group") {
            socket?.emit("leaveGroup", prevChat._id);
        }
        
        if (chat?.type === "group") {
            socket?.emit("joinGroup", chat._id);
        }
        
        if (chat?._id) {
            const currentUnreadCount = get().unreadCounts[chat._id];
            if (currentUnreadCount > 0) {
                socket?.emit("clearUnread", { 
                    chatId: chat._id, 
                    type: chat.type || "user" 
                });
            }
            
            set((state) => {
                const newUnreadCounts = { ...state.unreadCounts };
                delete newUnreadCounts[chat._id];
                return { 
                    selectedChat: chat, 
                    messages: [],
                    unreadCounts: newUnreadCounts
                };
            });
        } else {
            set({ selectedChat: chat, messages: [] });
        }
        
        if (chat) get().getMessages(chat._id);
    },

    setDraft: (chatId, text) => {
        const { drafts } = get();
        set({ drafts: { ...drafts, [chatId]: text } });
    },

    getDraft: (chatId) => {
        const { drafts } = get();
        return drafts[chatId] || "";
    },
    
    clearDraft: (chatId) => {
        const { drafts } = get();
        const updated = { ...drafts };
        delete updated[chatId];
        set({ drafts: updated });
    },

    // create group
    createGroup: async (groupData) => {
        try {
            const res = await axiosInstance.post("/groups", groupData);
            const newGroup = { ...res.data, type: 'group' };
            
            set((state) => {
                const exists = state.groups.some(g => g._id === newGroup._id);
                if (exists) {
                    return state;
                }
                
                return {
                    groups: [...state.groups, newGroup]
                };
            });
            
            toast.success("Group created successfully");
            return newGroup;
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create group");
            throw error;
        }
    },

    // get group details
    getGroupDetails: async (groupId) => {
        try {
            const res = await axiosInstance.get(`/groups/${groupId}`);
            const groupObj = { ...res.data, type: 'group' };
            set((state) => ({
                groups: state.groups.map(g => g._id === groupId ? groupObj : g),
                selectedChat: state.selectedChat?._id === groupId ? groupObj : state.selectedChat
            }));
            return groupObj;
        } catch (error) {
            if (error?.response?.status === 404) {
                set((state) => ({
                    groups: state.groups.filter(g => g._id !== groupId),
                    selectedChat: state.selectedChat?._id === groupId ? null : state.selectedChat
                }));
                return null;
            }
            console.error("Error fetching group details:", error);
            throw error;
        }
    },

    // Transfer admin rights
    transferAdmin: async (groupId, newAdminId) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}/transfer-admin`, {newAdminId});
            const groupObj = { ...res.data, type: 'group' };
            set((state) => ({
                groups: state.groups.map((g) => (g._id === groupId ? groupObj : g)),
                selectedChat: state.selectedChat?._id === groupId ? groupObj : state.selectedChat
            }));
            toast.success("Admin transferred successfully");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to transfer admin");
        }
    },

    // slidebar chats
    getSlidebarChats: async () => {
        set({ isUsersLoading: true, isGroupsLoading: true });
        try {
            const res = await axiosInstance.get("/messages/slidebar");
            
            const chats = res.data;
            const users = chats.filter(c => c.type === "user");
            const groups = chats.filter(c => c.type === "group");
            
            const unreadCounts = {};
            chats.forEach(chat => {
                if (chat.unreadCount > 0) {
                    unreadCounts[chat._id] = chat.unreadCount;
                }
            });
            
            set({ 
                users,
                groups,
                unreadCounts 
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load chats");
        } finally {
            set({ isUsersLoading: false, isGroupsLoading: false });
        }
    },

    // messages
    getMessages: async (id) => {
        set({ isMessagesLoading: true, messages: [] });
        try {
            const endpoint = `/messages/${id}`;
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
            const { selectedChat } = get();
            if (!selectedChat?._id) return;

            const socket = useAuthStore.getState().socket;
            socket?.emit("clearUnread", { 
                chatId: selectedChat._id, 
                type: selectedChat.type || "user" 
            });

            const endpoint = `/messages/send/${selectedChat._id}`;
            const res = await axiosInstance.post(endpoint, { text, image });
            
            set((state) => ({
                messages: [...state.messages, res.data]
            }));
            
            set((state) => {
                const newUnreadCounts = { ...state.unreadCounts };
                delete newUnreadCounts[selectedChat._id];
                return { unreadCounts: newUnreadCounts };
            });
            
            if (selectedChat.type === "group") {
                set((state) => ({
                    groups: state.groups.map(g =>
                        g._id === selectedChat._id
                            ? { ...g, lastMessageTime: res.data.createdAt }
                            : g
                    )
                }));
            } else {
                set((state) => ({
                    users: state.users.map(u =>
                        u._id === selectedChat._id
                            ? { ...u, lastMessageTime: res.data.createdAt }
                            : u
                    )
                }));
            }
            
            return res.data;
        } catch (err) {
            console.error('Error sending message', err);
            throw err;
        }
    },

    // Add member to group
    addMemberToGroup: async (groupId, members) => {
        const prevState = get();
        try {
            set((state) => ({
                groups: state.groups.map(g => {
                    if (g._id !== groupId) return g;
                    const existing = g.members ? [...g.members] : [];
                    const newMembers = members.map(m => ({ _id: m }));
                    return { ...g, members: [...existing, ...newMembers] };
                }),
                selectedChat: state.selectedChat?._id === groupId ? {
                    ...state.selectedChat,
                    members: [...(state.selectedChat.members || []), ...members.map(m => ({ _id: m }))]
                } : state.selectedChat
            }));

            const res = await axiosInstance.post(`/groups/${groupId}/members`, { members });

            set((state) => ({
                groups: state.groups.map(g => g._id === groupId ? { ...res.data, type: 'group' } : g),
                selectedChat: state.selectedChat?._id === groupId ? { ...res.data, type: 'group' } : state.selectedChat
            }));
            toast.success("Members added successfully");
        } catch (error) {
            set(() => ({ groups: prevState.groups, selectedChat: prevState.selectedChat }));
            toast.error(error.response?.data?.error || 'Failed to add members');
        }
    },

    // Remove member from group
    removeMemberFromGroup: async (groupId, memberId) => {
        const prevState = get();
        try {
            set((state) => ({
                groups: state.groups.map(g => {
                    if (g._id !== groupId) return g;
                    return { ...g, members: (g.members || []).filter(m => (m._id || m) !== memberId) };
                }),
                selectedChat: state.selectedChat?._id === groupId ? {
                    ...state.selectedChat,
                    members: (state.selectedChat.members || []).filter(m => (m._id || m) !== memberId)
                } : state.selectedChat
            }));

            const res = await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);

            set((state) => ({
                groups: state.groups.map(g => g._id === groupId ? { ...res.data, type: 'group' } : g),
                selectedChat: state.selectedChat?._id === groupId ? { ...res.data, type: 'group' } : state.selectedChat
            }));
            toast.success("Member removed");
        } catch (error) {
            set(() => ({ groups: prevState.groups, selectedChat: prevState.selectedChat }));
            toast.error(error.response?.data?.error || 'Failed to remove member');
        }
    },

    // Leave group
    leaveGroup: async (groupId) => {
        try {
            await axiosInstance.post(`/groups/${groupId}/leave`);
            set((state) => ({
                groups: state.groups.filter(g => g._id !== groupId),
                selectedChat: null
            }));
            toast.success("Left group");
        } catch (error) {
            toast.error(error.response?.data?.error);
        }
    },

    // Delete group
    deleteGroup: async (groupId) => {
        try {
            set((state) => {
                
                const filtered = state.groups.filter(g => 
                    g._id !== groupId && g._id?.toString() !== groupId?.toString()
                );
                
                return {
                    groups: [...filtered],
                    selectedChat: (state.selectedChat?._id === groupId || 
                                state.selectedChat?._id?.toString() === groupId?.toString()) 
                        ? null 
                        : state.selectedChat
                };
            });
            
            await axiosInstance.delete(`/groups/${groupId}`);
            toast.success("Group deleted");
            
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete group");
        }
    },

    // Update group
    updateGroup: async (groupId, data) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}`, data);
            const updated = res.data && res.data.members && res.data.members.length > 0
              ? res.data
              : (await axiosInstance.get(`/groups/${groupId}`)).data;

            const groupObj = { ...updated, type: 'group' };
            set((state) => ({
                groups: state.groups.map(g => g._id === groupId ? groupObj : g),
                selectedChat: state.selectedChat?._id === groupId ? groupObj : state.selectedChat
            }));
            toast.success("Group updated");
        } catch (error) {
            toast.error(error.response?.data?.error);
        }
    },

    // socket subscribe
    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket?.off("newMessage");
        socket?.off("unreadCleared");
        socket?.off("typing");
        socket?.off("stopTyping");
        socket?.off("groupTyping");
        socket?.off("groupStopTyping");
        socket?.off("messageSeen");
        socket?.off("newGroup");
        socket?.off("groupDeleted");
        socket?.off("groupDeletedBroadcast");
        socket?.off("groupDeletedGlobal");
        socket?.off("addedToGroup");
        socket?.off("addedToGroupBroadcast");
        socket?.off("removedFromGroup");
        socket?.off("removedFromGroupBroadcast");
        socket?.off("leftGroup");
        socket?.off("leftGroupBroadcast");
        socket?.off("groupUpdated");
        socket?.off("groupUpdatedBroadcast");
       
        // new message
        socket.on("newMessage", (newMessage) => {
            const selectedChat = get().selectedChat;
            const myId = useAuthStore.getState().authUser?._id;
            const senderId = typeof newMessage.senderId === 'object' ? newMessage.senderId._id : newMessage.senderId;

            const iAmSender = senderId === myId;
            
            set((state) => {
                let newMessages = state.messages;
                let updatedGroups = state.groups;
                let updatedUsers = state.users;
                let updatedUnreadCounts = { ...state.unreadCounts };

                if (newMessage.groupId) {
                    // Group message
                    const isViewingThisGroup = selectedChat?.type === "group" && newMessage.groupId === selectedChat._id;
                    
                    if (isViewingThisGroup && !iAmSender) {
                        newMessages = [...state.messages, newMessage];
                        get().socket?.emit("clearUnread", { 
                            chatId: newMessage.groupId, 
                            type: "group" 
                        });
                        updatedUnreadCounts[newMessage.groupId] = 0;
                    }
                    
                    if (!isViewingThisGroup && !iAmSender) {
                        updatedUnreadCounts[newMessage.groupId] = (updatedUnreadCounts[newMessage.groupId] || 0) + 1;
                    }

                    updatedGroups = state.groups.map(group => 
                        group._id === newMessage.groupId
                        ? { ...group, lastMessageTime: newMessage.createdAt }
                        : group
                    );
                } else {
                    // 1v1 message
                    const senderIdLocal = typeof newMessage.senderId === 'object' ? newMessage.senderId._id : newMessage.senderId;
                    const receiverId = typeof newMessage.receiverId === 'object' ? newMessage.receiverId._id : newMessage.receiverId;
                    const otherUserId = iAmSender ? receiverId : senderIdLocal;
                    const isViewingThisChat = selectedChat?.type !== "group" && selectedChat?._id === otherUserId;

                    if (isViewingThisChat && !iAmSender) {
                        newMessages = [...state.messages, newMessage];
                        get().socket?.emit("clearUnread", { 
                            chatId: otherUserId, 
                            type: "user" 
                        });
                        updatedUnreadCounts[otherUserId] = 0;
                    }

                    if (!isViewingThisChat && !iAmSender) {
                        updatedUnreadCounts[otherUserId] = (updatedUnreadCounts[otherUserId] || 0) + 1;
                    }

                    updatedUsers = state.users.map(user => 
                        user._id === senderIdLocal || user._id === receiverId
                        ? { ...user, lastMessageTime: newMessage.createdAt }
                        : user
                    );
                }

                // Sort both arrays
                const sortedGroups = [...updatedGroups].sort((a, b) => {
                    const aTime = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
                    const bTime = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
                    return bTime - aTime;
                });

                const sortedUsers = [...updatedUsers].sort((a, b) => {
                    const aTime = new Date(a.lastMessageTime || a.updatedAt || 0).getTime();
                    const bTime = new Date(b.lastMessageTime || b.updatedAt || 0).getTime();
                    return bTime - aTime;
                });

                return {
                    messages: newMessages,
                    groups: sortedGroups,
                    users: sortedUsers,
                    unreadCounts: updatedUnreadCounts,
                    lastUpdate: Date.now()
                };
            });
        });

        // unread cleared
        socket.on("unreadCleared", ({ chatId }) => {
            set(state => {
                const newCounts = { ...state.unreadCounts };
                delete newCounts[chatId];
                return { unreadCounts: newCounts };
            });
        });

        // user typing
        socket.on("typing", ({ from, name }) => {
            set((state) => ({
                typingUsers: { 
                    ...state.typingUsers, 
                    [`user_${from}`]: name || "Someone"
                },
            }));
        });

        // user stop typing
        socket.on("stopTyping", ({ from }) => {
            set((state) => {
                const updated = { ...state.typingUsers };
                delete updated[`user_${from}`];
                return { typingUsers: updated };
            });
        });

        // group typing
        socket.on("groupTyping", ({ groupId, from, userName }) => {
            const selectedChat = get().selectedChat;
            if (selectedChat?.type === "group" && selectedChat._id === groupId) {
                set((state) => ({
                    typingUsers: { 
                        ...state.typingUsers, 
                        [`group_${groupId}_${from}`]: userName || "Someone" 
                    },
                }));
            }
        });

        // group stop typing
        socket.on("groupStopTyping", ({ groupId, from }) => {
            const selectedChat = get().selectedChat;
            if (selectedChat?.type === "group" && selectedChat._id === groupId) {
                set((state) => {
                    const updated = { ...state.typingUsers };
                    delete updated[`group_${groupId}_${from}`];
                    return { typingUsers: updated };
                });
            }
        });

        // message seen
        socket.on("messageSeen", ({ messageId }) => {
            set((state) => ({
                messages: state.messages.map(m =>
                    m._id === messageId ? { ...m, seen: true } : m
                ),
            }));    
        });

        // new group
        socket.on("newGroup", (newGroup) => {
    
            set((state) => {
                const exists = state.groups.some(g => g._id === newGroup._id);
                
                if (exists) {
                    return state;
                }
                
                return {
                    groups: [...state.groups, { ...newGroup, type: 'group' }]
                };
            });
        });

        // group deleted
        socket.on("groupDeleted", ({ groupId }) => {
            
            set((state) => {
                const filtered = state.groups.filter(g => g._id !== groupId);
                
                return {
                    groups: filtered,
                    selectedChat: state.selectedChat?._id === groupId ? null : state.selectedChat
                };
            });
            
            toast.error("Group deleted by admin");
        });

        // global group deleted
        socket.on("groupDeletedGlobal", ({ groupId }) => {
            
            set((state) => ({
                groups: state.groups.filter(g => g._id !== groupId),
                selectedChat: state.selectedChat?._id === groupId ? null : state.selectedChat
            }));
        });
        
        // group deleted broadcast
        socket.on("groupDeletedBroadcast", ({ targetId, groupId }) => {
            const myId = useAuthStore.getState().authUser?._id;
            if (targetId === myId) {
                
                set((state) => ({
                    groups: state.groups.filter(g => g._id !== groupId),
                    selectedChat: state.selectedChat?._id === groupId ? null : state.selectedChat
                }));
            }
        });

        // added to group
        socket.on("addedToGroup", (group) => {
            set((state) => ({
                groups: [...state.groups, { ...group, type: 'group' }]
            }));
            toast.success(`Added to ${group.Name}`);
        });

        // added to group broadcast
        socket.on("addedToGroupBroadcast", ({ targetId, group }) => {
            const myId = useAuthStore.getState().authUser?._id;
            if (targetId === myId) {
                set((state) => ({
                    groups: [...state.groups, { ...group, type: 'group' }]
                }));
                toast.success(`Added to ${group.Name}`);
            }
        });

        // removed from group
        socket.on("removedFromGroup", ({ groupId }) => {
            set((state) => ({
                groups: state.groups.filter(g => g._id !== groupId),
                selectedChat: get().selectedChat?._id === groupId ? null : get().selectedChat
            }));
            toast.error("Removed from group");
        });

        // removed from group broadcast
        socket.on("removedFromGroupBroadcast", ({ targetId, groupId }) => {
            const myId = useAuthStore.getState().authUser?._id;
            if (targetId === myId) {
                set((state) => ({
                    groups: state.groups.filter(g => g._id !== groupId),
                    selectedChat: get().selectedChat?._id === groupId ? null : get().selectedChat
                }));
                toast.error("Removed from group");
            }
        });

        // left group
        socket.on("leftGroup", ({ groupId }) => {
            set((state) => ({
                groups: state.groups.filter(g => g._id !== groupId)
            }));
        });

        // left group broadcast
        socket.on("leftGroupBroadcast", ({ targetId, groupId }) => {
            const myId = useAuthStore.getState().authUser?._id;
            if (targetId === myId) {
                set((state) => ({
                    groups: state.groups.filter(g => g._id !== groupId),
                    selectedChat: get().selectedChat?._id === groupId ? null : get().selectedChat
                }));
            }
        });

        // group updated
        socket.on("groupUpdated", (updatedGroup) => {
            set((state) => {
                const updatedGroups = state.groups.map((g) =>
                g._id?.toString() === updatedGroup._id?.toString()
                    ? { ...g, ...updatedGroup, type: "group" }
                    : g
                );

                const current = state.selectedChat;
                const updatedSelected =
                current?.type === "group" &&
                current._id?.toString() === updatedGroup._id?.toString()
                    ? { ...current, ...updatedGroup, type: "group" }
                    : current;

                return {
                groups: updatedGroups,
                selectedChat: updatedSelected,
                };
            });
        });

        // group updated broadcast
        socket.on("groupUpdatedBroadcast", ({ targetId, group }) => {
            const authUser = useAuthStore.getState().authUser;
            const myId = authUser?._id?.toString();
            const target = targetId?.toString?.() ?? targetId;

            if (!myId || myId !== target) return;

            set((state) => {
                const updatedGroups = state.groups.map((g) => {
                    const gid = g._id?.toString();
                    const incomingId = group._id?.toString?.() ?? group._id;
                    if (gid === incomingId) {
                        return {
                            ...g,
                            ...group,
                            type: "group",
                        };
                    }
                    return g;
                });

                const current = state.selectedChat;
                let updatedSelected = current;

                if (
                    current?.type === "group" &&
                    current._id?.toString() === (group._id?.toString?.() ?? group._id)
                ) {
                    updatedSelected = {
                        ...current,
                        ...group,
                        type: "group",
                    };
                }

                return {
                    groups: updatedGroups,
                    selectedChat: updatedSelected,
                };
            });
        });
    },

    // socket unsubscribe
    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket?.off("newMessage");
        socket?.off("unreadCleared");
        socket?.off("typing");
        socket?.off("stopTyping");
        socket?.off("groupTyping");
        socket?.off("groupStopTyping");
        socket?.off("messageSeen");
        socket?.off("newGroup");
        socket?.off("groupDeleted");
        socket?.off("groupDeletedBroadcast");
        socket?.off("groupDeletedGlobal");
        socket?.off("addedToGroup");
        socket?.off("addedToGroupBroadcast");
        socket?.off("removedFromGroup");
        socket?.off("removedFromGroupBroadcast");
        socket?.off("leftGroup");
        socket?.off("leftGroupBroadcast");
        socket?.off("groupUpdated");
        socket?.off("groupUpdatedBroadcast");
    },
}))