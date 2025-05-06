// FILE: store/globalState.ts

// Add this import at the top
import AsyncStorage from "@react-native-async-storage/async-storage";

// Интерфейс для координат
interface Coordinates {
  latitude: number;
  longitude: number;
}

// Интерфейс для информации о доставке
interface DeliveryInfo {
  orderId: string;
  fromAddress: string;
  toAddress: string;
  driverName: string;
  status: "preparing" | "pickup" | "onTheWay" | "arrived" | "delivered";
  estimatedTime: string;
  remainingTime: number;
}

interface GlobalState {
  activeTaxiTrip: boolean;
  needsNewOrder: boolean; // Added to indicate a new order is needed
  pickupCoordinates: Coordinates | null; // Координаты точки отправления
  destinationCoordinates: Coordinates | null; // Координаты точки назначения
  isSearchingDriver: boolean; // Flag to indicate active driver search
  searchTimeSeconds: number; // Time spent searching for a driver
  driverFound: boolean; // Flag to indicate a driver has been found
  activeDelivery: DeliveryInfo | null; // Информация о текущей активной доставке
  tripData: {
    isActive: boolean;
    startTime: number | null;
    endTime: number | null;
    tripDuration: number; // in seconds
    driverId: string | null;
    driverName: string | null;
    origin: string | null;
    destination: string | null;
    fare: number | null;
    status: "waiting" | "active" | "completed" | "cancelled" | null;
  };
}

export const globalState: GlobalState = {
  activeTaxiTrip: false,
  needsNewOrder: true, // Start with true so user begins with order screen
  pickupCoordinates: null, // Инициализируем как null
  destinationCoordinates: null, // Инициализируем как null
  isSearchingDriver: false,
  searchTimeSeconds: 0,
  driverFound: false,
  activeDelivery: null, // Инициализируем как null
  tripData: {
    isActive: false,
    startTime: null,
    endTime: null,
    tripDuration: 120, // 2 minutes default
    driverId: null,
    driverName: null,
    origin: null,
    destination: null,
    fare: null,
    status: null,
  },
};

// Helper functions for trip management
export const tripManager = {
  startTrip: (tripDetails: {
    driverId: string;
    driverName: string;
    origin: string;
    destination: string;
    fare: number;
    duration?: number;
  }) => {
    const now = Date.now();

    globalState.activeTaxiTrip = true;
    globalState.needsNewOrder = false; // Set to false when trip starts

    // Determine if this is a trip that needs driver search
    const needsDriverSearch =
      tripDetails.driverId === "pending_driver" ||
      !tripDetails.driverId ||
      tripDetails.driverName === "Seeking Driver...";

    // If we need to search for a driver, set appropriate state
    if (needsDriverSearch) {
      globalState.isSearchingDriver = true;
      globalState.searchTimeSeconds = 0;
      globalState.driverFound = false;
    } else {
      // If driver is already assigned, mark as found
      globalState.isSearchingDriver = false;
      globalState.driverFound = true;
    }

    globalState.tripData = {
      isActive: true,
      startTime: now,
      endTime:
        now +
        (tripDetails.duration || globalState.tripData.tripDuration) * 1000,
      tripDuration: tripDetails.duration || globalState.tripData.tripDuration,
      driverId: needsDriverSearch ? null : tripDetails.driverId,
      driverName: needsDriverSearch ? null : tripDetails.driverName,
      origin: tripDetails.origin,
      destination: tripDetails.destination,
      fare: tripDetails.fare,
      status: "waiting",
    };

    console.log("Trip started:", globalState.tripData);

    // You could store this in AsyncStorage for persistence across app restarts
    return globalState.tripData;
  },

  updateTripStatus: (
    status: "waiting" | "active" | "completed" | "cancelled"
  ) => {
    if (!globalState.tripData.isActive) return null;

    globalState.tripData.status = status;

    if (status === "cancelled" || status === "completed") {
      globalState.tripData.isActive = false;
      globalState.tripData.endTime = Date.now();
      globalState.activeTaxiTrip = false;
      globalState.needsNewOrder = true; // Need a new order after completion/cancellation
    }

    console.log("Trip status updated:", status);
    return globalState.tripData;
  },

  getRemainingTime: () => {
    if (!globalState.tripData.isActive || !globalState.tripData.endTime)
      return 0;

    const now = Date.now();
    const remaining = Math.max(0, globalState.tripData.endTime - now);
    return Math.floor(remaining / 1000); // Convert to seconds
  },

  checkTripActive: () => {
    // Check if there's an active trip and it hasn't expired
    if (globalState.tripData.isActive && globalState.tripData.endTime) {
      const now = Date.now();

      // If the end time has passed and status is still 'waiting'
      if (
        now > globalState.tripData.endTime &&
        globalState.tripData.status === "waiting"
      ) {
        // Auto-update to 'active' when timer expires
        globalState.tripData.status = "active";
      }

      return globalState.tripData.isActive;
    }

    return false;
  },

  cancelTrip: (reason?: string) => {
    if (!globalState.tripData.isActive) {
      console.log("No active trip to cancel");
      return false;
    }

    // Store cancellation details
    const cancellationData = {
      tripId: globalState.tripData.startTime?.toString(),
      cancelled: true,
      cancelTime: new Date(),
      reason: reason || "User cancelled trip",
      tripDuration: Math.floor(
        (Date.now() - (globalState.tripData.startTime || 0)) / 1000
      ),
      stage: globalState.tripData.status,
    };

    console.log("Trip cancelled:", cancellationData);

    // Reset trip data
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
      status: "cancelled",
    };

    // Reset coordinates as well
    globalState.pickupCoordinates = null;
    globalState.destinationCoordinates = null;

    // Reset global flags
    globalState.activeTaxiTrip = false;
    globalState.needsNewOrder = true; // Need a new order after cancellation

    // Additional cleanup for trip data in AsyncStorage
    (async () => {
      try {
        const userId = cancellationData.tripId; // Just using this as an identifier
        if (userId) {
          // Try to find and remove any associated requests
          const requestsJson = await AsyncStorage.getItem("taxiRequests");
          if (requestsJson) {
            const requests: TaxiRequest[] = JSON.parse(requestsJson);
            const updatedRequests = requests.filter(
              (req) => !(req.status === "pending" || req.status === "accepted")
            );
            await AsyncStorage.setItem(
              "taxiRequests",
              JSON.stringify(updatedRequests)
            );
            console.log("Cleaned up cancelled requests from storage");
          }
        }
      } catch (error) {
        console.error("Error cleaning up trip data:", error);
      }
    })();

    return true;
  },

  startOrderFlow: () => {
    // Reset any existing trip data
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

    // Reset coordinates as well
    globalState.pickupCoordinates = null;
    globalState.destinationCoordinates = null;

    // Reset driver search state
    globalState.isSearchingDriver = false;
    globalState.searchTimeSeconds = 0;
    globalState.driverFound = false;

    globalState.needsNewOrder = true;
    globalState.activeTaxiTrip = false;

    console.log("Trip data reset for new order flow");

    // Асинхронно очищаем все завершенные поездки из хранилища
    // Эта операция выполняется в фоне и не блокирует основной поток
    (async () => {
      try {
        const requests = await AsyncStorage.getItem("taxiRequests");
        if (requests) {
          const parsedRequests: TaxiRequest[] = JSON.parse(requests);
          // Фильтруем, оставляя только активные заказы
          const activeRequests = parsedRequests.filter(
            (req) => req.status === "pending" || req.status === "accepted"
          );
          await AsyncStorage.setItem(
            "taxiRequests",
            JSON.stringify(activeRequests)
          );
          console.log("Cleared completed taxi requests from storage");
        }
      } catch (error) {
        console.error("Error clearing completed requests:", error);
      }
    })();

    return true;
  },
};

// Add these interfaces for taxi requests
export interface TaxiRequest {
  id: string;
  customer: {
    id: number;
    name: string;
  };
  pickup: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  destination: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  fare: number;
  timestamp: number;
  status: "pending" | "accepted" | "completed" | "cancelled";
  driverId: string | null;
}

// Add a taxi requests manager to handle shared taxi requests between users
export const taxiRequestsManager = {
  // Get all pending taxi requests
  getRequests: async (): Promise<TaxiRequest[]> => {
    try {
      const requests = await AsyncStorage.getItem("taxiRequests");
      if (requests) {
        // Фильтруем, чтобы получить только заказы со статусом "pending"
        // и без назначенного водителя (driverId должен быть null)
        return JSON.parse(requests).filter(
          (req: TaxiRequest) =>
            req.status === "pending" && req.driverId === null
        );
      }
      return [];
    } catch (error) {
      console.error("Error getting taxi requests:", error);
      return [];
    }
  },

  // Get all taxi requests regardless of status
  getAllRequests: async (): Promise<TaxiRequest[]> => {
    try {
      const requests = await AsyncStorage.getItem("taxiRequests");
      if (requests) {
        return JSON.parse(requests);
      }
      return [];
    } catch (error) {
      console.error("Error getting all taxi requests:", error);
      return [];
    }
  },

  // Get active request for a specific user (customer or driver)
  getUserActiveRequest: async (
    userId: number | string
  ): Promise<TaxiRequest | null> => {
    try {
      if (!userId) {
        console.error("getUserActiveRequest called with invalid userId");
        return null;
      }

      // Security check: Get the current authenticated user from AsyncStorage
      const userData = await AsyncStorage.getItem("userData");
      if (!userData) {
        console.error("Security alert: No authenticated user data found");
        return null;
      }

      const user = JSON.parse(userData);

      // Security check: Verify that the requested userId matches the authenticated user
      if (user.id.toString() !== userId.toString()) {
        console.error(
          "Security alert: Attempted to access data for a different user"
        );
        return null;
      }

      const requests = await AsyncStorage.getItem("taxiRequests");
      if (!requests) {
        console.log("No taxi requests found in storage");
        return null;
      }

      const parsedRequests: TaxiRequest[] = JSON.parse(requests);
      if (parsedRequests.length === 0) {
        console.log("No taxi requests available");
        return null;
      }

      console.log(`Looking for active requests for user ID: ${userId}`);
      console.log(`Total requests in storage: ${parsedRequests.length}`);

      // Get user roles
      const userRoles = user?.role ? user.role.split(",") : [];
      const isDriver = userRoles.includes("driver");

      let userRequest = null;

      if (isDriver) {
        // If user is a driver, only return requests that are assigned to them
        // This prevents drivers from seeing customer's personal trip screen
        userRequest = parsedRequests.find(
          (req) =>
            req.status === "accepted" &&
            req.driverId?.toString() === userId.toString()
        );
      } else {
        // If user is a customer, only return their own requests
        userRequest = parsedRequests.find(
          (req) =>
            req.customer.id.toString() === userId.toString() &&
            (req.status === "pending" || req.status === "accepted")
        );
      }

      // Add an additional security check before returning the request
      if (userRequest) {
        if (
          isDriver &&
          userRequest.driverId?.toString() !== userId.toString()
        ) {
          console.error(
            "Security alert: Driver attempted to access trip they're not assigned to"
          );
          return null;
        } else if (
          !isDriver &&
          userRequest.customer.id.toString() !== userId.toString()
        ) {
          console.error(
            "Security alert: Customer attempted to access someone else's trip"
          );
          return null;
        }
      }

      console.log(
        `Checking requests for user ID ${userId}:`,
        userRequest
          ? `Found active request: ${userRequest.id}, status: ${userRequest.status}`
          : "No active requests found"
      );

      return userRequest || null;
    } catch (error) {
      console.error("Error getting user active request:", error);
      return null;
    }
  },

  // Create a new taxi request
  createRequest: async (
    request: Omit<TaxiRequest, "id" | "timestamp" | "status" | "driverId">
  ): Promise<TaxiRequest | null> => {
    try {
      // Get existing requests
      const existingRequestsJson = await AsyncStorage.getItem("taxiRequests");
      const existingRequests: TaxiRequest[] = existingRequestsJson
        ? JSON.parse(existingRequestsJson)
        : [];

      // Create new request with ID and timestamp
      const newRequest: TaxiRequest = {
        ...request,
        id: "req_" + Date.now().toString(),
        timestamp: Date.now(),
        status: "pending",
        driverId: null, // Initially no driver
      };

      // Add the new request to the list
      const updatedRequests = [...existingRequests, newRequest];

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(updatedRequests)
      );

      console.log("Created taxi request:", newRequest);
      return newRequest;
    } catch (error) {
      console.error("Error creating taxi request:", error);
      return null;
    }
  },

  // Accept a request (by a taxi driver)
  acceptRequest: async (
    requestId: string,
    driverId: number | string,
    driverName: string
  ): Promise<TaxiRequest | null> => {
    try {
      // Get existing requests
      const existingRequestsJson = await AsyncStorage.getItem("taxiRequests");
      if (!existingRequestsJson) return null;

      const existingRequests: TaxiRequest[] = JSON.parse(existingRequestsJson);

      // Find the request to update
      const requestToAccept = existingRequests.find(
        (req) => req.id === requestId
      );
      if (!requestToAccept || requestToAccept.status !== "pending") return null;

      // Update the request status to accepted and set driverId
      requestToAccept.status = "accepted";
      requestToAccept.driverId = driverId.toString();

      // Save updated requests to AsyncStorage
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(existingRequests)
      );

      // Log for debugging
      console.log("Updated request status to accepted:", requestToAccept);
      console.log("Existing requests after update:", existingRequests);

      // Start trip using the trip manager
      tripManager.startTrip({
        driverId: driverId.toString(),
        driverName: driverName,
        origin: requestToAccept.pickup.name,
        destination: requestToAccept.destination.name,
        fare: requestToAccept.fare,
        duration: 120, // 2 minutes arrival time
      });

      console.log("Accepted taxi request:", requestToAccept);
      return requestToAccept;
    } catch (error) {
      console.error("Error accepting taxi request:", error);
      return null;
    }
  },

  // Complete or cancel a request
  updateRequestStatus: async (
    requestId: string,
    status: "completed" | "cancelled"
  ): Promise<boolean> => {
    try {
      if (!requestId) {
        console.error("updateRequestStatus: No requestId provided");
        return false;
      }

      console.log(
        `Attempting to update request ${requestId} to status: ${status}`
      );

      // Get existing requests
      const existingRequestsJson = await AsyncStorage.getItem("taxiRequests");
      if (!existingRequestsJson) {
        console.error("updateRequestStatus: No requests found in storage");
        return false;
      }

      const existingRequests: TaxiRequest[] = JSON.parse(existingRequestsJson);

      // Find the request to update
      const requestIndex = existingRequests.findIndex(
        (req) => req.id === requestId
      );

      if (requestIndex === -1) {
        console.error(
          `updateRequestStatus: Request with ID ${requestId} not found`
        );
        return false;
      }

      // Сохраняем старый статус для логирования
      const oldStatus = existingRequests[requestIndex].status;

      // Update the request status
      existingRequests[requestIndex].status = status;

      // Save updated requests to AsyncStorage
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(existingRequests)
      );

      console.log(
        `Successfully updated taxi request status from ${oldStatus} to ${status} for request:`,
        existingRequests[requestIndex]
      );

      // Проверка, что данные успешно сохранились
      const verifyJson = await AsyncStorage.getItem("taxiRequests");
      if (!verifyJson) {
        console.error("Failed to verify storage update");
        return false;
      }

      const verifyRequests = JSON.parse(verifyJson);
      const verifyRequest = verifyRequests.find(
        (req: TaxiRequest) => req.id === requestId
      );

      if (!verifyRequest || verifyRequest.status !== status) {
        console.error("Status update verification failed", {
          expected: status,
          actual: verifyRequest ? verifyRequest.status : "request not found",
        });
        return false;
      }

      console.log("Status update verified successfully");
      return true;
    } catch (error) {
      console.error(`Error updating taxi request status to ${status}:`, error);
      return false;
    }
  },

  // Clear all taxi requests (for testing)
  clearAllRequests: async (): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem("taxiRequests");
      return true;
    } catch (error) {
      console.error("Error clearing taxi requests:", error);
      return false;
    }
  },

  // Get request by ID
  getRequestById: async (requestId: string): Promise<TaxiRequest | null> => {
    try {
      const requests = await AsyncStorage.getItem("taxiRequests");
      if (!requests) return null;

      const parsedRequests: TaxiRequest[] = JSON.parse(requests);
      const request = parsedRequests.find((req) => req.id === requestId);

      return request || null;
    } catch (error) {
      console.error("Error getting request by ID:", error);
      return null;
    }
  },
};
