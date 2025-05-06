// app/store/userStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  id: number | null;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  photo?: string | null;
}

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  loadUser: () => Promise<void>;
  clearUser: () => Promise<void>;
}

export const userStore = create<UserState>((set) => ({
  user: null,

  setUser: (user) => {
    set({ user });
    if (user) {
      AsyncStorage.setItem("user", JSON.stringify(user));
      if (user.id) {
        AsyncStorage.setItem("userId", user.id.toString());
      }
    }
  },

  loadUser: async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        set({ user: JSON.parse(userData) });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  },

  clearUser: async () => {
    try {
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("userId");
      set({ user: null });
    } catch (error) {
      console.error("Error clearing user data:", error);
    }
  },
}));
