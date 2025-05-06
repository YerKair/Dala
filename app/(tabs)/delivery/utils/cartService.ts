import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError } from "axios";
import { router } from "expo-router";

const API_BASE_URL = "http://192.168.0.117:8000/api";

// Улучшенное логирование
const Logger = {
  log: (message: string, data?: any) => {
    console.log(`[CartService] ${message}`, data ? data : "");
  },
  error: (message: string, error?: any) => {
    console.error(`[CartService] ERROR: ${message}`, error ? error : "");
  },
  networkError: (error: AxiosError) => {
    console.error("[CartService] NETWORK ERROR:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
  },
};

// Функция генерации уникального ID
const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Product interface for adding to cart
export interface Product {
  id: string | number;
  name?: string;
  title?: string;
  description?: string;
  price: string;
  category?: string;
  storeId?: string;
  image?: string | null;
  images?: string | null;
  status?: string;
  isPopular?: boolean;
  isFeatured?: boolean;
}

// Cart item interface
export interface CartItem {
  id: string;
  productId: string | number;
  storeId?: string;
  name: string;
  price: string;
  quantity: number;
  product?: Product;
}

export class CartService {
  // Метод для получения токена с расширенным логированием
  static async getToken(): Promise<string> {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        Logger.error("No authentication token found");

        // Принудительный выход
        await this.logout();

        throw new Error("No authentication token");
      }

      // Безопасное логирование токена
      Logger.log(`Token retrieved (last 5 chars): ...${token.slice(-5)}`);
      return token;
    } catch (error) {
      Logger.error("Error retrieving token", error);

      // Принудительный выход
      await this.logout();

      throw error;
    }
  }

  // Logout метод для принудительного выхода
  static async logout(): Promise<void> {
    try {
      // Очистка хранилища
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");

      // Перенаправление на страницу входа
      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  // Fetch cart items from API or local storage
  static async getCart(): Promise<CartItem[]> {
    try {
      // Получаем токен
      const token = await this.getToken();

      // Fetch from API
      const response = await axios.get(`${API_BASE_URL}/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000, // 10 секунд таймаут
      });

      Logger.log("Cart retrieved from API", {
        cartItemsCount: response.data.cart?.length || 0,
      });

      return response.data.cart || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        Logger.networkError(error);

        // Если ошибка авторизации - принудительный выход
        if (error.response?.status === 401) {
          await this.logout();
        }
      } else {
        Logger.error("Failed to fetch cart from API", error);
      }

      // Fallback to AsyncStorage
      try {
        const storedCart = await AsyncStorage.getItem("cart");
        const localCart = storedCart ? JSON.parse(storedCart) : [];

        Logger.log("Falling back to local storage", {
          localCartItemsCount: localCart.length,
        });

        return localCart;
      } catch (storageError) {
        Logger.error("Error accessing local storage", storageError);
        return [];
      }
    }
  }

  // Add product to cart
  static async addToCart(
    product: Product,
    quantity: number = 1
  ): Promise<CartItem[]> {
    Logger.log("Attempting to add product to cart", {
      productId: product.id,
      productName: product.name || product.title,
      quantity,
    });

    try {
      // Получаем токен
      const token = await this.getToken();

      // Ensure product id is a string
      const productId = String(product.id);

      // Prepare request body
      const requestBody = {
        product_id: productId,
        quantity,
      };

      try {
        // API call to add item
        const response = await axios.post(
          `${API_BASE_URL}/cart/${productId}`,
          requestBody,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 10000, // 10 секунд таймаут
          }
        );

        Logger.log("Product added to cart via API", {
          apiResponse: response.data,
          cartItemsCount: response.data.cart?.length || 0,
        });

        // Return updated cart
        return response.data.cart || [];
      } catch (apiError) {
        if (axios.isAxiosError(apiError)) {
          Logger.networkError(apiError);

          // Если ошибка авторизации - принудительный выход
          if (apiError.response?.status === 401) {
            await this.logout();
          }
        } else {
          Logger.error("API Error adding to cart", apiError);
        }

        throw apiError;
      }
    } catch (error) {
      Logger.error("Failed to add to cart", error);

      // Fallback cart update in local storage
      try {
        const currentCart = await this.getCart();
        const existingItemIndex = currentCart.findIndex(
          (item) => String(item.productId) === String(product.id)
        );

        if (existingItemIndex !== -1) {
          currentCart[existingItemIndex].quantity += quantity;
          Logger.log("Updated existing cart item", {
            itemId: currentCart[existingItemIndex].id,
            newQuantity: currentCart[existingItemIndex].quantity,
          });
        } else {
          const newCartItem = {
            id: generateUniqueId(),
            productId: String(product.id),
            storeId: product.storeId || "",
            name: product.name || product.title || "Unnamed Product",
            price: product.price,
            quantity,
            product,
          };

          currentCart.push(newCartItem);

          Logger.log("Added new item to local cart", {
            newItemId: newCartItem.id,
            productName: newCartItem.name,
          });
        }

        await AsyncStorage.setItem("cart", JSON.stringify(currentCart));

        Logger.log("Local cart updated", {
          cartItemsCount: currentCart.length,
        });

        return currentCart;
      } catch (storageError) {
        Logger.error("Failed to update local cart", storageError);
        throw error;
      }
    }
  }
}
