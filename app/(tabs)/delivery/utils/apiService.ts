// /(tabs)/marketplace/utils/apiService.ts
import axios from "axios";
import { useAuth } from "../../../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

// API Base URL - измените на ваш реальный URL бэкенда
const API_BASE_URL = "http://192.168.0.109:8000/api";

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Класс для работы с API, который принимает токен
export class ApiService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    try {
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }
      this.token = token;
    } catch (error) {
      console.error("Error loading token:", error);
    }
  }

  private async ensureToken() {
    if (!this.token) {
      await this.loadToken();
    }
    return this.token;
  }

  private getHeaders(contentType?: string) {
    return {
      Accept: "application/json",
      "Content-Type": contentType || "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private async handleAuthError() {
    // Clear tokens from storage
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userToken");
    this.token = null;

    // Redirect to login
    router.push("/auth/login");
  }

  // ПРОДУКТЫ

  // Получение списка продуктов
  async getProducts(
    page = 1,
    categoryFilter = "",
    seller_id?: string | number
  ) {
    try {
      await this.ensureToken();

      let url = `${API_BASE_URL}/products?page=${page}`;

      if (seller_id) {
        url += `&seller_id=${seller_id}`;
      }

      if (categoryFilter) {
        url += categoryFilter;
      }

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error("Необходима авторизация");
      }
      console.error("Failed to load products:", error);
      throw error;
    }
  }

  // Получение одного продукта по ID
  async getProduct(id: string) {
    try {
      await this.ensureToken();

      const response = await axios.get(`${API_BASE_URL}/products/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error("Необходима авторизация");
        }
        throw new Error(
          error.response?.data?.message || `Ошибка загрузки продукта ${id}`
        );
      }
      console.error(`Failed to load product ${id}:`, error);
      throw error;
    }
  }

  // Получение информации о магазине по ID
  async getStore(id: string) {
    try {
      await this.ensureToken();

      console.log("[API] Getting store details for ID:", id);
      const url = `${API_BASE_URL}/restaurants/${id}`;
      console.log("[API] Request URL:", url);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log("[API] Store response status:", response.status);
      return response.data;
    } catch (error: any) {
      console.error(`[API] Failed to load store ${id}. Error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      if (error.response?.status === 404) {
        throw new Error(`Store with ID ${id} not found`);
      }

      if (error.response?.status === 401) {
        await this.handleAuthError();
        throw new Error("Необходима авторизация");
      }

      if (!error.response) {
        throw new Error(
          "Network error. Please check your internet connection."
        );
      }

      throw new Error(
        error.response?.data?.message || `Failed to load store ${id}`
      );
    }
  }

  // Получение списка ресторанов/магазинов
  async getRestaurants() {
    try {
      await this.ensureToken(); // Refresh token before request

      console.log(
        "[API] Getting restaurants with token:",
        this.token ? "Token present" : "No token"
      );
      console.log("[API] Request URL:", `${API_BASE_URL}/restaurants`);
      console.log("[API] Request headers:", this.getHeaders());

      const response = await axios.get(`${API_BASE_URL}/restaurants`, {
        headers: this.getHeaders(),
      });

      console.log("[API] Restaurants response status:", response.status);
      console.log("[API] Restaurants response data:", response.data);

      return response.data;
    } catch (error: any) {
      console.error("[API] Failed to load restaurants. Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });

      if (error.response?.status === 401) {
        console.log("[API] Unauthorized access, redirecting to login");
        await this.handleAuthError();
        return [];
      }

      if (error.response?.status === 500) {
        console.error("[API] Server error response:", error.response?.data);
        // В случае ошибки 500 возвращаем пустой массив и позволяем приложению использовать демо-данные
        return [];
      }

      throw error;
    }
  }

  // Создание нового продукта
  async createProduct(productData: FormData) {
    try {
      // Логирование данных запроса
      console.log("[API] Отправка запроса на создание продукта");
      console.log("[API] URL:", `${API_BASE_URL}/products`);
      console.log("[API] Заголовки:", this.getHeaders("multipart/form-data"));

      // Логирование FormData для отладки
      console.log("[API] FormData fields:");
      for (const pair of Array.from(productData.entries())) {
        // Не логируем содержимое файлов, только их наличие
        if (typeof pair[1] === "object") {
          console.log(`[API] ${pair[0]}: [File object]`);
        } else {
          console.log(`[API] ${pair[0]}: ${pair[1]}`);
        }
      }

      const response = await axios.post(
        `${API_BASE_URL}/products`,
        productData,
        {
          headers: this.getHeaders("multipart/form-data"),
        }
      );

      console.log("[API] Успешный ответ:", response.status);
      return response.data;
    } catch (error: any) {
      console.error("Failed to create product:", error);

      // Подробная информация об ошибке
      if (error.response) {
        // Ответ сервера получен, но с ошибкой
        console.error("[API] Ошибка сервера:", error.response.status);
        console.error("[API] Данные ошибки:", error.response.data);
        console.error("[API] Заголовки ответа:", error.response.headers);
      } else if (error.request) {
        // Запрос был сделан, но ответ не получен
        console.error("[API] Нет ответа от сервера:", error.request);
      } else {
        // Что-то произошло во время настройки запроса
        console.error("[API] Ошибка запроса:", error.message);
      }

      throw error;
    }
  }

  // Обновление продукта
  async updateProduct(id: string, productData: FormData) {
    try {
      // Laravel требует _method=PUT для form-data запросов
      productData.append("_method", "PUT");

      // Логирование данных запроса
      console.log("[API] Отправка запроса на обновление продукта");
      console.log("[API] URL:", `${API_BASE_URL}/products/${id}`);

      // Логирование FormData для отладки
      console.log("[API] FormData fields:");
      for (const pair of Array.from(productData.entries())) {
        // Не логируем содержимое файлов, только их наличие
        if (typeof pair[1] === "object") {
          console.log(`[API] ${pair[0]}: [File object]`);
        } else {
          console.log(`[API] ${pair[0]}: ${pair[1]}`);
        }
      }

      const response = await axios.post(
        `${API_BASE_URL}/products/${id}`,
        productData,
        {
          headers: this.getHeaders("multipart/form-data"),
        }
      );

      console.log("[API] Успешное обновление:", response.status);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update product ${id}:`, error);

      // Подробная информация об ошибке
      if (error.response) {
        // Ответ сервера получен, но с ошибкой
        console.error("[API] Ошибка сервера:", error.response.status);
        console.error("[API] Данные ошибки:", error.response.data);
        console.error("[API] Заголовки ответа:", error.response.headers);
      } else if (error.request) {
        // Запрос был сделан, но ответ не получен
        console.error("[API] Нет ответа от сервера:", error.request);
      } else {
        // Что-то произошло во время настройки запроса
        console.error("[API] Ошибка запроса:", error.message);
      }

      throw error;
    }
  }

  // Удаление продукта
  async deleteProduct(id: string) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/products/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to delete product ${id}:`, error);
      throw error;
    }
  }

  // Удаление ресторана
  async deleteRestaurant(id: string) {
    try {
      await this.ensureToken(); // Refresh token before request
      const response = await axios.delete(`${API_BASE_URL}/restaurants/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.handleAuthError();
        return null;
      }
      console.error(`Failed to delete restaurant ${id}:`, error);
      throw error;
    }
  }

  // КАТЕГОРИИ

  // Получение списка категорий
  async getCategories() {
    try {
      await this.ensureToken();

      const response = await axios.get(`${API_BASE_URL}/categories`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error("Необходима авторизация");
      }
      console.error("Failed to load categories:", error);
      throw error;
    }
  }

  // АВТОРИЗАЦИЯ

  // Вход в систему
  static async login(email: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // Регистрация
  static async register(userData: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone?: string;
  }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, userData);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  // Выход
  async logout() {
    try {
      await axios.post(
        `${API_BASE_URL}/logout`,
        {},
        {
          headers: this.getHeaders(),
        }
      );
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  // Создание нового ресторана
  async createRestaurant(data: any) {
    try {
      await this.ensureToken();

      console.log("[API] Creating restaurant with data:", {
        ...data,
        image: data.image ? "Image data present" : "No image",
      });

      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === "image" && data[key]) {
          formData.append("image", {
            uri: data[key],
            type: "image/jpeg",
            name: "restaurant_image.jpg",
          } as any);
        } else {
          formData.append(key, String(data[key]));
        }
      });

      const response = await axios.post(
        `${API_BASE_URL}/restaurants`,
        formData,
        {
          headers: {
            ...this.getHeaders("multipart/form-data"),
            Accept: "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("[API] Restaurant creation response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[API] Restaurant creation error details:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.code === "ECONNABORTED") {
        throw new Error(
          "Превышено время ожидания запроса. Пожалуйста, проверьте подключение к интернету."
        );
      }

      if (!error.response) {
        throw new Error(
          "Не удалось подключиться к серверу. Пожалуйста, проверьте подключение к интернету."
        );
      }

      if (error.response?.status === 401) {
        await this.handleAuthError();
        throw new Error("Требуется авторизация");
      }

      if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors;
        const errorMessage = Object.values(validationErrors).flat().join("\n");
        throw new Error(errorMessage || "Ошибка валидации данных");
      }

      throw new Error(
        error.response?.data?.message || "Не удалось создать ресторан"
      );
    }
  }

  // Обновление ресторана
  async updateRestaurant(id: string, data: any) {
    try {
      await this.ensureToken();

      console.log("[API] Updating restaurant", id, "with data:", {
        ...data,
        image: data.image ? "Image data present" : "No image",
      });

      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === "image" && data[key]) {
          formData.append("image", {
            uri: data[key],
            type: "image/jpeg",
            name: "restaurant_image.jpg",
          } as any);
        } else {
          formData.append(key, String(data[key]));
        }
      });
      formData.append("_method", "PUT"); // Для Laravel

      const response = await axios.post(
        `${API_BASE_URL}/restaurants/${id}`,
        formData,
        {
          headers: {
            ...this.getHeaders("multipart/form-data"),
            Accept: "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("[API] Restaurant update response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[API] Restaurant update error details:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.code === "ECONNABORTED") {
        throw new Error(
          "Превышено время ожидания запроса. Пожалуйста, проверьте подключение к интернету."
        );
      }

      if (!error.response) {
        throw new Error(
          "Не удалось подключиться к серверу. Пожалуйста, проверьте подключение к интернету."
        );
      }

      if (error.response?.status === 401) {
        await this.handleAuthError();
        throw new Error("Требуется авторизация");
      }

      if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors;
        const errorMessage = Object.values(validationErrors).flat().join("\n");
        throw new Error(errorMessage || "Ошибка валидации данных");
      }

      throw new Error(
        error.response?.data?.message || "Не удалось обновить ресторан"
      );
    }
  }
}

// Хук для использования API с текущим токеном из контекста
export function useApi() {
  const { token } = useAuth();
  return new ApiService();
}

// Также экспортируем статические методы для авторизации
export const authApi = {
  login: ApiService.login,
  register: ApiService.register,
};
