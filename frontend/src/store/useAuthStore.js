import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore.js";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isDeletingAccount: false,
    onlineUsers: [],
    isCheckingAuth: true,
    socket: null,

    // check authentication
    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            set({authUser: res.data});
            get().connectSocket();
        } catch (error) {
            console.log(`Error in checkAuth: ${error}`);
            set({ authUser: null});
        } finally {
            set({ isCheckingAuth: false});
        }
    },

    // signup
    signup: async (data) => {
        set({ isSigningUp: true});
        try {
           const res =  await axiosInstance.post("/auth/signup", data);
           set({ authUser: res.data });
           toast.success("Account created successfully");
           get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false });
        }
    },

    // login
    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success("Logged in successfully");
            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isLoggingIn: false });
        }
    },

    // logout
    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            set({ authUser: null });
            toast.success("Logged out successfully");
            get().disconnectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    // update profile
    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({ authUser: res.data });
            toast.success("Profile updated successfully");
        } catch (error) {
            console.log(`Error in updateProfile: ${error}`);
            toast.error(error.response.data.message);
        } finally {
            set({ isUpdatingProfile: false });
        }
    },

    setAuthUser: (user) => set({ authUser: user }),

    // fetch current user
    fetchCurrentUser: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            set({ authUser: res.data });
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    },

    // socket connection
    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            query: { userId: authUser._id },
        });

        socket.connect();
        set({ socket });

        // ✅ FIXED: Subscribe to messages once when socket connects
        // Remove old listeners first, then add new ones
        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            
            // CRITICAL: Unsubscribe first to prevent duplicates
            useChatStore.getState().unsubscribeFromMessages();
            
            // Now subscribe with fresh listeners
            useChatStore.getState().subscribeToMessages();
        });

        // 🟢 Handle online users list
        socket.on("getOnlineUsers", (userIds) => {
            set({ onlineUsers: userIds });
        });

        // 🧹 Handle socket disconnection cleanup
        socket.on("disconnect", () => {
            console.log("Socket disconnected");
            // Clean up listeners when socket disconnects
            useChatStore.getState().unsubscribeFromMessages();
        });
    },

    // disconnect socket
    disconnectSocket: () => {
        const socket = get().socket;
        if (socket?.connected) {
            // Unsubscribe before disconnecting
            useChatStore.getState().unsubscribeFromMessages();
            socket.disconnect();
        }
    },
}));
