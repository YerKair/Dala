// FILE: store/globalState.ts

// Add this import at the top
import AsyncStorage from "@react-native-async-storage/async-storage";

// Интерфейс для координат
interface Coordinates {
  latitude: number;
  longitude: number;
}

// Add a new interface for location tracking
interface LocationInfo {
  coordinates: Coordinates;
  timestamp: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
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

interface TripData {
  isActive: boolean;
  startTime: number | null;
  endTime: number | null;
  tripDuration: number;
  driverId: string | null;
  driverName: string | null;
  origin: string | null;
  destination: string | null;
  fare: number | null;
  status: "waiting" | "active" | "completed" | "cancelled" | null;
  driverLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  customerLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  lastLocationUpdate?: number | null; // Timestamp of last location update
  estimatedArrival?: number | null; // Estimated arrival time in seconds
  route?: {
    latitude: number;
    longitude: number;
  }[];
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
  driverLocation: LocationInfo | null; // Current driver location
  customerLocation: LocationInfo | null; // Current customer location
  tripData: TripData;
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
  driverLocation: null, // Initialize as null
  customerLocation: null, // Initialize as null
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
    driverLocation: null,
    customerLocation: null,
    lastLocationUpdate: null,
    estimatedArrival: null,
    route: undefined,
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
    route?: {
      latitude: number;
      longitude: number;
    }[];
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
      route: tripDetails.route,
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
      route: undefined,
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
      route: undefined,
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

  isTripActive: () => {
    return globalState.tripData.isActive;
  },

  getActiveTripId: () => {
    // If we have an active trip, return the ID which could be derived from timestamp
    if (globalState.tripData.isActive && globalState.tripData.startTime) {
      // Usually the trip ID would come from the backend, but here we can use a fallback
      // We'll check if there's an active request in AsyncStorage
      return AsyncStorage.getItem("activeTaxiTripId")
        .then((tripId) => {
          if (tripId) return tripId;
          // If no stored ID, use the timestamp as a fallback
          return globalState.tripData.startTime?.toString() || null;
        })
        .catch((err) => {
          console.error("Error getting active trip ID:", err);
          return null;
        });
    }
    return Promise.resolve(null);
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
  route?: {
    latitude: number;
    longitude: number;
  }[];
  fare: number;
  timestamp: number;
  status: "pending" | "accepted" | "completed" | "cancelled";
  driverId: string | null;
  driver?: {
    id: string;
    name: string;
    photo?: string;
    rating?: number;
    car?: string;
    licensePlate?: string;
  };
  distance_km?: number;
  tariff?: {
    id: number;
    name: string;
    base_rate: string;
    price_per_km: string;
  };
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

// Добавим функцию для сохранения состояния поездки
export const saveTripState = async () => {
  try {
    // Сохраняем текущее состояние globalState.tripData
    const tripDataKey = "global_trip_data";
    await AsyncStorage.setItem(
      tripDataKey,
      JSON.stringify(globalState.tripData)
    );

    // Сохраняем значения pickupCoordinates и destinationCoordinates
    if (globalState.pickupCoordinates) {
      await AsyncStorage.setItem(
        "global_pickup_coordinates",
        JSON.stringify(globalState.pickupCoordinates)
      );
    }

    if (globalState.destinationCoordinates) {
      await AsyncStorage.setItem(
        "global_destination_coordinates",
        JSON.stringify(globalState.destinationCoordinates)
      );
    }

    // Save location data
    if (globalState.driverLocation) {
      await AsyncStorage.setItem(
        "global_driver_location",
        JSON.stringify(globalState.driverLocation)
      );
    }

    if (globalState.customerLocation) {
      await AsyncStorage.setItem(
        "global_customer_location",
        JSON.stringify(globalState.customerLocation)
      );
    }

    // Сохраняем флаги состояния
    await AsyncStorage.setItem(
      "global_trip_flags",
      JSON.stringify({
        activeTaxiTrip: globalState.activeTaxiTrip,
        isSearchingDriver: globalState.isSearchingDriver,
        driverFound: globalState.driverFound,
        needsNewOrder: globalState.needsNewOrder,
        searchTimeSeconds: globalState.searchTimeSeconds,
      })
    );

    console.log("Saved global trip state to AsyncStorage");
  } catch (error) {
    console.error("Error saving global trip state:", error);
  }
};

// Расширим tripManager для сохранения данных
const originalStartTrip = tripManager.startTrip;
tripManager.startTrip = function (tripData) {
  // Вызываем оригинальную функцию
  const result = originalStartTrip.call(this, tripData);

  // Дополнительно сохраняем состояние
  saveTripState();

  // Возвращаем результат оригинальной функции
  return result;
};

const originalUpdateTripStatus = tripManager.updateTripStatus;
tripManager.updateTripStatus = function (status) {
  // Вызываем оригинальную функцию
  const result = originalUpdateTripStatus.call(this, status);

  // Дополнительно сохраняем состояние
  saveTripState();

  return result;
};

// Добавляем функцию для восстановления состояния поездки
export const restoreTripState = async (userId: string) => {
  try {
    console.log(`Attempting to restore trip state for user ${userId}...`);

    // Проверяем, есть ли сохраненное состояние поездки
    const tripDataJson = await AsyncStorage.getItem("global_trip_data");
    if (!tripDataJson) {
      console.log("No saved trip data found");
      return false;
    }

    const tripData = JSON.parse(tripDataJson);
    console.log("Found saved trip data:", JSON.stringify(tripData));

    // Проверяем, принадлежит ли активная поездка текущему пользователю
    // Проверяем это как на стороне клиента, так и на стороне водителя
    const customerTripKey = `active_trip_${userId}`;
    const driverTripKey = `driver_active_trip_${userId}`;

    // Проверяем наличие активного заказа у клиента
    const customerTripJson = await AsyncStorage.getItem(customerTripKey);
    if (customerTripJson) {
      console.log(`Found customer trip for user ${userId}`);
      const customerTrip = JSON.parse(customerTripJson);

      // Восстанавливаем данные глобального состояния
      globalState.tripData = tripData;
      globalState.activeTaxiTrip = true;
      globalState.needsNewOrder = false;

      // Восстанавливаем координаты
      try {
        const pickupJson = await AsyncStorage.getItem(
          "global_pickup_coordinates"
        );
        const destinationJson = await AsyncStorage.getItem(
          "global_destination_coordinates"
        );

        if (pickupJson) globalState.pickupCoordinates = JSON.parse(pickupJson);
        if (destinationJson)
          globalState.destinationCoordinates = JSON.parse(destinationJson);

        // Restore location data
        const driverLocationJson = await AsyncStorage.getItem(
          "global_driver_location"
        );
        const customerLocationJson = await AsyncStorage.getItem(
          "global_customer_location"
        );

        if (driverLocationJson)
          globalState.driverLocation = JSON.parse(driverLocationJson);
        if (customerLocationJson)
          globalState.customerLocation = JSON.parse(customerLocationJson);

        // Если в customerTrip есть координаты, используем их
        if (customerTrip.pickupCoordinates)
          globalState.pickupCoordinates = customerTrip.pickupCoordinates;
        if (customerTrip.destinationCoordinates)
          globalState.destinationCoordinates =
            customerTrip.destinationCoordinates;

        // If customer trip has location data, use it
        if (customerTrip.driverLocation)
          globalState.driverLocation = customerTrip.driverLocation;
        if (customerTrip.customerLocation)
          globalState.customerLocation = customerTrip.customerLocation;
      } catch (error) {
        console.error("Error restoring coordinates and location data:", error);
      }

      // Восстанавливаем состояние поиска водителя
      globalState.isSearchingDriver =
        !customerTrip.driverId || customerTrip.driverId === "pending_driver";
      globalState.driverFound = !!(
        customerTrip.driverId && customerTrip.driverId !== "pending_driver"
      );

      console.log("Successfully restored trip state for customer");
      return true;
    }

    // Проверяем наличие активного заказа у водителя
    const driverTripJson = await AsyncStorage.getItem(driverTripKey);
    if (driverTripJson) {
      console.log(`Found driver trip for user ${userId}`);
      const driverTrip = JSON.parse(driverTripJson);

      // Восстанавливаем данные глобального состояния
      globalState.tripData = tripData;
      globalState.activeTaxiTrip = true;
      globalState.needsNewOrder = false;

      // Восстанавливаем координаты
      try {
        const pickupJson = await AsyncStorage.getItem(
          "global_pickup_coordinates"
        );
        const destinationJson = await AsyncStorage.getItem(
          "global_destination_coordinates"
        );

        if (pickupJson) globalState.pickupCoordinates = JSON.parse(pickupJson);
        if (destinationJson)
          globalState.destinationCoordinates = JSON.parse(destinationJson);

        // Restore location data
        const driverLocationJson = await AsyncStorage.getItem(
          "global_driver_location"
        );
        const customerLocationJson = await AsyncStorage.getItem(
          "global_customer_location"
        );

        if (driverLocationJson)
          globalState.driverLocation = JSON.parse(driverLocationJson);
        if (customerLocationJson)
          globalState.customerLocation = JSON.parse(customerLocationJson);

        // If driver trip has location data, use it
        if (driverTrip.driverLocation)
          globalState.driverLocation = driverTrip.driverLocation;
        if (driverTrip.customerLocation)
          globalState.customerLocation = driverTrip.customerLocation;
      } catch (error) {
        console.error("Error restoring coordinates and location data:", error);
      }

      console.log("Successfully restored trip state for driver");
      return true;
    }

    console.log("No active trip found for current user, not restoring state");
    return false;
  } catch (error) {
    console.error("Error restoring global trip state:", error);
    return false;
  }
};

// Добавляем новую функцию для проверки наличия активной поездки у пользователя
export const checkUserActiveTrip = async (userId: string): Promise<boolean> => {
  try {
    console.log(`Checking for active trip for user ${userId}...`);

    // Проверяем все возможные ключи, где может храниться активная поездка
    const keysToCheck = [
      `active_trip_${userId}`,
      `user_active_request_${userId}`,
      `driver_active_trip_${userId}`,
    ];

    for (const key of keysToCheck) {
      const tripJson = await AsyncStorage.getItem(key);

      if (tripJson) {
        console.log(`Found active trip data at key: ${key}`);
        // Если нашли хотя бы один ключ с данными поездки
        return true;
      }
    }

    // Проверяем также списки поездок
    const userRequestsKey = `taxiRequests_${userId}`;
    const userRequestsJson = await AsyncStorage.getItem(userRequestsKey);

    if (userRequestsJson) {
      const requests = JSON.parse(userRequestsJson);

      // Ищем активный запрос (не отмененный/не завершенный)
      const activeRequest = requests.find(
        (req: any) => req.status !== "completed" && req.status !== "cancelled"
      );

      if (activeRequest) {
        console.log(`Found active request in taxiRequests_${userId}`);
        return true;
      }
    }

    console.log(`No active trip found for user ${userId}`);
    return false;
  } catch (error) {
    console.error("Error checking for user active trip:", error);
    return false;
  }
};

// Modify the forceResetTripState to be more selective
export const forceResetTripState = async (userId: string) => {
  try {
    console.log(`Force resetting trip state for user ${userId}`);

    // Сброс всех состояний в globalState
    globalState.activeTaxiTrip = false;
    globalState.needsNewOrder = true;
    globalState.pickupCoordinates = null;
    globalState.destinationCoordinates = null;
    globalState.isSearchingDriver = false;
    globalState.searchTimeSeconds = 0;
    globalState.driverFound = false;
    globalState.driverLocation = null;
    globalState.customerLocation = null;
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
      driverLocation: null,
      customerLocation: null,
      lastLocationUpdate: null,
      estimatedArrival: null,
      route: undefined,
    };

    // Очистка всех связанных данных в AsyncStorage
    const keysToRemove = [
      `trip_state_${userId}`,
      `active_request_${userId}`,
      "activeRequest",
      "tripData",
      "tripState",
      "lastTripId",
      `driver_location_${userId}`,
      `customer_location_${userId}`,
      `trip_events_${userId}`,
      `taxi_requests_${userId}`,
      "taxiRequests",
    ];

    await AsyncStorage.multiRemove(keysToRemove);

    // Очистка всех запросов такси
    const requestsJson = await AsyncStorage.getItem("taxiRequests");
    if (requestsJson) {
      const requests: TaxiRequest[] = JSON.parse(requestsJson);
      const updatedRequests = requests.filter(
        (request) =>
          request.customer.id.toString() !== userId ||
          (request.status !== "pending" && request.status !== "accepted")
      );
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(updatedRequests)
      );
    }

    console.log(`Successfully reset trip state for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error in forceResetTripState:", error);
    return false;
  }
};

// Изменим существующие методы отмены поездок, чтобы использовать forceResetTripState

// Update the cancelTrip function to use forceResetTripState
const originalCancelTrip = tripManager.cancelTrip;
tripManager.cancelTrip = function (reason?: string) {
  // Вызываем оригинальную функцию
  const result = originalCancelTrip.call(this, reason);

  // Получаем ID пользователя из AsyncStorage
  (async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        console.log("Force resetting trip state after cancellation");
        await forceResetTripState(userId);
      }
    } catch (error) {
      console.error("Error getting userId for reset:", error);
    }
  })();

  return result;
};

// Update the startOrderFlow function to use forceResetTripState
const originalStartOrderFlow = tripManager.startOrderFlow;
tripManager.startOrderFlow = function () {
  // Вызываем оригинальную функцию
  const result = originalStartOrderFlow.call(this);

  // Получаем ID пользователя из AsyncStorage
  (async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        console.log("Force resetting trip state before new order flow");
        await forceResetTripState(userId);
      }
    } catch (error) {
      console.error("Error getting userId for reset:", error);
    }
  })();

  return result;
};
