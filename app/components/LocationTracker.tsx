import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  AppState,
  Alert,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { useAuth } from "../auth/AuthContext";
import { TaxiService } from "../services/TaxiService";
import { globalState } from "../store/globalState";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configuration options
const LOCATION_CONFIG = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 3000, // 3 seconds interval for updates
  distanceInterval: 5, // 5 meters minimum movement
  mayShowUserSettingsDialog: false,
};

type LocationTrackerProps = {
  isActive?: boolean;
  tripId?: string;
  onLocationUpdate?: (location: Location.LocationObject) => void;
};

const LocationTracker: React.FC<LocationTrackerProps> = ({
  isActive = true,
  tripId,
  onLocationUpdate,
}) => {
  const { user } = useAuth();
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  // Function to request location permissions
  const requestLocationPermissions = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return false;

      if (Platform.OS !== "web") {
        await Location.requestBackgroundPermissionsAsync();
      }
      return true;
    } catch {
      return false;
    }
  };

  // Function to start location tracking
  const startLocationTracking = async () => {
    if (!isActive || !user) return;

    try {
      // Stop any existing subscription
      stopLocationTracking();

      // Request permissions silently
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        console.log("No permission to track location");
        return;
      }

      // Get current location first with high accuracy
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: LOCATION_CONFIG.accuracy,
      });

      // Update state with current location
      if (onLocationUpdate) {
        onLocationUpdate(currentLocation);
      }

      // Determine user role
      const userRole = user.role
        ? user.role.includes("driver")
          ? "driver"
          : "customer"
        : "customer";

      // Update service with current location
      await updateLocationInService(currentLocation, userRole);

      // Start watching position with high accuracy
      locationSubscription.current = await Location.watchPositionAsync(
        LOCATION_CONFIG,
        (newLocation) => {
          if (onLocationUpdate) {
            onLocationUpdate(newLocation);
          }
          updateLocationInService(newLocation, userRole);
        }
      );

      console.log(`Location tracking started for ${userRole}`);
    } catch {
      // Silently handle any errors
    }
  };

  // Function to stop location tracking
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
      console.log("Location tracking stopped");
    }
  };

  // Function to update location in service and global state
  const updateLocationInService = async (
    locationData: Location.LocationObject,
    role: "driver" | "customer"
  ) => {
    try {
      if (!user || !user.id) return;

      const userId = user.id.toString();

      const locationToSave = {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        speed: locationData.coords.speed || 0,
        heading: locationData.coords.heading || 0,
        accuracy: locationData.coords.accuracy || 0,
      };

      // Update service
      await TaxiService.updateUserLocation(
        userId,
        role,
        locationToSave,
        tripId
      );

      // Update global state
      const locationInfo = {
        coordinates: {
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
        },
        timestamp: locationData.timestamp,
        speed: locationData.coords.speed || 0,
        heading: locationData.coords.heading || 0,
        accuracy: locationData.coords.accuracy || 0,
      };

      if (role === "driver") {
        globalState.driverLocation = locationInfo;
        if (globalState.tripData.isActive) {
          globalState.tripData.driverLocation = locationInfo;
          globalState.tripData.lastLocationUpdate = Date.now();
        }
      } else {
        globalState.customerLocation = locationInfo;
        if (globalState.tripData.isActive) {
          globalState.tripData.customerLocation = locationInfo;
          globalState.tripData.lastLocationUpdate = Date.now();
        }
      }

      if (globalState.activeTaxiTrip) {
        try {
          const locationKey = `${role}_current_location`;
          await AsyncStorage.setItem(locationKey, JSON.stringify(locationInfo));

          if (tripId) {
            const tripLocationKey = `trip_${tripId}_${role}_location`;
            await AsyncStorage.setItem(
              tripLocationKey,
              JSON.stringify(locationInfo)
            );
          }

          if (tripId && role === "driver") {
            const etaInfo = await TaxiService.calculateETA(tripId);
            if (etaInfo.etaSeconds) {
              globalState.tripData.estimatedArrival = etaInfo.etaSeconds;
            }
          }
        } catch (error) {
          console.error("Error saving location to AsyncStorage:", error);
        }
      }
    } catch {
      // Silently handle any errors
    }
  };

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("App has come to the foreground!");
        startLocationTracking();
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Start location tracking when component mounts or becomes active
  useEffect(() => {
    if (isActive) {
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [isActive, user, tripId]);

  // Return null instead of error view
  return null;
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: "#ffeeee",
    borderRadius: 5,
    marginVertical: 5,
  },
  errorText: {
    color: "red",
    fontSize: 14,
  },
});

export default LocationTracker;
