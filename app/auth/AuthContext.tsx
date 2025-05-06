import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { globalState, tripManager } from "../store/globalState";

// Define user type
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  email_verified_at: string | null;
  role: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

// Define auth context type
export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (userData: User, userToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: User, userToken: string) => Promise<boolean>;
  updateUserRole: (role: string) => Promise<boolean>;
  isAuthenticated: boolean;
}

// Create the auth context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => false,
  logout: async () => {},
  register: async () => false,
  updateUserRole: async () => false,
  isAuthenticated: false,
});

interface AuthProviderProps {
  children: ReactNode;
}

// Provider component that wraps the app
export const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check for stored user data on app load
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("userToken");
        const storedUserData = await AsyncStorage.getItem("userData");

        if (storedToken && storedUserData) {
          setToken(storedToken);
          setUser(JSON.parse(storedUserData));
        }
      } catch (error) {
        console.error("Error loading auth data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredData();
  }, []);

  // Login function
  const login = async (userData: User, userToken: string): Promise<boolean> => {
    try {
      await AsyncStorage.setItem("userToken", userToken);
      await AsyncStorage.setItem("userData", JSON.stringify(userData));

      // Reset and initialize the taxi state to prevent data leakage from previous sessions
      globalState.activeTaxiTrip = false;
      globalState.needsNewOrder = true;
      globalState.pickupCoordinates = null;
      globalState.destinationCoordinates = null;
      globalState.tripData = {
        isActive: false,
        startTime: null,
        endTime: null,
        tripDuration: 120,
        driverId: null,
        driverName: null,
        origin: null,
        destination: null,
        fare: null,
        status: null,
      };

      console.log("Taxi global state initialized for new user session");

      setUser(userData);
      setToken(userToken);

      return true;
    } catch (error) {
      console.error("Error storing auth data:", error);
      return false;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");

      // Reset all taxi-related data to prevent leakage between accounts
      if (typeof globalState !== "undefined") {
        // Import the necessary modules
        const { globalState, tripManager } = require("../store/globalState");

        // Reset the global state to prevent data leakage
        globalState.activeTaxiTrip = false;
        globalState.needsNewOrder = true;
        globalState.pickupCoordinates = null;
        globalState.destinationCoordinates = null;
        globalState.tripData = {
          isActive: false,
          startTime: null,
          endTime: null,
          tripDuration: 120,
          driverId: null,
          driverName: null,
          origin: null,
          destination: null,
          fare: null,
          status: null,
        };

        console.log(
          "Taxi global state reset during logout to prevent data leakage"
        );
      }

      setUser(null);
      setToken(null);

      console.log("User logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Update user role function
  const updateUserRole = async (role: string): Promise<boolean> => {
    try {
      if (!user) return false;

      // Update user data with new role
      const updatedUser = { ...user, role };

      // Save to AsyncStorage
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

      // Update state
      setUser(updatedUser);

      console.log("User role updated to:", role);
      return true;
    } catch (error) {
      console.error("Error updating user role:", error);
      return false;
    }
  };

  // Register function
  const register = async (
    userData: User,
    userToken: string
  ): Promise<boolean> => {
    try {
      await AsyncStorage.setItem("userToken", userToken);
      await AsyncStorage.setItem("userData", JSON.stringify(userData));

      setUser(userData);
      setToken(userToken);

      return true;
    } catch (error) {
      console.error("Error storing auth data:", error);
      return false;
    }
  };

  const authContextValue: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    register,
    updateUserRole,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
