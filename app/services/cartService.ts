// CartService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = "http://192.168.0.109:8000/api";

// API endpoints
export const API_ENDPOINTS = {
  // Cart endpoints
  CART: {
    GET_CART: `${API_URL}/cart`,
    ADD_TO_CART: `${API_URL}/cart`,
    UPDATE_CART_ITEM: (id: string) => `${API_URL}/cart/${id}`,
    REMOVE_CART_ITEM: (id: string) => `${API_URL}/cart/${id}`,
    CLEAR_CART: `${API_URL}/cart`,
  },
  // Order endpoints
  ORDERS: {
    CREATE_ORDER: `${API_URL}/orders`,
    GET_ORDERS: `${API_URL}/orders`,
    GET_ORDER: (id: string) => `${API_URL}/orders/${id}`,
    UPDATE_ORDER_STATUS: (id: string) => `${API_URL}/orders/${id}`,
  },
  // Product endpoints
  PRODUCTS: {
    GET_PRODUCTS: `${API_URL}/products`,
    GET_PRODUCT: (id: string) => `${API_URL}/products/${id}`,
    CREATE_PRODUCT: `${API_URL}/products`,
    UPDATE_PRODUCT: (id: string) => `${API_URL}/products/${id}`,
    DELETE_PRODUCT: (id: string) => `${API_URL}/products/${id}`,
  },
  // Store endpoints
  STORES: {
    GET_STORES: `${API_URL}/stores`,
    GET_STORE: (id: string) => `${API_URL}/stores/${id}`,
    GET_STORE_PRODUCTS: (id: string) => `${API_URL}/stores/${id}/products`,
  },
};

// Generate a UUID v4 (simplified version)
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Interfaces
export interface CartItem {
  id: string;
  productId: string;
  storeId: string;
  name: string;
  price: string;
  quantity: number;
  image?: string | null;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: string;
  category: string;
  isPopular: boolean;
  isFeatured: boolean;
  image?: string | null;
}

export class CartService {
  // Get cart items
  static async getCart(): Promise<CartItem[]> {
    try {
      // Try from backend first
      try {
        const response = await axios.get(API_ENDPOINTS.CART.GET_CART);
        return response.data;
      } catch (error) {
        // Fallback to local storage if API fails
        console.log("Falling back to local storage for cart");
        const storedCart = await AsyncStorage.getItem("cart");
        if (storedCart) {
          return JSON.parse(storedCart);
        }
        return [];
      }
    } catch (error) {
      console.error("Failed to get cart:", error);
      return [];
    }
  }

  // Add item to cart
  static async addToCart(
    product: Product,
    quantity: number = 1
  ): Promise<CartItem[]> {
    try {
      // Generate a unique cart item ID
      const cartItemId = generateUUID();

      const cartItem: CartItem = {
        id: cartItemId,
        productId: product.id,
        storeId: product.storeId,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image || null,
      };

      // Get current cart
      const currentCart = await this.getCart();

      // Check if product already exists in cart
      const existingItemIndex = currentCart.findIndex(
        (item) => item.productId === product.id
      );

      let updatedCart: CartItem[];

      if (existingItemIndex >= 0) {
        // Update quantity if product already in cart
        updatedCart = currentCart.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item to cart
        updatedCart = [...currentCart, cartItem];
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

      // When backend is ready, use this:
      try {
        await axios.post(API_ENDPOINTS.CART.ADD_TO_CART, cartItem);
      } catch (error) {
        console.log("Couldn't sync with backend, using local storage only");
      }

      return updatedCart;
    } catch (error) {
      console.error("Failed to add to cart:", error);
      throw error;
    }
  }

  // Update cart item quantity
  static async updateCartItem(
    cartItemId: string,
    quantity: number
  ): Promise<CartItem[]> {
    try {
      if (quantity < 1) {
        return this.removeCartItem(cartItemId);
      }

      // Get current cart
      const currentCart = await this.getCart();

      // Update the item quantity
      const updatedCart = currentCart.map((item) =>
        item.id === cartItemId ? { ...item, quantity: quantity } : item
      );

      // Save to AsyncStorage
      await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

      // When backend is ready
      try {
        await axios.put(API_ENDPOINTS.CART.UPDATE_CART_ITEM(cartItemId), {
          quantity,
        });
      } catch (error) {
        console.log("Couldn't sync with backend, using local storage only");
      }

      return updatedCart;
    } catch (error) {
      console.error("Failed to update cart item:", error);
      throw error;
    }
  }

  // Remove item from cart
  static async removeCartItem(cartItemId: string): Promise<CartItem[]> {
    try {
      // Get current cart
      const currentCart = await this.getCart();

      // Remove the item
      const updatedCart = currentCart.filter((item) => item.id !== cartItemId);

      // Save to AsyncStorage
      await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

      // When backend is ready
      try {
        await axios.delete(API_ENDPOINTS.CART.REMOVE_CART_ITEM(cartItemId));
      } catch (error) {
        console.log("Couldn't sync with backend, using local storage only");
      }

      return updatedCart;
    } catch (error) {
      console.error("Failed to remove cart item:", error);
      throw error;
    }
  }

  // Clear entire cart
  static async clearCart(): Promise<void> {
    try {
      // Clear from AsyncStorage
      await AsyncStorage.removeItem("cart");

      // When backend is ready
      try {
        await axios.delete(API_ENDPOINTS.CART.CLEAR_CART);
      } catch (error) {
        console.log("Couldn't sync with backend, using local storage only");
      }
    } catch (error) {
      console.error("Failed to clear cart:", error);
      throw error;
    }
  }

  // Calculate cart totals
  static calculateCartTotals(items: CartItem[]) {
    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    // You can adjust these rates as needed
    const taxRate = 0.08; // 8% tax
    const deliveryFee = items.length > 0 ? 3.99 : 0;

    const tax = subtotal * taxRate;
    const total = subtotal + tax + deliveryFee;

    return {
      subtotal,
      tax,
      deliveryFee,
      total,
    };
  }
}
