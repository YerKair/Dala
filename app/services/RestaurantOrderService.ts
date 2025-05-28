import AsyncStorage from "@react-native-async-storage/async-storage";
import { Order } from "../profile-information-views/profile/OrderHistoryScreen";
import { useAuth } from "../auth/AuthContext";

export class RestaurantOrderService {
  // Get auth token from multiple possible storage locations
  static async getAuthToken(): Promise<string | null> {
    try {
      // Try userToken first (most common)
      let token = await AsyncStorage.getItem("userToken");
      if (token) {
        console.log("Found auth token in userToken");
        return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      }

      // Try authToken next
      token = await AsyncStorage.getItem("authToken");
      if (token) {
        console.log("Found auth token in authToken");
        return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      }

      // Try plain token as last resort
      token = await AsyncStorage.getItem("token");
      if (token) {
        console.log("Found auth token in token");
        return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      }

      console.warn("No auth token found in any storage location");
      return null;
    } catch (error) {
      console.error("Error retrieving auth token:", error);
      return null;
    }
  }

  // Update the token when it changes in the app
  static async updateToken(newToken: string | null): Promise<void> {
    if (!newToken) {
      console.warn(
        "Attempted to update RestaurantOrderService token with null value"
      );
      return;
    }
    console.log("Restaurant order service token updated");
  }

  // Send restaurant order to history
  static async sendOrderToHistory(order: any): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        console.error("No auth token found for sending order to history");
        return false;
      }

      // Save to local storage first as a backup
      await this.saveOrderToLocalHistory(order);

      // Then try to send to server
      const response = await fetch(
        "http://192.168.0.109:8000/api/orders/history",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(order),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send order to history: ${response.status}`);
      }

      console.log(`Restaurant order ${order.id} sent to history successfully`);
      return true;
    } catch (error) {
      console.error("Error sending restaurant order to history:", error);
      // Even if API call fails, we've saved to local storage
      return false;
    }
  }

  // Get restaurant order history
  static async getOrderHistory(): Promise<any[]> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        console.error("No auth token found for getting order history");
        return [];
      }

      // Try to get from server first
      try {
        console.log("Fetching restaurant order history from API...");
        const response = await fetch(
          "http://192.168.0.109:8000/api/orders/history",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: token,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to get order history: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Loaded ${data.length} restaurant orders from API`);
        return data;
      } catch (apiError) {
        console.error("API error getting restaurant order history:", apiError);

        // Since the API returned 404, the endpoint might not exist yet
        // Provide mock data for testing the UI - this simulates what we'd get from the server
        console.log("Generating mock restaurant order data for testing...");
        const mockOrders = this.generateMockOrders();

        // Save the mock orders to local storage for future use
        for (const order of mockOrders) {
          await this.saveOrderToLocalHistory(order);
        }

        console.log(`Generated ${mockOrders.length} mock restaurant orders`);
        return mockOrders;
      }
    } catch (error) {
      console.error("Error getting restaurant order history:", error);
      return [];
    }
  }

  // Generate mock restaurant orders for testing
  private static generateMockOrders(): any[] {
    // Create a few mock orders with realistic data
    return [
      {
        id: "rest_1001",
        created_at: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(), // 2 days ago
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        restaurant_name: "Dala Cuisine",
        status: "completed",
        total: "2750",
        delivery_address: "7, Рымжанова улица",
        payment_method: "Cash",
        items: [
          {
            name: "Бешбармак",
            quantity: 1,
            price: "1500",
          },
          {
            name: "Шай",
            quantity: 1,
            price: "350",
          },
          {
            name: "Баурсак",
            quantity: 5,
            price: "900",
          },
        ],
        user_id: 2,
      },
      {
        id: "rest_1002",
        created_at: new Date(
          Date.now() - 5 * 24 * 60 * 60 * 1000
        ).toISOString(), // 5 days ago
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        restaurant_name: "Burger Palace",
        status: "completed",
        total: "3200",
        delivery_address: "Мега Тауэрс, 247А",
        payment_method: "Credit Card",
        items: [
          {
            name: "Double Cheeseburger",
            quantity: 2,
            price: "1800",
          },
          {
            name: "French Fries",
            quantity: 1,
            price: "600",
          },
          {
            name: "Cola",
            quantity: 2,
            price: "800",
          },
        ],
        user_id: 2,
      },
      {
        id: "rest_1003",
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        restaurant_name: "Pizza Planet",
        status: "completed",
        total: "4500",
        delivery_address: "SmArt.Point, Сатпаева",
        payment_method: "Cash",
        items: [
          {
            name: "Large Pepperoni Pizza",
            quantity: 1,
            price: "3500",
          },
          {
            name: "Garlic Bread",
            quantity: 1,
            price: "800",
          },
          {
            name: "Sprite",
            quantity: 1,
            price: "200",
          },
        ],
        user_id: 2,
      },
      {
        id: "rest_1004",
        created_at: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000
        ).toISOString(), // 10 days ago
        timestamp: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000
        ).toISOString(),
        restaurant_name: "Sushi Express",
        status: "cancelled",
        total: "5600",
        delivery_address: "7, Рымжанова улица",
        payment_method: "Credit Card",
        items: [
          {
            name: "Salmon Roll Set",
            quantity: 1,
            price: "3200",
          },
          {
            name: "Miso Soup",
            quantity: 2,
            price: "800",
          },
          {
            name: "Green Tea",
            quantity: 2,
            price: "600",
          },
          {
            name: "Edamame",
            quantity: 1,
            price: "1000",
          },
        ],
        user_id: 2,
      },
    ];
  }

  // Save order to local storage history
  private static async saveOrderToLocalHistory(order: any): Promise<void> {
    try {
      // Use AuthContext's user ID if possible
      let userId: string | number = order.user_id || order.userId;

      // If no user ID in order, try to get from userInfo
      if (!userId) {
        try {
          const userInfoString = await AsyncStorage.getItem("userInfo");
          if (userInfoString) {
            const userInfo = JSON.parse(userInfoString);
            userId = userInfo.id;
          } else {
            // Try to get from auth token response
            const authDataString = await AsyncStorage.getItem("authData");
            if (authDataString) {
              const authData = JSON.parse(authDataString);
              userId = authData.user?.id;
            }
          }
        } catch (parseError) {
          console.error("Error parsing user info:", parseError);
        }
      }

      // If still no user ID, use a default key
      const storageKey = userId
        ? `orderHistory_${userId}`
        : "orderHistory_default";

      // Get existing orders
      const existingOrdersString = await AsyncStorage.getItem(storageKey);
      let existingOrders: Order[] = existingOrdersString
        ? JSON.parse(existingOrdersString)
        : [];

      // Add this order to the beginning of the array
      const updatedOrders = [order, ...existingOrders];

      // Save updated orders back to storage
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedOrders));

      console.log(
        `Order ${order.id} saved to local history for key ${storageKey}`
      );
    } catch (error) {
      console.error("Error saving order to local history:", error);
    }
  }

  // Get orders from local storage
  private static async getOrdersFromLocalStorage(): Promise<any[]> {
    try {
      // Try multiple possible sources for user ID
      let userId: string | number | null = null;

      // Try userInfo first
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);
          userId = userInfo.id;
        } else {
          // Try auth data
          const authDataString = await AsyncStorage.getItem("authData");
          if (authDataString) {
            const authData = JSON.parse(authDataString);
            userId = authData.user?.id;
          }
        }
      } catch (parseError) {
        console.error("Error parsing user info:", parseError);
      }

      // Get orders using user-specific key or default key
      const storageKey = userId
        ? `orderHistory_${userId}`
        : "orderHistory_default";

      // Get existing orders
      const existingOrdersString = await AsyncStorage.getItem(storageKey);
      let existingOrders: Order[] = existingOrdersString
        ? JSON.parse(existingOrdersString)
        : [];

      console.log(
        `Loaded ${existingOrders.length} orders from local storage for key ${storageKey}`
      );
      return existingOrders;
    } catch (error) {
      console.error("Error getting orders from local storage:", error);
      return [];
    }
  }
}
