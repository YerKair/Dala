// /(tabs)/marketplace/utils/apiService.ts
import axios from "axios";
import { useAuth } from "../../../auth/AuthContext";

// API Base URL - измените на ваш реальный URL бэкенда
const API_BASE_URL = "http://192.168.0.117:8000/api";

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
  private token: string | null;

  constructor(token: string | null) {
    this.token = token;
  }

  // Метод для получения заголовков с токеном авторизации
  private getHeaders(contentType: string = "application/json") {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": contentType,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // ПРОДУКТЫ

  // Получение списка продуктов
  async getProducts(
    page = 1,
    categoryFilter = "",
    seller_id?: string | number
  ) {
    try {
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
      console.error("Failed to load products:", error);
      throw error;
    }
  }

  // Получение одного продукта по ID
  async getProduct(id: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to load product ${id}:`, error);
      throw error;
    }
  }

  // Получение информации о магазине по ID
  async getStore(id: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/restaurants/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to load store ${id}:`, error);
      throw error;
    }
  }

  // Получение списка ресторанов/магазинов
  async getRestaurants() {
    try {
      const response = await axios.get(`${API_BASE_URL}/restaurants`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error("Failed to load restaurants:", error);
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
      const response = await axios.delete(`${API_BASE_URL}/restaurants/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to delete restaurant ${id}:`, error);
      throw error;
    }
  }

  // КАТЕГОРИИ

  // Получение списка категорий
  async getCategories() {
    try {
      console.log("[API] Sending request to get categories");
      console.log("[API] URL:", `${API_BASE_URL}/categories`);
      console.log("[API] Headers:", this.getHeaders());

      // Проверяем токен перед запросом
      if (!this.token) {
        console.warn(
          "[API] Warning: No auth token available for categories request"
        );
      } else {
        console.log("[API] Using auth token for categories request");
      }

      const response = await axios.get(`${API_BASE_URL}/categories`, {
        headers: this.getHeaders(),
      });

      console.log("[API] Categories response status:", response.status);
      console.log("[API] Categories data count:", response.data.length);

      return response.data;
    } catch (error: any) {
      console.error("Failed to load categories:", error);

      // Подробная информация об ошибке
      if (error.response) {
        // Ответ сервера получен, но с ошибкой
        console.error("[API] Server error:", error.response.status);
        console.error("[API] Error data:", error.response.data);
        console.error("[API] Response headers:", error.response.headers);
      } else if (error.request) {
        // Запрос был сделан, но ответ не получен
        console.error("[API] No response from server:", error.request);
      } else {
        // Что-то произошло во время настройки запроса
        console.error("[API] Request error:", error.message);
      }

      // Возвращаем пустой массив вместо ошибки
      return [];
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
}

// Хук для использования API с текущим токеном из контекста
export function useApi() {
  const { token } = useAuth();
  return new ApiService(token);
}

// Также экспортируем статические методы для авторизации
export const authApi = {
  login: ApiService.login,
  register: ApiService.register,
};
