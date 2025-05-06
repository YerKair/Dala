// OrderService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_ENDPOINTS, CartItem } from "./cartService";

// Generate a UUID v4 (simplified version)
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Interfaces
export interface Address {
  street: string;
  apartment: string;
  city: string;
  postalCode: string;
  instructions: string;
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

export interface OrderDeliveryInfo {
  isPickup: boolean;
  address?: Address;
  pickupPointId?: string;
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
  cardName?: string;
}

export interface Order {
  id: string;
  customerId?: string;
  items: CartItem[];
  deliveryInfo: OrderDeliveryInfo;
  contactInfo: OrderContactInfo;
  paymentMethod: PaymentMethod;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "canceled";
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  estimatedDeliveryTime?: string;
  trackingInfo?: {
    driverId?: string;
    driverName?: string;
    driverPhone?: string;
    driverLocation?: {
      latitude: number;
      longitude: number;
    };
    fromLocation?: {
      latitude: number;
      longitude: number;
    };
    toLocation?: {
      latitude: number;
      longitude: number;
    };
  };
}

export class OrderService {
  // Create new order
  static async createOrder(
    items: CartItem[],
    deliveryInfo: OrderDeliveryInfo,
    contactInfo: OrderContactInfo,
    paymentMethod: PaymentMethod,
    totals: {
      subtotal: number;
      tax: number;
      deliveryFee: number;
      total: number;
    }
  ): Promise<Order> {
    try {
      const orderId = generateUUID();
      const now = new Date().toISOString();

      const order: Order = {
        id: orderId,
        items: items,
        deliveryInfo: deliveryInfo,
        contactInfo: contactInfo,
        paymentMethod: paymentMethod,
        status: "pending",
        subtotal: totals.subtotal,
        tax: totals.tax,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        createdAt: now,
      };

      // Save order to local storage
      const existingOrders = await this.getOrders();
      const updatedOrders = [order, ...existingOrders];
      await AsyncStorage.setItem("orders", JSON.stringify(updatedOrders));

      // Save delivery address information for tracking
      const fromAddress = deliveryInfo.isPickup
        ? (await this.getPickupPoint(deliveryInfo.pickupPointId!)).address
        : "Store Location";

      const toAddress = deliveryInfo.isPickup
        ? "Customer Pickup"
        : `${deliveryInfo.address?.street}${
            deliveryInfo.address?.apartment
              ? `, ${deliveryInfo.address.apartment}`
              : ""
          }, ${deliveryInfo.address?.city}, ${
            deliveryInfo.address?.postalCode
          }`;

      // Default coordinates (should be replaced with real geocoding)
      const fromCoords = {
        latitude: 43.235,
        longitude: 76.909,
      };

      const toCoords = {
        latitude: 43.258,
        longitude: 76.945,
      };

      // Save route info for tracking
      await AsyncStorage.setItem("deliveryFrom", fromAddress);
      await AsyncStorage.setItem("deliveryTo", toAddress);
      await AsyncStorage.setItem("fromCoords", JSON.stringify(fromCoords));
      await AsyncStorage.setItem("toCoords", JSON.stringify(toCoords));

      // When backend is ready
      try {
        const response = await axios.post(
          API_ENDPOINTS.ORDERS.CREATE_ORDER,
          order
        );
        return response.data;
      } catch (error) {
        console.log("Couldn't sync with backend, using local storage only");
      }

      return order;
    } catch (error) {
      console.error("Failed to create order:", error);
      throw error;
    }
  }

  // Get all orders
  static async getOrders(): Promise<Order[]> {
    try {
      // Try from backend first
      try {
        const response = await axios.get(API_ENDPOINTS.ORDERS.GET_ORDERS);
        return response.data;
      } catch (error) {
        // Fallback to local storage
        console.log("Falling back to local storage for orders");
        const storedOrders = await AsyncStorage.getItem("orders");
        if (storedOrders) {
          return JSON.parse(storedOrders);
        }
        return [];
      }
    } catch (error) {
      console.error("Failed to get orders:", error);
      return [];
    }
  }

  // Get order by ID
  static async getOrderById(orderId: string): Promise<Order | null> {
    try {
      // Try from backend first
      try {
        const response = await axios.get(
          API_ENDPOINTS.ORDERS.GET_ORDER(orderId)
        );
        return response.data;
      } catch (error) {
        // Fallback to local storage
        console.log("Falling back to local storage for order details");
        const orders = await this.getOrders();
        return orders.find((order) => order.id === orderId) || null;
      }
    } catch (error) {
      console.error(`Failed to get order ${orderId}:`, error);
      return null;
    }
  }

  // Get pickup points
  static async getPickupPoints(): Promise<PickupPoint[]> {
    // For demo purposes, return hardcoded pickup points
    // In a real app, this would come from the backend
    return [
      {
        id: "pp1",
        name: "Manasa Store",
        address: "Manasa St, 34/1, Almaty",
        coords: { latitude: 43.235, longitude: 76.909 },
      },
      {
        id: "pp2",
        name: "Central Market",
        address: "Zenkov St, 24, Almaty",
        coords: { latitude: 43.255, longitude: 76.935 },
      },
      {
        id: "pp3",
        name: "Mega Center",
        address: "Rozybakiev St, 263, Almaty",
        coords: { latitude: 43.222, longitude: 76.891 },
      },
    ];
  }

  // Get pickup point by ID
  static async getPickupPoint(id: string): Promise<PickupPoint> {
    const points = await this.getPickupPoints();
    const point = points.find((p) => p.id === id);

    if (!point) {
      throw new Error(`Pickup point with ID ${id} not found`);
    }

    return point;
  }

  // Get saved payment methods
  static async getSavedPaymentMethods(): Promise<PaymentMethod[]> {
    // For demo purposes, return hardcoded payment methods
    // In a real app, this would come from the backend
    return [
      {
        id: "pm1",
        type: "CARD",
        cardNumber: "**** **** **** 4242",
        cardExpiry: "09/25",
        cardName: "John Doe",
      },
    ];
  }

  // Update order status
  static async updateOrderStatus(
    orderId: string,
    status: Order["status"]
  ): Promise<Order> {
    try {
      const orders = await this.getOrders();
      const updatedOrders = orders.map((order) =>
        order.id === orderId ? { ...order, status } : order
      );

      await AsyncStorage.setItem("orders", JSON.stringify(updatedOrders));

      // When backend is ready
      try {
        const response = await axios.patch(
          API_ENDPOINTS.ORDERS.UPDATE_ORDER_STATUS(orderId),
          { status }
        );
        return response.data;
      } catch (error) {
        console.log("Couldn't sync with backend, using local storage only");
      }

      const updatedOrder = updatedOrders.find((o) => o.id === orderId);
      if (!updatedOrder) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      return updatedOrder;
    } catch (error) {
      console.error(`Failed to update order status for ${orderId}:`, error);
      throw error;
    }
  }
}
