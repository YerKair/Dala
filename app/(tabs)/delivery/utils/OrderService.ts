// services/OrderService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { CartItem } from "./cartService";

const API_BASE_URL = "http://192.168.0.113:8000/api";

// Types
export interface Address {
  street: string;
  apartment: string;
  city: string;
  postalCode: string;
  instructions: string;
}

export interface OrderDeliveryInfo {
  isPickup: boolean;
  pickupPointId?: string;
  address?: Address;
  contactlessDelivery?: boolean;
}

export interface OrderContactInfo {
  name: string;
  phone: string;
}

export interface PaymentMethod {
  id: string;
  type: "CARD" | "CASH";
  cardNumber?: string;
  cardExpiry?: string;
}

export interface OrderTotals {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
}

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

export interface Order {
  id: string;
  items: CartItem[];
  deliveryInfo: OrderDeliveryInfo;
  contactInfo: OrderContactInfo;
  paymentMethod: PaymentMethod;
  totals: OrderTotals;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "DELIVERING" | "DELIVERED";
  createdAt: string;
}

export class OrderService {
  // Create a new order
  static async createOrder(
    items: CartItem[],
    deliveryInfo: OrderDeliveryInfo,
    contactInfo: OrderContactInfo,
    paymentMethod: PaymentMethod,
    totals: OrderTotals
  ): Promise<Order> {
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("No authentication token");
      }

      const orderData = {
        items,
        deliveryInfo,
        contactInfo,
        paymentMethod,
        totals,
      };

      // API call to create order
      const response = await axios.post(`${API_BASE_URL}/orders`, orderData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      // Return the created order
      return response.data;
    } catch (error) {
      console.error("Failed to create order:", error);
      throw error;
    }
  }

  // Get order by ID
  static async getOrderById(id: string): Promise<Order | null> {
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("No authentication token");
      }

      // API call to get order
      const response = await axios.get(`${API_BASE_URL}/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      // Return the order
      return response.data;
    } catch (error) {
      console.error(`Failed to get order ${id}:`, error);

      // If order ID exists in local storage, return that instead
      try {
        const storedOrder = await AsyncStorage.getItem(`order_${id}`);
        if (storedOrder) {
          return JSON.parse(storedOrder);
        }
      } catch (storageError) {
        console.error("Failed to retrieve order from storage:", storageError);
      }

      return null;
    }
  }

  // Get all orders for the current user
  static async getOrders(): Promise<Order[]> {
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("No authentication token");
      }

      // API call to get all orders
      const response = await axios.get(`${API_BASE_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      // Return all orders
      return response.data;
    } catch (error) {
      console.error("Failed to get orders:", error);
      return [];
    }
  }

  // Get available pickup points
  static async getPickupPoints(): Promise<PickupPoint[]> {
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("No authentication token");
      }

      // API call to get pickup points
      const response = await axios.get(`${API_BASE_URL}/pickup-points`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Failed to get pickup points:", error);

      // Return sample pickup points as fallback
      return [
        {
          id: "pickup1",
          name: "Downtown Store",
          address: "123 Main St, Downtown",
          coords: {
            latitude: 43.238,
            longitude: 76.889,
          },
        },
        {
          id: "pickup2",
          name: "Mall Location",
          address: "456 Shopping Ave, Mall Center",
          coords: {
            latitude: 43.245,
            longitude: 76.905,
          },
        },
        {
          id: "pickup3",
          name: "Suburb Store",
          address: "789 Quiet Rd, Suburbs",
          coords: {
            latitude: 43.225,
            longitude: 76.925,
          },
        },
      ];
    }
  }

  // Get available payment methods for the current user
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("No authentication token");
      }

      // API call to get payment methods
      const response = await axios.get(`${API_BASE_URL}/payment-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Failed to get payment methods:", error);

      // Return sample payment methods as fallback
      return [
        {
          id: "card1",
          type: "CARD",
          cardNumber: "**** **** **** 1234",
          cardExpiry: "12/25",
        },
        {
          id: "card2",
          type: "CARD",
          cardNumber: "**** **** **** 5678",
          cardExpiry: "10/26",
        },
      ];
    }
  }
}
