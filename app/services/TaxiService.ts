import AsyncStorage from "@react-native-async-storage/async-storage";
import { tripManager, TaxiRequest, globalState } from "../store/globalState";
import { useAuth } from "../auth/AuthContext";

// Create type for API request
interface CreateTripRequest {
  user_id: number;
  tariff_id: number;
  from_address: string;
  to_address: string;
  distance_km: number;
  price: number;
}

// Create type for API response
interface ApiTripResponse {
  trip: {
    id: number;
    user_id: number;
    tariff_id: number;
    from_address: string;
    to_address: string;
    distance_km: number;
    price: number;
    status: string;
    updated_at: string;
    created_at: string;
  };
}

// New location tracking interface
interface LocationUpdate {
  latitude: number;
  longitude: number;
  userId: string | number;
  role: "driver" | "customer";
  tripId?: string;
  timestamp: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

// Global variable to store the token from React component
let globalToken: string | null = null;

const isDriverToken = (token: string): boolean => {
  // A simple check to identify if a token belongs to a driver
  // This can be enhanced based on actual token structure
  return token.includes("driver") || token.includes("DRIVER");
};

export const setGlobalToken = (newToken: string) => {
  console.log(`Setting global token to: ${newToken.substring(0, 15)}...`);
  globalToken = newToken;
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    // First try global token if available
    if (globalToken) {
      console.log(`Using global token: ${globalToken.substring(0, 15)}...`);
      return globalToken;
    }

    // Try getting token from different storage keys
    const authToken = await AsyncStorage.getItem("authToken");
    if (authToken) {
      console.log(
        `Retrieved token from AsyncStorage (authToken): ${authToken.substring(
          0,
          15
        )}...`
      );
      globalToken = authToken; // Update global token for future use
      return authToken;
    }

    // Try userToken (used by AuthContext)
    const userToken = await AsyncStorage.getItem("userToken");
    if (userToken) {
      console.log(
        `Retrieved token from AsyncStorage (userToken): ${userToken.substring(
          0,
          15
        )}...`
      );
      globalToken = userToken; // Update global token for future use
      return userToken;
    }

    // Try the "token" key as a last resort
    const token = await AsyncStorage.getItem("token");
    if (token) {
      console.log(
        `Retrieved token from AsyncStorage (token): ${token.substring(
          0,
          15
        )}...`
      );
      globalToken = token; // Update global token for future use
      return token;
    }

    console.log("No token found in global or AsyncStorage");
    return null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// This is a synchronous header creator to use with fetch
const createAuthHeaderSync = (token: string | null): Record<string, string> => {
  try {
    if (!token) {
      console.log("No token available for auth header");
      return { "Content-Type": "application/json" };
    }

    // Ensure token is properly formatted
    const trimmedToken = token.trim();
    const authToken = trimmedToken.startsWith("Bearer ")
      ? trimmedToken
      : `Bearer ${trimmedToken}`;

    console.log(
      `Auth header created with token: ${authToken.substring(0, 20)}...`
    );

    return {
      "Content-Type": "application/json",
      Authorization: authToken,
    };
  } catch (error) {
    console.error("Error creating auth header:", error);
    return { "Content-Type": "application/json" };
  }
};

// Sample driver demo data
const DEMO_AVAILABLE_TRIPS = [
  {
    id: "demo-trip-1",
    sourceAddress: "Абая 44, Алматы",
    destinationAddress: "Достык 132, Алматы",
    status: "PENDING",
    price: 1500,
    distance: 5.2,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    customerName: "Ержан Алматов",
    customerPhone: "+7 705 123 4567",
  },
  {
    id: "demo-trip-2",
    sourceAddress: "Тимирязева 38, Алматы",
    destinationAddress: "Навои 37, Алматы",
    status: "PENDING",
    price: 1200,
    distance: 3.8,
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    customerName: "Айгуль Сатпаева",
    customerPhone: "+7 777 765 4321",
  },
];

// TaxiService class to handle API calls
export class TaxiService {
  private static API_URL = "http://192.168.0.104:8000/api";
  private static BROADCAST_KEY = "taxi_broadcast_events";

  // Method to explicitly update the taxi service token
  static async updateTaxiToken(): Promise<boolean> {
    try {
      // Try all possible token sources
      const userToken = await AsyncStorage.getItem("userToken");
      if (userToken) {
        console.log("Updating TaxiService with userToken");
        setGlobalToken(userToken);
        // Also ensure it's saved as authToken for backward compatibility
        await AsyncStorage.setItem("authToken", userToken);
        return true;
      }

      const token = await AsyncStorage.getItem("token");
      if (token) {
        console.log("Updating TaxiService with token");
        setGlobalToken(token);
        // Also ensure it's saved as authToken for backward compatibility
        await AsyncStorage.setItem("authToken", token);
        return true;
      }

      const authToken = await AsyncStorage.getItem("authToken");
      if (authToken) {
        console.log("Reusing existing authToken");
        setGlobalToken(authToken);
        return true;
      }

      console.log("No token found to update TaxiService");
      return false;
    } catch (error) {
      console.error("Error updating taxi token:", error);
      return false;
    }
  }

  // Create a trip using the API
  static async createTrip(tripData: {
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
    distance_km?: number;
    tariff_id?: number;
  }): Promise<TaxiRequest | null> {
    try {
      // Calculate distance if not provided
      const distance =
        tripData.distance_km ||
        this.calculateDistance(
          tripData.pickup.coordinates,
          tripData.destination.coordinates
        );

      // Create request body
      const requestBody: CreateTripRequest = {
        user_id: tripData.customer.id,
        tariff_id: tripData.tariff_id || 1, // Default to tariff ID 1 if not provided
        from_address: tripData.pickup.name,
        to_address: tripData.destination.name,
        distance_km: distance,
        price: tripData.fare,
      };

      console.log("Creating trip with API:", requestBody);

      // Get auth token
      const token = await getAuthToken();
      console.log(
        "Auth token retrieved:",
        token ? "Token exists" : "No token found"
      );

      // If no token is found, try to create the request without authentication
      if (!token) {
        console.log(
          "WARNING: No auth token available, trying request without authentication"
        );
      }

      // Make the API call
      const response = await fetch(`${this.API_URL}/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Create trip API error response:", errorText);
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data: ApiTripResponse = await response.json();
      console.log("API response:", data);

      // Convert API response to TaxiRequest format
      const taxiRequest: TaxiRequest = {
        id: data.trip.id.toString(),
        customer: {
          id: data.trip.user_id,
          name: tripData.customer.name,
        },
        pickup: {
          name: data.trip.from_address,
          coordinates: tripData.pickup.coordinates,
        },
        destination: {
          name: data.trip.to_address,
          coordinates: tripData.destination.coordinates,
        },
        fare: data.trip.price,
        timestamp: new Date(data.trip.created_at).getTime(),
        status: this.convertApiStatus(data.trip.status),
        driverId: null, // Initially no driver
      };

      // Also save locally in AsyncStorage for offline access
      await this.saveLocalRequest(taxiRequest);

      return taxiRequest;
    } catch (error) {
      console.error("Error creating trip with API:", error);

      // Fallback to local storage method if API fails
      console.log("Falling back to local storage method");
      return this.createLocalRequest(tripData);
    }
  }

  // Add broadcasting method for trip updates
  static async broadcastTripUpdate(event: {
    type: string;
    payload: TaxiRequest;
  }) {
    try {
      // Get existing events
      const eventsJson = await AsyncStorage.getItem(this.BROADCAST_KEY);
      const events = eventsJson ? JSON.parse(eventsJson) : [];

      // Add new event with timestamp
      const eventWithTime = {
        ...event,
        timestamp: Date.now(),
      };
      events.push(eventWithTime);

      // Keep only the last 20 events
      const recentEvents = events.slice(-20);

      // Store back
      await AsyncStorage.setItem(
        this.BROADCAST_KEY,
        JSON.stringify(recentEvents)
      );

      console.log(
        `Trip update broadcast: ${event.type} for trip ${event.payload.id}`
      );
    } catch (error) {
      console.error("Error broadcasting trip update:", error);
    }
  }

  // Accept a trip and assign a driver to it
  static async acceptTrip(
    tripId: string,
    driver: {
      id?: string;
      name?: string;
      photo?: any;
      rating?: number;
      car?: string;
      licensePlate?: string;
    }
  ): Promise<TaxiRequest | null> {
    try {
      console.log(
        `Driver ${driver?.name || "Unknown"} is accepting trip ${tripId}`
      );

      // Get token for API request
      const token = await getAuthToken();

      // Try to find trip in local storage first
      let tripRequest: TaxiRequest | null = null;

      try {
        const taxiRequests = await AsyncStorage.getItem("taxiRequests");
        if (taxiRequests) {
          const requests: TaxiRequest[] = JSON.parse(taxiRequests);
          tripRequest = requests.find((req) => req.id === tripId) || null;
        }
      } catch (error) {
        console.error("Error reading from AsyncStorage:", error);
      }

      // If trip not found in local storage, try to get pending trips from server
      if (!tripRequest) {
        console.log("Trip not found in local storage, checking server...");

        const pendingTrips = await this.getPendingTrips();
        tripRequest = pendingTrips.find((trip) => trip.id === tripId) || null;

        if (tripRequest) {
          console.log("Found trip on server, saving to local storage");

          // Save all pending trips to local storage
          try {
            await AsyncStorage.setItem(
              "taxiRequests",
              JSON.stringify(pendingTrips)
            );
          } catch (error) {
            console.error("Error saving trips to AsyncStorage:", error);
          }
        } else {
          console.error("Trip not found on server or in local storage");
          return null;
        }
      }

      // Ensure driver has a valid ID
      const driverId = driver?.id || `driver_${Date.now()}`;

      // Update trip details with driver info
      const updatedTrip: TaxiRequest = {
        ...tripRequest,
        driverId: driverId,
        status: "accepted",
      };

      // Update trip in local storage
      try {
        const taxiRequests = await AsyncStorage.getItem("taxiRequests");
        if (taxiRequests) {
          const requests: TaxiRequest[] = JSON.parse(taxiRequests);
          const updatedRequests = requests.map((req) =>
            req.id === tripId ? updatedTrip : req
          );
          await AsyncStorage.setItem(
            "taxiRequests",
            JSON.stringify(updatedRequests)
          );

          // Also save as active request for the driver
          const driverKey = `driver_${driverId}_activeTrip`;
          await AsyncStorage.setItem(driverKey, JSON.stringify(updatedTrip));
          console.log(`Saved active trip for driver ${driverId}`);

          // Also update the customer's side
          if (tripRequest.customer && tripRequest.customer.id) {
            const activeTripKey = `active_trip_${tripRequest.customer.id}`;
            const userRequestKey = `user_active_request_${tripRequest.customer.id}`;

            // Update the active trip with full information
            const customerTripData = {
              tripId: tripId,
              driverId: driverId,
              driverName: driver?.name || "Driver",
              pickupAddress: tripRequest.pickup.name,
              pickupCoordinates: tripRequest.pickup.coordinates,
              destinationAddress: tripRequest.destination.name,
              destinationCoordinates: tripRequest.destination.coordinates,
              fare: tripRequest.fare,
              status: "accepted",
              timestamp: tripRequest.timestamp,
              lastUpdated: Date.now(),
            };

            await AsyncStorage.setItem(
              activeTripKey,
              JSON.stringify(customerTripData)
            );
            await AsyncStorage.setItem(
              userRequestKey,
              JSON.stringify(updatedTrip)
            );
            console.log(
              `Updated trip data for customer: ${tripRequest.customer.id}`
            );
          }
        }
      } catch (error) {
        console.error("Error updating trip in AsyncStorage:", error);
      }

      // Try to update on the server if we have a token - try different endpoints
      if (token) {
        console.log("Attempting to update trip status on server...");

        // Try different API endpoint variations
        const possibleEndpoints = [
          // Standard RESTful endpoints
          `${this.API_URL}/trips/${tripId}/accept`,
          `${this.API_URL}/trips/accept/${tripId}`,
          `${this.API_URL}/trips/${tripId}`,

          // With query parameters
          `${this.API_URL}/trips/accept`,
          `${this.API_URL}/api/trips/accept`,
          `${this.API_URL}/trip/accept`,
        ];

        // Build query parameters
        const params = new URLSearchParams();
        params.append("trip_id", tripId);
        params.append("driver_id", driverId);
        params.append("driver_name", driver?.name || "Driver");
        params.append("car_model", driver?.car || "Not specified");
        params.append("license_plate", driver?.licensePlate || "Not specified");

        let serverUpdateSuccessful = false;

        // Try different methods (GET and POST) with different endpoints
        for (const endpoint of possibleEndpoints) {
          try {
            // Try with GET method
            const getResponse = await fetch(
              `${endpoint}?${params.toString()}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  ...createAuthHeaderSync(token),
                },
              }
            );

            if (getResponse.ok) {
              console.log(
                `Successfully updated trip on server using GET to ${endpoint}`
              );
              serverUpdateSuccessful = true;
              break;
            }

            // If GET fails, try POST
            const postData = {
              trip_id: tripId,
              driver_id: driverId,
              driver_name: driver?.name || "Driver",
              car_model: driver?.car || "Not specified",
              license_plate: driver?.licensePlate || "Not specified",
            };

            const postResponse = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...createAuthHeaderSync(token),
              },
              body: JSON.stringify(postData),
            });

            if (postResponse.ok) {
              console.log(
                `Successfully updated trip on server using POST to ${endpoint}`
              );
              serverUpdateSuccessful = true;
              break;
            }
          } catch (endpointError) {
            console.log(`Error trying endpoint ${endpoint}:`, endpointError);
            // Continue to next endpoint
          }
        }

        if (!serverUpdateSuccessful) {
          console.log(
            "All server update attempts failed. Proceeding with local data only."
          );
        }
      } else {
        console.log("No token available, skipping server update");
      }

      // Broadcast event for real-time updates
      this.broadcastTripUpdate({
        type: "TRIP_ACCEPTED",
        payload: updatedTrip,
      });

      return updatedTrip;
    } catch (error) {
      console.error("Error in acceptTrip:", error);
      return null;
    }
  }

  // Helper method to update trip data for the customer
  private static async updateTripForCustomer(
    trip: TaxiRequest,
    driverName: string
  ) {
    try {
      // Get the customer's active trip key - используем надежный ключ, который не зависит от состояния авторизации
      const activeTripKey = `active_trip_${trip.customer.id}`;
      const userRequestsKey = `user_active_request_${trip.customer.id}`;

      console.log(
        `Updating trip for customer ${trip.customer.id} with driver ${driverName}`
      );

      // Update the active trip with full information
      const customerTripData = {
        tripId: trip.id,
        driverId: trip.driverId,
        driverName: driverName,
        pickupAddress: trip.pickup.name,
        pickupCoordinates: trip.pickup.coordinates,
        destinationAddress: trip.destination.name,
        destinationCoordinates: trip.destination.coordinates,
        fare: trip.fare,
        status: trip.status,
        timestamp: trip.timestamp,
        lastUpdated: Date.now(),
      };

      // Save to AsyncStorage for the customer using both keys for redundancy
      await AsyncStorage.setItem(
        activeTripKey,
        JSON.stringify(customerTripData)
      );

      // Также сохраняем полную информацию о заказе в отдельном ключе
      await AsyncStorage.setItem(userRequestsKey, JSON.stringify(trip));

      console.log(
        `Trip data saved for customer: ${activeTripKey} and ${userRequestsKey}`
      );
    } catch (error) {
      console.error("Error updating customer trip data:", error);
    }
  }

  // Method to broadcast trip events to all instances
  private static async broadcastTripEvent(event: {
    type: string;
    tripId: string;
    driverId: string;
    driverName: string;
    customerId: string;
    timestamp: number;
  }) {
    try {
      // Get existing events
      const eventsJson = await AsyncStorage.getItem(this.BROADCAST_KEY);
      const events = eventsJson ? JSON.parse(eventsJson) : [];

      // Add new event
      events.push(event);

      // Keep only the last 20 events
      const recentEvents = events.slice(-20);

      // Store back
      await AsyncStorage.setItem(
        this.BROADCAST_KEY,
        JSON.stringify(recentEvents)
      );

      console.log(`Event broadcast: ${event.type} for trip ${event.tripId}`);
    } catch (error) {
      console.error("Error broadcasting event:", error);
    }
  }

  // Method to get latest broadcast events
  static async getLatestEvents(since: number = 0): Promise<any[]> {
    try {
      const eventsJson = await AsyncStorage.getItem(this.BROADCAST_KEY);
      if (!eventsJson) return [];

      const events = JSON.parse(eventsJson);
      return events.filter((event: any) => event.timestamp > since);
    } catch (error) {
      console.error("Error getting broadcast events:", error);
      return [];
    }
  }

  // Get trip events for a specific user
  static async getTripEventsForUser(
    userId: string,
    since: number = 0
  ): Promise<any[]> {
    try {
      const events = await this.getLatestEvents(since);
      return events.filter(
        (event: any) => event.customerId === userId || event.driverId === userId
      );
    } catch (error) {
      console.error("Error getting user events:", error);
      return [];
    }
  }

  // Update trip status - new method for the trip status update endpoint
  static async updateTripStatus(tripId: string, status: string): Promise<any> {
    try {
      console.log(`Updating trip status: ${tripId} to ${status}`);

      // Get the trip from local storage
      const existingRequestsJson = await AsyncStorage.getItem("taxiRequests");
      const existingRequests: TaxiRequest[] = existingRequestsJson
        ? JSON.parse(existingRequestsJson)
        : [];

      const tripToUpdate = existingRequests.find((req) => req.id === tripId);

      if (!tripToUpdate) {
        throw new Error("Trip not found in local storage");
      }

      // Try to update the trip status on the server if we have a valid token
      const token = await getAuthToken();
      if (token) {
        try {
          // Build query parameters for GET request
          const params = new URLSearchParams({
            trip_id: tripId,
            status: this.convertStatusToApi(status),
          });

          const response = await fetch(
            `${this.API_URL}/trips/status?${params.toString()}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                ...createAuthHeaderSync(token),
              },
            }
          );

          if (!response.ok) {
            console.log(
              `Error updating trip status on server: ${response.status}`
            );
          } else {
            console.log("Trip status updated on server successfully");
          }
        } catch (error) {
          console.error("Error updating trip status on server:", error);
          // Continue with local update
        }
      }

      // Update trip status locally
      const updatedTrip = {
        ...tripToUpdate,
        status: this.convertApiStatus(status),
        updatedAt: new Date().toISOString(),
      };

      // Update in main requests storage
      const updatedRequests = existingRequests.map((req) =>
        req.id === tripId ? updatedTrip : req
      );
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(updatedRequests)
      );

      // Update in customer-specific storage
      const customerId = tripToUpdate.customer.id;
      const userRequestsKey = `taxiRequests_${customerId}`;
      const userRequestsJson = await AsyncStorage.getItem(userRequestsKey);

      if (userRequestsJson) {
        const userRequests = JSON.parse(userRequestsJson);
        const updatedUserRequests = userRequests.map((req: TaxiRequest) =>
          req.id === tripId ? updatedTrip : req
        );
        await AsyncStorage.setItem(
          userRequestsKey,
          JSON.stringify(updatedUserRequests)
        );
      }

      // Update the active trip key for customer
      const activeTripKey = `active_trip_${customerId}`;
      const activeTripJson = await AsyncStorage.getItem(activeTripKey);

      if (activeTripJson) {
        const activeTrip = JSON.parse(activeTripJson);
        activeTrip.status = this.convertApiStatus(status);
        activeTrip.lastUpdated = Date.now();
        await AsyncStorage.setItem(activeTripKey, JSON.stringify(activeTrip));
      }

      // Update the full trip object
      const userRequestKey = `user_active_request_${customerId}`;
      await AsyncStorage.setItem(userRequestKey, JSON.stringify(updatedTrip));

      // Update or clear driver's active trip
      const driverId = tripToUpdate.driverId;
      if (driverId) {
        if (
          status === "COMPLETED" ||
          status === "CANCELLED" ||
          status.toUpperCase() === "COMPLETED" ||
          status.toUpperCase() === "CANCELLED"
        ) {
          // Clear driver's active trip
          await AsyncStorage.removeItem(`driver_active_trip_${driverId}`);
        } else {
          // Update driver's active trip
          await AsyncStorage.setItem(
            `driver_active_trip_${driverId}`,
            JSON.stringify(updatedTrip)
          );
        }
      }

      // Broadcast event
      await this.broadcastTripEvent({
        type: `trip_${status.toLowerCase()}`,
        tripId: tripId,
        driverId: driverId || "unknown",
        driverName: "Driver", // We don't know the name here
        customerId: customerId.toString(),
        timestamp: Date.now(),
      });

      return updatedTrip;
    } catch (error) {
      console.error("Error in updateTripStatus:", error);
      throw error;
    }
  }

  // Get the active trip for the current driver
  static async getDriverActiveTrip(): Promise<TaxiRequest | null> {
    try {
      // Get auth token to check the driver ID
      const token = await getAuthToken();
      if (!token) {
        console.log("No auth token for getting active trip");
        return null;
      }

      // Try to get driver ID from user info
      let driverId = "unknown";
      try {
        // Получаем ID из токена, если возможно
        if (token.includes(":")) {
          const tokenParts = token.split(":");
          if (tokenParts.length > 0) {
            driverId = tokenParts[0];
          }
        }
        // Или пытаемся получить из AsyncStorage
        else {
          const userJson = await AsyncStorage.getItem("user");
          if (userJson) {
            const user = JSON.parse(userJson);
            if (user && user.id) {
              driverId = user.id.toString();
            }
          }
        }
      } catch (error) {
        console.log("Error extracting driver ID:", error);
      }

      console.log(`Checking active trip for driver ${driverId}`);

      // Check local storage for driver's active trip
      const tripJson = await AsyncStorage.getItem(
        `driver_active_trip_${driverId}`
      );
      if (tripJson) {
        const trip = JSON.parse(tripJson);
        console.log(`Found active trip for driver: ${trip.id}`);
        return trip;
      }

      // If no active trip found, check taxiRequests and see if any are assigned to this driver
      const requestsJson = await AsyncStorage.getItem("taxiRequests");
      if (requestsJson) {
        const requests: TaxiRequest[] = JSON.parse(requestsJson);
        const driverTrip = requests.find(
          (req) => req.driverId === driverId && req.status === "accepted"
        );

        if (driverTrip) {
          console.log(`Found active trip in main storage: ${driverTrip.id}`);

          // Save it to driver's active trip for future reference
          await AsyncStorage.setItem(
            `driver_active_trip_${driverId}`,
            JSON.stringify(driverTrip)
          );

          return driverTrip;
        }
      }

      console.log("No active trip found for driver");
      return null;
    } catch (error) {
      console.error("Error in getDriverActiveTrip:", error);
      return null;
    }
  }

  // Get pending trips from the API - using the new available trips endpoint for drivers
  static async getPendingTrips(): Promise<TaxiRequest[]> {
    try {
      console.log("Getting available trips for driver...");

      // Check if we have a proper token
      const token = await getAuthToken();
      if (!token) {
        console.log("No auth token available - returning demo data");
        return DEMO_AVAILABLE_TRIPS.map((trip) => ({
          id: trip.id,
          customer: {
            id: 0,
            name: trip.customerName,
          },
          pickup: {
            name: trip.sourceAddress,
            coordinates: {
              latitude: 0,
              longitude: 0,
            },
          },
          destination: {
            name: trip.destinationAddress,
            coordinates: {
              latitude: 0,
              longitude: 0,
            },
          },
          fare: trip.price,
          timestamp: new Date(trip.createdAt).getTime(),
          status: this.convertApiStatus(trip.status),
          driverId: null,
        }));
      }

      // Special case for demo driver token
      if (isDriverToken(token)) {
        console.log("Using demo driver token - returning demo data");
        return DEMO_AVAILABLE_TRIPS.map((trip) => ({
          id: trip.id,
          customer: {
            id: 0,
            name: trip.customerName,
          },
          pickup: {
            name: trip.sourceAddress,
            coordinates: {
              latitude: 0,
              longitude: 0,
            },
          },
          destination: {
            name: trip.destinationAddress,
            coordinates: {
              latitude: 0,
              longitude: 0,
            },
          },
          fare: trip.price,
          timestamp: new Date(trip.createdAt).getTime(),
          status: this.convertApiStatus(trip.status),
          driverId: null,
        }));
      }

      // Create headers synchronously
      const headers = createAuthHeaderSync(token);
      console.log("Headers for available trips:", JSON.stringify(headers));

      const response = await fetch(`${this.API_URL}/trips/available`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error fetching available trips: ${response.status} - ${errorText}`
        );

        // Fallback to demo data if unauthorized or error
        if (response.status === 401) {
          console.log("Unauthorized - falling back to demo driver data");
          return DEMO_AVAILABLE_TRIPS.map((trip) => ({
            id: trip.id,
            customer: {
              id: 0,
              name: trip.customerName,
            },
            pickup: {
              name: trip.sourceAddress,
              coordinates: {
                latitude: 0,
                longitude: 0,
              },
            },
            destination: {
              name: trip.destinationAddress,
              coordinates: {
                latitude: 0,
                longitude: 0,
              },
            },
            fare: trip.price,
            timestamp: new Date(trip.createdAt).getTime(),
            status: this.convertApiStatus(trip.status),
            driverId: null,
          }));
        }

        throw new Error(`${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Available trips data:", JSON.stringify(data));
      return data.map((trip: any) => ({
        id: trip.id.toString(),
        customer: {
          id: trip.user_id,
          name: trip.client?.name || "Customer",
        },
        pickup: {
          name: trip.from_address,
          coordinates: {
            latitude: 0, // These would need to be provided by the API
            longitude: 0,
          },
        },
        destination: {
          name: trip.to_address,
          coordinates: {
            latitude: 0, // These would need to be provided by the API
            longitude: 0,
          },
        },
        fare: parseFloat(trip.price),
        timestamp: new Date(trip.created_at).getTime(),
        status: this.convertApiStatus(trip.status),
        driverId: null,
        // Add additional fields from the new API
        tariff: trip.tariff,
        distance_km: parseFloat(trip.distance_km),
      }));
    } catch (error) {
      console.error("Error in getPendingTrips:", error);
      // Return demo data on any error for testing
      return DEMO_AVAILABLE_TRIPS.map((trip) => ({
        id: trip.id,
        customer: {
          id: 0,
          name: trip.customerName,
        },
        pickup: {
          name: trip.sourceAddress,
          coordinates: {
            latitude: 0,
            longitude: 0,
          },
        },
        destination: {
          name: trip.destinationAddress,
          coordinates: {
            latitude: 0,
            longitude: 0,
          },
        },
        fare: trip.price,
        timestamp: new Date(trip.createdAt).getTime(),
        status: this.convertApiStatus(trip.status),
        driverId: null,
      }));
    }
  }

  // Get trip history for a user
  static async getTripHistory(): Promise<any[]> {
    try {
      // Get auth token
      const token = await getAuthToken();
      console.log(
        "Auth token for history:",
        token ? "Token exists" : "No token found"
      );

      if (!token) {
        console.log("No auth token found for trip history API call");
        return [];
      }

      console.log("Making trip history API call with token");
      const response = await fetch(`${this.API_URL}/trips/history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...createAuthHeaderSync(token),
        },
      });

      console.log("Trip history API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Trip history API error response:", errorText);
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Trip history API data received:", data);

      // Check if data is an object with trips property or just an array
      if (data && data.trips && Array.isArray(data.trips)) {
        return data.trips;
      } else if (Array.isArray(data)) {
        return data;
      }

      console.log("Unexpected data format received:", data);
      return [];
    } catch (error) {
      console.error("Error fetching trip history:", error);
      return [];
    }
  }

  // Check authentication status
  static async checkAuth(): Promise<{
    isAuthenticated: boolean;
    message: string;
    userId?: number;
  }> {
    try {
      const token = await getAuthToken();
      console.log(
        "Checking auth with token:",
        token ? "Token exists" : "No token found"
      );

      if (!token) {
        return {
          isAuthenticated: false,
          message: "No authentication token found",
        };
      }

      console.log("Making auth check API call with token");
      const response = await fetch(`${this.API_URL}/auth/check`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...createAuthHeaderSync(token),
        },
      });

      console.log("Auth check response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Auth check API error response:", errorText);
        return {
          isAuthenticated: false,
          message: `Authentication failed: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        isAuthenticated: true,
        message: "Authentication successful",
        userId: data.user?.id,
      };
    } catch (error) {
      console.error("Auth check error:", error);
      return {
        isAuthenticated: false,
        message: `Error checking authentication: ${error}`,
      };
    }
  }

  // Save a request to local storage for offline access
  private static async saveLocalRequest(request: TaxiRequest): Promise<void> {
    try {
      const existingRequestsJson = await AsyncStorage.getItem("taxiRequests");
      const existingRequests: TaxiRequest[] = existingRequestsJson
        ? JSON.parse(existingRequestsJson)
        : [];

      const updatedRequests = [...existingRequests, request];
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(updatedRequests)
      );
    } catch (error) {
      console.error("Error saving request to local storage:", error);
    }
  }

  // Fallback method to create a request locally if API fails
  private static async createLocalRequest(tripData: {
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
  }): Promise<TaxiRequest | null> {
    try {
      const existingRequestsJson = await AsyncStorage.getItem("taxiRequests");
      const existingRequests: TaxiRequest[] = existingRequestsJson
        ? JSON.parse(existingRequestsJson)
        : [];

      const newRequest: TaxiRequest = {
        ...tripData,
        id: "req_" + Date.now().toString(),
        timestamp: Date.now(),
        status: "pending",
        driverId: null,
      };

      const updatedRequests = [...existingRequests, newRequest];
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(updatedRequests)
      );

      console.log("Created local taxi request:", newRequest);
      return newRequest;
    } catch (error) {
      console.error("Error creating local taxi request:", error);
      return null;
    }
  }

  // Convert API status to app status
  private static convertApiStatus(
    apiStatus: string
  ): "pending" | "accepted" | "completed" | "cancelled" {
    switch (apiStatus.toLowerCase()) {
      case "pending":
        return "pending";
      case "accepted":
      case "in_progress":
        return "accepted";
      case "completed":
        return "completed";
      case "cancelled":
      default:
        return "cancelled";
    }
  }

  // Calculate distance between two points using Haversine formula
  private static calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in kilometers

    const dLat = toRad(point2.latitude - point1.latitude);
    const dLon = toRad(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(point1.latitude)) *
        Math.cos(toRad(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return parseFloat(distance.toFixed(1));
  }

  // Convert UI-friendly status to API format
  static convertStatusToApi(status: string): string {
    // Convert UI-friendly status to API format
    const statusMap: Record<string, string> = {
      PENDING: "PENDING",
      ACCEPTED: "ACCEPTED",
      ON_THE_WAY: "DRIVER_ON_THE_WAY",
      ARRIVED: "DRIVER_ARRIVED",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
      pending: "PENDING",
      accepted: "ACCEPTED",
      on_the_way: "DRIVER_ON_THE_WAY",
      completed: "COMPLETED",
      cancelled: "CANCELLED",
    };

    return statusMap[status] || status;
  }

  // Fix the cancelTrip method to use the correct endpoint with GET request
  static async cancelTrip(tripId: string): Promise<boolean> {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available for cancel trip");
        return false;
      }

      console.log(`Cancelling trip ${tripId}`);

      // Формируем правильный заголовок авторизации
      const authHeader = createAuthHeaderSync(token);

      // Build query parameters for GET request
      const params = new URLSearchParams({
        trip_id: tripId.toString(), // Ensure tripId is a string
      });

      // Try to cancel via API first
      try {
        const response = await fetch(
          `${this.API_URL}/trips/cancel?${params.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...authHeader,
            },
          }
        );

        if (!response.ok) {
          console.log("API cancel failed:", response.status);
          // Continue with local cancellation even if API fails
        } else {
          console.log("Trip successfully cancelled via API");
        }
      } catch (apiError) {
        console.error("API cancel error:", apiError);
        // Continue with local cancellation
      }

      // Always perform local cancellation
      console.log("Performing local cancellation");

      // Update trip status locally
      await this.updateTripStatus(tripId, "CANCELLED");

      // Clear active trip from storage and get trip data
      let customerId: string | undefined;
      let driverId: string | undefined;

      const requestsJson = await AsyncStorage.getItem("taxiRequests");
      if (!requestsJson) {
        console.log("No local trips found, resetting state");
        // Reset global state
        globalState.activeTaxiTrip = false;
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
          driverLocation: null,
          customerLocation: null,
          lastLocationUpdate: null,
          estimatedArrival: null,
        };
        globalState.pickupCoordinates = null;
        globalState.destinationCoordinates = null;
        globalState.needsNewOrder = true;
        globalState.isSearchingDriver = false;
        globalState.driverFound = false;
        globalState.driverLocation = null;
        globalState.customerLocation = null;

        return true;
      }

      const requests: TaxiRequest[] = JSON.parse(requestsJson);
      const tripToCancel = requests.find((req) => req.id === tripId);

      if (!tripToCancel) {
        console.log("Trip not found locally, resetting state");
        // Reset global state
        globalState.activeTaxiTrip = false;
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
          driverLocation: null,
          customerLocation: null,
          lastLocationUpdate: null,
          estimatedArrival: null,
        };
        globalState.pickupCoordinates = null;
        globalState.destinationCoordinates = null;
        globalState.needsNewOrder = true;
        globalState.isSearchingDriver = false;
        globalState.driverFound = false;
        globalState.driverLocation = null;
        globalState.customerLocation = null;

        return true;
      }

      // Store IDs for later use
      customerId = tripToCancel.customer.id.toString();
      driverId = tripToCancel.driverId || "unknown";

      // Clear user data
      const keysToRemove = [
        `active_trip_${customerId}`,
        `user_active_request_${customerId}`,
        `trip_state_${customerId}`,
        `driver_location_${customerId}`,
        `customer_location_${customerId}`,
        `trip_events_${customerId}`,
      ];
      await AsyncStorage.multiRemove(keysToRemove);

      // Clear driver data
      if (driverId && driverId !== "unknown") {
        await AsyncStorage.removeItem(`driver_active_trip_${driverId}`);
      }

      // Update requests list
      const updatedRequests = requests.filter(
        (req) =>
          req.id !== tripId ||
          (req.status !== "pending" && req.status !== "accepted")
      );
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(updatedRequests)
      );

      // Reset global state
      globalState.activeTaxiTrip = false;
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
        driverLocation: null,
        customerLocation: null,
        lastLocationUpdate: null,
        estimatedArrival: null,
      };
      globalState.pickupCoordinates = null;
      globalState.destinationCoordinates = null;
      globalState.needsNewOrder = true;
      globalState.isSearchingDriver = false;
      globalState.driverFound = false;
      globalState.driverLocation = null;
      globalState.customerLocation = null;

      // Broadcast cancellation event
      await this.broadcastTripEvent({
        type: "trip_cancelled",
        tripId: tripId,
        driverId: driverId,
        driverName: "Unknown Driver",
        customerId: customerId,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error("Error in cancelTrip:", error);
      return false;
    }
  }

  // Add this method to store location updates for drivers and customers
  static async updateUserLocation(
    userId: string | number,
    role: "driver" | "customer",
    location: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
    },
    tripId?: string
  ): Promise<boolean> {
    try {
      if (!userId || !location.latitude || !location.longitude) {
        console.error("Invalid location update data", { userId, location });
        return false;
      }

      // Create location update object
      const locationUpdate: LocationUpdate = {
        userId: userId,
        role: role,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
        tripId: tripId,
        speed: location.speed,
        heading: location.heading,
        accuracy: location.accuracy,
      };

      // Store current location for this user
      const locationKey = `${role}_location_${userId}`;
      await AsyncStorage.setItem(locationKey, JSON.stringify(locationUpdate));

      // If this is part of an active trip, also update trip-specific location
      if (tripId) {
        const tripLocationKey = `trip_${tripId}_${role}_location`;
        await AsyncStorage.setItem(
          tripLocationKey,
          JSON.stringify(locationUpdate)
        );

        // Broadcast location update for real-time tracking
        await this.broadcastTripUpdate({
          type:
            role === "driver"
              ? "DRIVER_LOCATION_UPDATE"
              : "CUSTOMER_LOCATION_UPDATE",
          payload: {
            id: tripId,
            [role]: {
              id: userId,
              location: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
            },
          } as any,
        });

        // If we have a valid auth token, also try to update on server
        const token = await getAuthToken();
        if (token) {
          try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append("user_id", userId.toString());
            params.append("role", role);
            params.append("latitude", location.latitude.toString());
            params.append("longitude", location.longitude.toString());
            params.append("trip_id", tripId);

            if (location.speed !== undefined)
              params.append("speed", location.speed.toString());
            if (location.heading !== undefined)
              params.append("heading", location.heading.toString());
            if (location.accuracy !== undefined)
              params.append("accuracy", location.accuracy.toString());

            // Try to update location on server - don't wait for response
            fetch(`${this.API_URL}/location/update?${params.toString()}`, {
              method: "GET",
              headers: createAuthHeaderSync(token),
            }).catch((error) => {
              // Silently fail if server update fails - we've already saved locally
              console.log("Server location update failed:", error);
            });
          } catch (error) {
            console.log("Error sending location update to server:", error);
          }
        }
      }

      // Also store location history (last 20 locations)
      const historyKey = `${role}_location_history_${userId}`;
      const historyJson = await AsyncStorage.getItem(historyKey);
      const locationHistory = historyJson ? JSON.parse(historyJson) : [];

      // Add new location to history
      locationHistory.push(locationUpdate);

      // Keep only last 20 locations
      const recentLocations = locationHistory.slice(-20);

      // Save updated history
      await AsyncStorage.setItem(historyKey, JSON.stringify(recentLocations));

      return true;
    } catch (error) {
      console.error("Error updating user location:", error);
      return false;
    }
  }

  // Get the current location of a user by ID and role
  static async getUserLocation(
    userId: string | number,
    role: "driver" | "customer"
  ): Promise<LocationUpdate | null> {
    try {
      const locationKey = `${role}_location_${userId}`;
      const locationJson = await AsyncStorage.getItem(locationKey);

      if (!locationJson) {
        console.log(`No location found for ${role} ${userId}`);
        return null;
      }

      const location = JSON.parse(locationJson);

      // Check if location is too old (more than 5 minutes)
      const now = Date.now();
      if (now - location.timestamp > 5 * 60 * 1000) {
        console.log(
          `Location for ${role} ${userId} is outdated (${Math.round(
            (now - location.timestamp) / 1000 / 60
          )} minutes old)`
        );
      }

      return location;
    } catch (error) {
      console.error(`Error getting ${role} location:`, error);
      return null;
    }
  }

  // Get location history for a user
  static async getUserLocationHistory(
    userId: string | number,
    role: "driver" | "customer"
  ): Promise<LocationUpdate[]> {
    try {
      const historyKey = `${role}_location_history_${userId}`;
      const historyJson = await AsyncStorage.getItem(historyKey);

      if (!historyJson) {
        return [];
      }

      return JSON.parse(historyJson);
    } catch (error) {
      console.error(`Error getting ${role} location history:`, error);
      return [];
    }
  }

  // Get locations for all participants in a trip
  static async getTripLocations(tripId: string): Promise<{
    driver: LocationUpdate | null;
    customer: LocationUpdate | null;
  }> {
    try {
      // Get trip details to find user IDs
      const trip = await this.getRequestById(tripId);

      if (!trip) {
        console.log(`Trip ${tripId} not found for location tracking`);
        return { driver: null, customer: null };
      }

      // Get locations from trip-specific keys
      const driverLocationKey = `trip_${tripId}_driver_location`;
      const customerLocationKey = `trip_${tripId}_customer_location`;

      const driverLocationJson = await AsyncStorage.getItem(driverLocationKey);
      const customerLocationJson = await AsyncStorage.getItem(
        customerLocationKey
      );

      const driverLocation = driverLocationJson
        ? JSON.parse(driverLocationJson)
        : null;
      const customerLocation = customerLocationJson
        ? JSON.parse(customerLocationJson)
        : null;

      return {
        driver: driverLocation,
        customer: customerLocation,
      };
    } catch (error) {
      console.error("Error getting trip locations:", error);
      return { driver: null, customer: null };
    }
  }

  // Calculate ETA based on current positions
  static async calculateETA(tripId: string): Promise<{
    etaSeconds: number | null;
    distanceRemaining: number | null;
  }> {
    try {
      const locations = await this.getTripLocations(tripId);
      const trip = await this.getRequestById(tripId);

      if (!locations.driver || !trip) {
        return { etaSeconds: null, distanceRemaining: null };
      }

      // If trip is in the "accepted" state, calculate ETA to pickup location
      // Otherwise calculate ETA to destination
      const targetLocation =
        trip.status === "accepted"
          ? trip.pickup.coordinates
          : trip.destination.coordinates;

      // Calculate distance remaining
      const distanceRemaining = this.calculateDistance(
        {
          latitude: locations.driver.latitude,
          longitude: locations.driver.longitude,
        },
        targetLocation
      );

      // Estimate speed if not available (30 km/h = 8.33 m/s)
      const speedMPS = locations.driver.speed ? locations.driver.speed : 8.33;

      // If speed is very low, use a minimum speed for ETA calculation
      const effectiveSpeedMPS = Math.max(speedMPS, 5);

      // Convert distance from km to meters
      const distanceMeters = distanceRemaining * 1000;

      // Calculate ETA in seconds
      const etaSeconds = Math.round(distanceMeters / effectiveSpeedMPS);

      return {
        etaSeconds: etaSeconds,
        distanceRemaining: distanceRemaining,
      };
    } catch (error) {
      console.error("Error calculating ETA:", error);
      return { etaSeconds: null, distanceRemaining: null };
    }
  }

  // Get the request by ID (use existing method or implement it)
  static async getRequestById(requestId: string): Promise<TaxiRequest | null> {
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
  }

  // Add a method to send a completed trip to history
  static async sendTripToHistory(tripId: string): Promise<boolean> {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available for sending trip to history");
        return false;
      }

      console.log(`Sending trip ${tripId} to history`);

      // Create auth header
      const authHeader = createAuthHeaderSync(token);

      // Build query parameters for GET request
      const params = new URLSearchParams({
        trip_id: tripId,
      });

      // Try multiple approaches (GET and POST) to ensure compatibility
      let successful = false;

      // First try with GET
      try {
        const getResponse = await fetch(
          `${this.API_URL}/trips/history?${params.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...authHeader,
            },
          }
        );

        if (getResponse.ok) {
          console.log("Trip successfully sent to history via GET");
          successful = true;
        } else {
          console.log(
            "Failed to send trip to history via GET:",
            getResponse.status
          );
        }
      } catch (getError) {
        console.error("Error sending trip to history via GET:", getError);
      }

      // If GET failed, try with POST
      if (!successful) {
        try {
          const postResponse = await fetch(`${this.API_URL}/trips/history`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeader,
            },
            body: JSON.stringify({ trip_id: tripId }),
          });

          if (postResponse.ok) {
            console.log("Trip successfully sent to history via POST");
            successful = true;
          } else {
            console.log(
              "Failed to send trip to history via POST:",
              postResponse.status
            );
          }
        } catch (postError) {
          console.error("Error sending trip to history via POST:", postError);
        }
      }

      // Also update local trip data to mark as "history"
      try {
        // Get the trip from storage
        const trip = await this.getRequestById(tripId);
        if (trip) {
          // Update the trip status to completed if it's not already
          if (trip.status !== "completed") {
            trip.status = "completed";
          }

          // Add a history flag
          (trip as any).inHistory = true;

          // Save the updated trip
          const existingRequestsJson = await AsyncStorage.getItem(
            "taxiRequests"
          );
          const existingRequests: TaxiRequest[] = existingRequestsJson
            ? JSON.parse(existingRequestsJson)
            : [];

          // Find and update the trip in the list
          const updatedRequests = existingRequests.map((req) =>
            req.id === tripId
              ? { ...req, status: "completed", inHistory: true }
              : req
          );

          await AsyncStorage.setItem(
            "taxiRequests",
            JSON.stringify(updatedRequests)
          );

          console.log("Trip marked as history in local storage");
        }
      } catch (localError) {
        console.error("Error updating local trip data:", localError);
      }

      return successful;
    } catch (error) {
      console.error("Error in sendTripToHistory:", error);
      return false;
    }
  }

  // Get the active trip for the current user
  static async getUserActiveTrip(): Promise<TaxiRequest | null> {
    try {
      // Get auth token and user info
      const token = await getAuthToken();
      if (!token) {
        console.log("No auth token for getting user active trip");
        return null;
      }

      let userId: string | null = null;

      // Try to get user ID from AsyncStorage
      const userJson = await AsyncStorage.getItem("user");
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user && user.id) {
          userId = user.id.toString();
        }
      }

      if (!userId) {
        console.log("No user ID found");
        return null;
      }

      console.log(`Checking active trip for user ${userId}`);

      // First try to get from API
      try {
        const response = await fetch(`${this.API_URL}/trips/active`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const tripData = await response.json();
          if (tripData) {
            console.log("Found active trip in API:", tripData);
            return {
              id: tripData.id.toString(),
              customer: {
                id: tripData.user_id,
                name: tripData.user_name || "Customer",
              },
              pickup: {
                name: tripData.from_address,
                coordinates: tripData.pickup_coordinates || {
                  latitude: 0,
                  longitude: 0,
                },
              },
              destination: {
                name: tripData.to_address,
                coordinates: tripData.destination_coordinates || {
                  latitude: 0,
                  longitude: 0,
                },
              },
              fare: tripData.price,
              timestamp: new Date(tripData.created_at).getTime(),
              status: this.convertApiStatus(tripData.status),
              driverId: tripData.driver_id,
              driver: tripData.driver
                ? {
                    id: tripData.driver.id.toString(),
                    name: tripData.driver.name || "Unknown Driver",
                    photo: tripData.driver.photo || undefined,
                    rating:
                      typeof tripData.driver.rating === "number"
                        ? tripData.driver.rating
                        : undefined,
                    car: tripData.driver.car || undefined,
                    licensePlate: tripData.driver.license_plate || undefined,
                  }
                : undefined,
            };
          }
        }
      } catch (apiError) {
        console.log(
          "Error fetching from API, falling back to local storage:",
          apiError
        );
      }

      // If no trip found in API, check local storage
      const userRequestKey = `user_active_request_${userId}`;
      const tripJson = await AsyncStorage.getItem(userRequestKey);

      if (tripJson) {
        const trip = JSON.parse(tripJson);
        console.log(`Found active trip in local storage: ${trip.id}`);
        return trip;
      }

      // If still no trip found, check main requests storage
      const requestsJson = await AsyncStorage.getItem("taxiRequests");
      if (requestsJson) {
        const requests: TaxiRequest[] = JSON.parse(requestsJson);
        const userTrip = requests.find(
          (req) =>
            req.customer.id.toString() === userId &&
            (req.status === "accepted" || req.status === "pending")
        );

        if (userTrip) {
          console.log(`Found active trip in main storage: ${userTrip.id}`);
          // Save it to user's active request for future reference
          await AsyncStorage.setItem(userRequestKey, JSON.stringify(userTrip));
          return userTrip;
        }
      }

      console.log("No active trip found for user");
      return null;
    } catch (error) {
      console.error("Error in getUserActiveTrip:", error);
      return null;
    }
  }
}
