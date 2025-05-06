// app/services/apiService.ts
import { User } from "../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.0.117:8000/api";
// Adding 192.168.0.117 API for development
const LOCAL_API_URL = "http://192.168.0.117:3000/api";

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
}

export interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
}

// Login user
// В функции loginUser в apiService.ts
export const loginUser = async (
  phoneNumber: string,
  password: string
): Promise<ApiResponse<LoginResponse>> => {
  try {
    // Форматируем номер телефона для точного соответствия ожиданиям API
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;

    console.log(`Отправка данных на сервер:`, {
      phone: formattedPhone,
      password: "***", // скрыто для безопасности
    });

    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        phone: formattedPhone,
        password: password,
      }),
    });

    const responseText = await response.text();
    console.log(`Статус ответа: ${response.status}`);
    console.log(`Текст ответа: ${responseText}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Не удалось распарсить JSON:", e);
      return {
        success: false,
        error: "Invalid server response format",
      };
    }

    if (!response.ok) {
      console.error("Ошибка входа:", data);
      return {
        success: false,
        error: data.message || `Status code: ${response.status}`,
      };
    }

    return {
      success: true,
      data: data as LoginResponse,
    };
  } catch (error) {
    console.error("Ошибка сети:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

// Register user
export const registerUser = async (
  userData: RegisterData
): Promise<ApiResponse<RegisterResponse>> => {
  try {
    console.log("Отправляемые данные регистрации:", userData);

    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(userData),
    });

    const responseText = await response.text();
    console.log(`Статус ответа: ${response.status}`);
    console.log(`Текст ответа: ${responseText}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Не удалось распарсить JSON:", e);
      return {
        success: false,
        error: "Invalid server response format",
      };
    }

    if (!response.ok) {
      console.error("Ошибка регистрации:", data);
      return {
        success: false,
        error: data.message || `Status code: ${response.status}`,
      };
    }

    return {
      success: true,
      data: data as RegisterResponse,
    };
  } catch (error) {
    console.error("Ошибка сети:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

// Logout user
export const logoutUser = async (token: string): Promise<ApiResponse<null>> => {
  try {
    const response = await fetch(`${API_URL}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        error: data.message || "Logout failed",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Ошибка при выходе:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

// Update user roles - using AsyncStorage instead of API
export const updateUserRole = async (
  userId: number,
  role: string,
  token: string
): Promise<ApiResponse<User>> => {
  try {
    console.log(
      `Updating user role to ${role} for user ${userId} using AsyncStorage`
    );

    // Get current user data from AsyncStorage
    const userData = await AsyncStorage.getItem("userData");
    if (!userData) {
      return {
        success: false,
        error: "User data not found in local storage",
      };
    }

    // Parse user data and update role
    const user: User = JSON.parse(userData);
    user.role = role;

    // Save updated user data back to AsyncStorage
    await AsyncStorage.setItem("userData", JSON.stringify(user));

    console.log("User role updated in AsyncStorage:", user);

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error("Error updating user role in AsyncStorage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Storage error occurred",
    };
  }
};
