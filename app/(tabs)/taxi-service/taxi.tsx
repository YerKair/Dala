import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
  ScrollView,
  RefreshControl,
  Animated,
  LayoutAnimation,
  UIManager,
  Modal,
  Switch,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  globalState,
  tripManager,
  taxiRequestsManager,
  TaxiRequest,
  restoreTripState,
  checkUserActiveTrip,
  forceResetTripState,
} from "../../store/globalState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useAuth } from "../../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userStore } from "../../store/userStore";
import { MaterialIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import SonarAnimation from "../../../components/SonarAnimation";
import { useTranslation } from "react-i18next";
import { TaxiService, setGlobalToken } from "../../services/TaxiService";
import LocationTracker from "../../components/LocationTracker";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

// Обновить структуру типа Address, добавив latitude и longitude
type Address = {
  id: string;
  name: string;
  fullAddress: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  latitude: number;
  longitude: number;
};

interface TaxiRequestExtended extends TaxiRequest {
  estimatedTime?: number;
}

interface CarType {
  id: string;
  name: string;
  icon: string;
  basePrice: number;
  minPrice: number;
  time: string;
  image: any;
}

// Car types with base prices per kilometer
const CAR_TYPES: CarType[] = [
  {
    id: "normal",
    name: "Normal",
    icon: "car-outline",
    basePrice: 200, // Price per kilometer
    minPrice: 1500, // Minimum price
    time: "3-5",
    image: require("../../../assets/images/car-normal.png"),
  },
  {
    id: "minivan",
    name: "Minivan",
    icon: "car-sport-outline",
    basePrice: 300, // Price per kilometer
    minPrice: 2100, // Minimum price
    time: "5-7",
    image: require("../../../assets/images/car-minivan.png"),
  },
  {
    id: "joint",
    name: "Joint trip",
    icon: "car-sport-outline",
    basePrice: 150, // Price per kilometer
    minPrice: 1100, // Minimum price
    time: "7-10",
    image: require("../../../assets/images/car-joint.png"),
  },
];

// Function to calculate distance between two points
const calculateDistanceBetweenPoints = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number => {
  if (!point1 || !point2) return 0;

  // Convert degrees to radians
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lon1 = (point1.longitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const lon2 = (point2.longitude * Math.PI) / 180;

  // Haversine formula
  const dlon = lon2 - lon1;
  const dlat = lat2 - lat1;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  const r = 6371; // Radius of earth in kilometers

  // Return distance in kilometers
  return c * r;
};

// Function to calculate price based on car type and distance
const calculatePrice = (carTypeId: string, distance: number): number => {
  // Find selected car type
  const carType = CAR_TYPES.find((car) => car.id === carTypeId);
  if (!carType) return 0;

  // Calculate price based on distance and base price
  const calculatedPrice = Math.round(distance * carType.basePrice);

  // Apply minimum price if calculated price is too low
  return Math.max(calculatedPrice, carType.minPrice);
};

interface ErrorViewProps {
  error: string;
  onRetry: () => void;
}

const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4A5D23" />
    <Text style={styles.loadingText}>Загрузка...</Text>
  </View>
);

const ErrorView: React.FC<ErrorViewProps> = ({ error, onRetry }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Повторить</Text>
    </TouchableOpacity>
  </View>
);

export default function TaxiOrderScreen() {
  // Move all hooks to the top, before any conditional returns
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const destinationInputRef = useRef<TextInput>(null);
  const { user, token } = useAuth();

  // State declarations - group all useState hooks together
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<
    "location" | "cars" | "requests"
  >("location");
  const [isInitialized, setIsInitialized] = useState(false);
  const [pickupAddress, setPickupAddress] = useState<Address>({
    id: "",
    name: t("taxi.yourLocation"),
    fullAddress: "",
    coordinates: {
      latitude: 43.238949,
      longitude: 76.889709,
    },
    latitude: 43.238949,
    longitude: 76.889709,
  });
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: 43.238949,
    longitude: 76.889709,
  });
  const [destinationAddress, setDestinationAddress] = useState<Address | null>(
    null
  );
  const [destinationInput, setDestinationInput] = useState("");
  const [searchResults, setSearchResults] = useState<Address[]>([]);
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [selectedFare, setSelectedFare] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<TaxiRequestExtended[]>([]);
  const [showDriverControls, setShowDriverControls] = useState(false);
  const [showCarSelection, setShowCarSelection] = useState(false);
  const [selectedCarType, setSelectedCarType] = useState(CAR_TYPES[0].id);
  const [showAddressSelection, setShowAddressSelection] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(true); // Статус определения местоположения
  const [isSearchingDriver, setIsSearchingDriver] = useState(false); // Статус поиска водителя
  const [searchTimeSeconds, setSearchTimeSeconds] = useState(0); // Время поиска водителя в секундах
  const [mapRegion, setMapRegion] = useState({
    latitude: 43.238949,
    longitude: 76.889709,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [tripDistance, setTripDistance] = useState<number>(0);
  const [carPrices, setCarPrices] = useState<{ [key: string]: number }>({});

  // Keyboard state
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const bottomPanelHeight = useRef(new Animated.Value(0)).current;

  // Add a debounce timeout ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers when component unmounts
  useEffect(() => {
    return () => {
      // Clear any active timers
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Check if user has taxi driver role
  useEffect(() => {
    if (user && user.role) {
      const roles = user.role.split(",");
      const hasDriverRole = roles.includes("driver");
      setIsDriver(hasDriverRole);

      // Automatically show driver controls if user is a driver
      if (hasDriverRole) {
        setShowDriverControls(true);
        fetchPendingRequests();
      }
    }
  }, [user]);

  // Add function to refresh orders list for drivers
  const refreshOrdersList = async () => {
    if (!isDriver) return;
    setRefreshing(true);
    await fetchPendingRequests();
    setRefreshing(false);
  };

  // Fetch pending taxi requests from the server
  const fetchPendingRequests = async () => {
    try {
      // Use the TaxiService to get pending trips from the API
      const requests = await TaxiService.getPendingTrips();
      setPendingOrders(requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setPendingOrders([]);
    } finally {
      setRefreshing(false);
    }
  };

  // Driver request item component
  const RequestItem = ({
    request,
    onAccept,
  }: {
    request: TaxiRequestExtended;
    onAccept: (requestId: string) => void;
  }) => {
    // Format timestamp difference
    const timeAgo = getTimeAgo(request.timestamp);

    // Calculate distance between request destination and driver's location
    const distance = calculateDistance(
      userLocation || { latitude: 0, longitude: 0 },
      request.pickup.coordinates
    );

    // Calculate estimated time (5 minutes per km as a rough estimate)
    const estimatedTime = request.estimatedTime || Math.round(distance * 5);

    return (
      <View style={stylesDriver.requestItemContainer}>
        <View style={stylesDriver.requestHeader}>
          <Text style={stylesDriver.requestClient}>
            {request.customer.name || t("taxi.anonymousUser")}
          </Text>
          <Text style={stylesDriver.requestTime}>{timeAgo}</Text>
        </View>

        <View style={stylesDriver.requestDetails}>
          <View style={stylesDriver.requestAddressContainer}>
            <View style={stylesDriver.addressIconContainer}>
              <View style={stylesDriver.driverPickupDot} />
              <View style={stylesDriver.addressLine} />
              <View style={stylesDriver.driverDestinationDot} />
            </View>
            <View style={stylesDriver.addressTextContainer}>
              <Text style={stylesDriver.pickupText}>{request.pickup.name}</Text>
              <Text style={stylesDriver.destinationTextInput}>
                {request.destination.name}
              </Text>
            </View>
          </View>

          <View style={stylesDriver.requestStats}>
            <View style={stylesDriver.statItem}>
              <Text style={stylesDriver.statValue}>{request.fare} ₸</Text>
              <Text style={stylesDriver.statLabel}>{t("taxi.price")}</Text>
            </View>
            <View style={stylesDriver.statItem}>
              <Text style={stylesDriver.statValue}>
                {distance.toFixed(1)} km
              </Text>
              <Text style={stylesDriver.statLabel}>{t("taxi.distance")}</Text>
            </View>
            <View style={stylesDriver.statItem}>
              <Text style={stylesDriver.statValue}>{estimatedTime} min</Text>
              <Text style={stylesDriver.statLabel}>{t("taxi.estTime")}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={stylesDriver.driverAcceptButton}
            onPress={() => onAccept(request.id)}
          >
            <Text style={stylesDriver.driverAcceptButtonText}>
              {t("taxi.acceptRequest")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return `${seconds}${t("taxi.secondsAgo")}`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}${t("taxi.minutesAgo")}`;

    const hours = Math.floor(minutes / 60);
    return `${hours}${t("taxi.hoursAgo")}`;
  };

  // Helper function to calculate distance between two points
  const calculateDistance = (
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number => {
    // Simple calculation for demo purposes
    // In a real app, you would use a proper distance calculation algorithm
    const latDiff = Math.abs(point1.latitude - point2.latitude);
    const lngDiff = Math.abs(point1.longitude - point2.longitude);
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough conversion to km
  };

  // Очистка данных предыдущих поездок при загрузке экрана
  const clearPreviousTripData = () => {
    // Сбрасываем состояние адресов
    setDestinationAddress(null);
    setDestinationInput("");
    setSearchResults([]);

    // Очищаем данные в globalState
    globalState.pickupCoordinates = null;
    globalState.destinationCoordinates = null;

    // Сбрасываем статус поездки, если нет активной поездки
    if (!globalState.activeTaxiTrip) {
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
    }
  };

  // Load data when component mounts
  useEffect(() => {
    // Clear previous trip data
    clearPreviousTripData();

    // Get user location
    getUserLocation();
  }, []);

  // Add state for trip ID tracking
  const [activeTripId, setActiveTripId] = useState<string | undefined>(
    undefined
  );
  const [isDriverMode, setIsDriverMode] = useState<boolean>(false);

  // Add a state for location tracking toggle
  const [locationTrackingEnabled, setLocationTrackingEnabled] =
    useState<boolean>(true);

  // Update the checkForActiveTrip function to set active trip ID
  const checkForActiveTrip = async () => {
    try {
      if (!user || !user.id) {
        console.log("No user detected, skipping trip check");
        return;
      }

      const userId = user.id.toString();
      // Check if user is a driver
      const userRoles = user?.role ? user.role.split(",") : [];
      const isDriver = userRoles.includes("driver");
      setIsDriverMode(isDriver);

      // Security check: Reset any trip data that doesn't belong to current user
      if (globalState.activeTaxiTrip && globalState.tripData.isActive) {
        // For drivers, check if they're assigned to this trip
        if (isDriver && globalState.tripData.driverId !== userId) {
          console.log(
            "Security: Driver accessing trip they're not assigned to, resetting"
          );
          // Clear the global trip data to prevent data leakage
          tripManager.startOrderFlow();
        }
        // For customers, check if the trip belongs to them (for now just reset, in a real app we'd check against backend)
        else if (!isDriver) {
          console.log("Security: Verifying customer trip ownership");
          const activeRequest = await taxiRequestsManager.getUserActiveRequest(
            userId
          );
          if (!activeRequest) {
            console.log(
              "Security: No active request found for customer, resetting global trip data"
            );
            tripManager.startOrderFlow();
          } else {
            // Set the active trip ID for tracking
            setActiveTripId(activeRequest.id);
          }
        } else if (isDriver) {
          // For drivers who are assigned to this trip, get the trip ID
          const driverActiveTrip = await TaxiService.getDriverActiveTrip();
          if (driverActiveTrip) {
            setActiveTripId(driverActiveTrip.id);
          }
        }
      } else {
        // No active trip, check if there's one in the backend
        const activeRequest = await taxiRequestsManager.getUserActiveRequest(
          userId
        );
        if (activeRequest) {
          setActiveTripId(activeRequest.id);
        } else {
          setActiveTripId(undefined);
        }
      }

      // If the user is a driver visiting the taxi screen, they should see the list
      // of available requests, not redirect to a trip screen unless they've accepted one
      if (isDriver && !globalState.activeTaxiTrip) {
        console.log("Driver mode: Showing available requests");
        setShowDriverControls(true);
        // Fetch pending requests for the driver to see
        fetchPendingRequests();
        return;
      }

      // Continue with normal flow for customer
      if (globalState.activeTaxiTrip && globalState.tripData.isActive) {
        console.log(
          "Active trip detected, redirecting to trip screen",
          globalState.tripData
        );
        router.replace("/(tabs)/taxi-service/trip");
        return;
      }

      // Если нет активной поездки, но установлен флаг needsNewOrder
      if (globalState.needsNewOrder) {
        console.log(
          "No active trip, showing taxi order screen",
          globalState.needsNewOrder
        );
        // Запустить новый цикл заказа
        tripManager.startOrderFlow();
      }
    } catch (error) {
      console.error("Error checking for active trip:", error);
    }
  };

  // Location permission handling
  const requestLocationPermission = async () => {
    try {
      // First check if we already have permissions
      let { status } = await Location.getForegroundPermissionsAsync();

      if (status === "granted") {
        return true;
      }

      // If not, request permissions
      const result = await Location.requestForegroundPermissionsAsync();

      if (result.status !== "granted") {
        // Show alert with instructions if permission denied
        Alert.alert(
          "Location Permission Required",
          "This app needs access to location to find taxis near you. Please enable location access in your device settings.",
          [
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error requesting location permissions:", error);
      Alert.alert(
        "Permission Error",
        "There was an error requesting location permissions. Please try again.",
        [{ text: "OK" }]
      );
      return false;
    }
  };

  // Add the reverseGeocode function before getUserLocation
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      // Use Nominatim for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "DamuTaxiApp/1.0",
          },
        }
      );

      const data = await response.json();

      // Format the address
      let addressName = "Your location";
      if (data && data.display_name) {
        // Take first components of address for short display
        const addressParts = data.display_name.split(",");
        addressName = addressParts.slice(0, 2).join(", ");
      }

      return addressName;
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      return "Your location";
    }
  };

  // Update getUserLocation to use default coordinates
  const getUserLocation = async () => {
    setIsLocating(true);

    try {
      // Use default coordinates for Almaty city center
      const defaultLocation = {
        latitude: 43.238949,
        longitude: 76.889709,
      };

      setUserLocation(defaultLocation);

      const currentLocation = {
        id: "",
        name: "Almaty City Center",
        fullAddress: "",
        coordinates: defaultLocation,
        latitude: defaultLocation.latitude,
        longitude: defaultLocation.longitude,
      };

      setPickupAddress(currentLocation);

      // Animate map to default location
      const newRegion = {
        ...defaultLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setMapRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error("Error setting default location:", error);
    } finally {
      setIsLocating(false);
    }
  };

  // Поиск адресов с использованием Nominatim API
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchQuery = `${query}, Almaty, Kazakhstan`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            "User-Agent": "DamuTaxiApp/1.0",
          },
        }
      );

      const data = await response.json();

      // Преобразуем результаты в наш формат
      const addresses: Address[] = data.map((item: any) => ({
        id: "",
        name: item.display_name.split(",").slice(0, 2).join(", "),
        fullAddress: "",
        coordinates: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));

      setSearchResults(addresses);
    } catch (error) {
      console.error("Error searching addresses:", error);
      // Используем резервные данные в случае ошибки
      setSearchResults([
        {
          id: "",
          name: "Достык 91",
          fullAddress: "",
          coordinates: { latitude: 43.234525, longitude: 76.956627 },
          latitude: 43.234525,
          longitude: 76.956627,
        },
        {
          id: "",
          name: "Манаса 34/1",
          fullAddress: "",
          coordinates: { latitude: 43.22551, longitude: 76.906395 },
          latitude: 43.22551,
          longitude: 76.906395,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearchAddresses = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddresses(query);
    }, 300) as unknown as NodeJS.Timeout;
  };

  // Handle destination input change - with debounce
  const handleDestinationInputChange = (text: string) => {
    setDestinationInput(text);

    if (destinationAddress) {
      setDestinationAddress(null);
    }

    debouncedSearchAddresses(text);
  };

  // Handle select destination address from search results
  const handleSelectAddress = (address: Address) => {
    setDestinationAddress(address);
    setDestinationInput(address.name);
    setSearchResults([]);

    // Calculate distance between pickup and destination
    const distance = calculateDistanceBetweenPoints(
      pickupAddress.coordinates,
      address.coordinates
    );
    setTripDistance(distance);
    console.log("Calculated distance:", distance, "km");

    // Calculate prices for all car types
    const prices: { [key: string]: number } = {};
    CAR_TYPES.forEach((car) => {
      prices[car.id] = calculatePrice(car.id, distance);
      console.log(`Price for ${car.id}:`, prices[car.id]);
    });
    setCarPrices(prices);

    // Update map region to include both pickup and destination
    const midLat =
      (pickupAddress.coordinates.latitude + address.coordinates.latitude) / 2;
    const midLng =
      (pickupAddress.coordinates.longitude + address.coordinates.longitude) / 2;

    const latDelta =
      Math.abs(
        pickupAddress.coordinates.latitude - address.coordinates.latitude
      ) *
        1.5 +
      0.01;
    const lngDelta =
      Math.abs(
        pickupAddress.coordinates.longitude - address.coordinates.longitude
      ) *
        1.5 +
      0.01;

    setMapRegion({
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(0.02, latDelta),
      longitudeDelta: Math.max(0.02, lngDelta),
    });

    mapRef.current?.animateToRegion(
      {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(0.02, latDelta),
        longitudeDelta: Math.max(0.02, lngDelta),
      },
      1000
    );

    // Automatically show car selection after selecting destination
    setTimeout(() => {
      setShowCarSelection(true);
      setCurrentView("cars");
    }, 1000);
  };

  // Render car type button - updated version with dynamic pricing
  const renderCarTypeButton = (carType: (typeof CAR_TYPES)[0]) => {
    const isSelected = selectedCarType === carType.id;
    const price = carPrices[carType.id] || carType.minPrice;

    return (
      <TouchableOpacity
        key={carType.id}
        style={[styles.carCard, isSelected && styles.carCardSelected]}
        onPress={() => handleSelectCar(carType.id, price)}
      >
        {carType.image && (
          <Image source={carType.image} style={styles.carImage} />
        )}
        <Text style={styles.carTypeName}>
          {t(`taxi.carTypes.${carType.id}.name`) || carType.name}
        </Text>
        <Text style={styles.carPrice}>{price} ₸</Text>
        <Text style={styles.basePricePerKm}>
          {carType.basePrice} ₸/{"km"}
        </Text>
      </TouchableOpacity>
    );
  };

  // Second screen - car selection
  const renderCarSelectionScreen = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ height: "60%" }}>
          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            ref={mapRef}
          >
            {pickupAddress && (
              <Marker
                coordinate={{
                  latitude: pickupAddress.coordinates.latitude,
                  longitude: pickupAddress.coordinates.longitude,
                }}
                title={t("taxi.pickup")}
                pinColor="#4CAF50"
              >
                <View style={styles.currentLocationMarker}>
                  <View style={styles.currentLocationDot} />
                </View>
              </Marker>
            )}
            {destinationAddress && (
              <Marker
                coordinate={{
                  latitude: destinationAddress.coordinates.latitude,
                  longitude: destinationAddress.coordinates.longitude,
                }}
                title={t("taxi.destination")}
                pinColor="#F44336"
              >
                <View style={styles.destinationMarker}>
                  <View style={styles.destinationDot} />
                </View>
              </Marker>
            )}
            {pickupAddress && destinationAddress && (
              <Polyline
                coordinates={[
                  {
                    latitude: pickupAddress.coordinates.latitude,
                    longitude: pickupAddress.coordinates.longitude,
                  },
                  {
                    latitude: destinationAddress.coordinates.latitude,
                    longitude: destinationAddress.coordinates.longitude,
                  },
                ]}
                strokeColor="#4A5D23"
                strokeWidth={4}
              />
            )}
          </MapView>
        </View>

        {/* Кнопка назад - вне контейнера карты, чтобы была поверх всего */}
        <TouchableOpacity
          style={[
            styles.backButton,
            { position: "absolute", top: 50, left: 20, zIndex: 100 },
          ]}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.carSelectionPanel}>
          {tripDistance > 0 && (
            <View style={styles.distanceInfoContainer}>
              <Ionicons name="location" size={16} color="#4CAF50" />
              <Text style={styles.distanceInfoText}>
                {`${t("taxi.distance")}: ${tripDistance.toFixed(1)} km`}
              </Text>
            </View>
          )}

          <Text style={styles.sectionHeaderText}>{t("taxi.selectCar")}</Text>

          <View style={styles.carTypesContainer}>
            {CAR_TYPES.map((carType) => renderCarTypeButton(carType))}
          </View>

          <View style={styles.orderSummary}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>{t("taxi.price")}</Text>
              <Text style={styles.priceValue}>{getSelectedCarPrice()} ₸</Text>
            </View>
            <TouchableOpacity
              style={styles.orderButtonNew}
              onPress={handleOrderTaxi}
              disabled={
                !pickupAddress || !destinationAddress || !selectedCarType
              }
            >
              <Text style={styles.orderButtonText}>
                {t("taxi.orderButton") || t("taxi.order")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleAcceptRequest = async (requestId: string) => {
    Alert.alert(
      "Accept Ride Request",
      "Are you sure you want to accept this ride request?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Accept",
          onPress: async () => {
            setIsLoading(true);
            try {
              // Проверяем наличие пользователя напрямую
              if (!user || !user.id) {
                Alert.alert(
                  "Error",
                  "You must be logged in to accept requests"
                );
                return;
              }

              const userId = user.id.toString();
              console.log("Using userId from user object:", userId);

              const driver = userStore.getState().user || {
                name: "Driver",
                phone: "",
                photo: null,
              };

              console.log("Accepting request:", requestId);
              console.log("Driver info:", { userId, driver });

              // Get the request details
              const request = pendingOrders.find((req) => req.id === requestId);
              if (!request) {
                Alert.alert("Error", "Request details not found");
                return;
              }

              console.log("Request to accept:", request);

              // Accept the request using the TaxiService
              const result = await TaxiService.acceptTrip(requestId, {
                id: userId,
                name: user.name || driver.name || "Driver",
              });

              if (!result) {
                Alert.alert(
                  "Error",
                  "Failed to accept the request. It may have already been taken or cancelled."
                );
                await fetchPendingRequests(); // Refresh the list
                return;
              }

              console.log("Accepted request result:", result);

              // Start the trip locally
              tripManager.startTrip({
                driverId: userId,
                driverName: user.name || driver.name || "Driver",
                origin: request.pickup.name,
                destination: request.destination.name,
                fare: request.fare,
                duration: 120, // 2 minutes from now
              });

              // Navigate to trip screen
              router.replace("/(tabs)/taxi-service/trip");
            } catch (error) {
              console.error("Error accepting request:", error);
              Alert.alert(
                "Error",
                "Failed to accept the request. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Driver mode UI to display available requests
  const renderDriverRequestsScreen = () => (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Taxi Requests</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshOrdersList}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={24}
            color="#4A5D23"
            style={refreshing ? { opacity: 0.5 } : {}}
          />
        </TouchableOpacity>
      </View>

      {refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5D23" />
          <Text style={styles.loadingText}>Refreshing requests...</Text>
        </View>
      ) : pendingOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="local-taxi" size={80} color="#E0E0E0" />
          <Text style={styles.emptyText}>
            No available requests at the moment
          </Text>
          <Text style={styles.emptySubtext}>
            Pull down to refresh or check back later
          </Text>
          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => setShowDriverControls(false)}
          >
            <Text style={styles.switchModeButtonText}>
              Switch to Passenger Mode
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshOrdersList}
              colors={["#4A5D23"]}
            />
          }
        >
          {pendingOrders.map((request) => (
            <RequestItem
              key={request.id}
              request={request}
              onAccept={handleAcceptRequest}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  // Add keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);

        // Animate the bottom panel up
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // Scroll to the input field after a short delay
        setTimeout(() => {
          if (destinationInputRef.current && scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);

        // Animate the bottom panel down
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Handle initial order - show car selection
  const handleInitialOrder = () => {
    if (!destinationAddress) {
      return;
    }
    setShowCarSelection(true);
    setCurrentView("cars");
  };

  // Handle car selection
  const handleSelectCar = (carType: string, price: number) => {
    setSelectedCarType(carType);
    // Use calculated price from carPrices state
    setSelectedFare(carPrices[carType] || price);
  };

  // Calculate selected car price with current distance
  const getSelectedCarPrice = () => {
    if (!destinationAddress) return 0;

    // Use the calculated price from carPrices state or use base price as fallback
    const selectedCar = CAR_TYPES.find((car) => car.id === selectedCarType);
    const price = selectedCar
      ? carPrices[selectedCar.id] || selectedCar.minPrice
      : 0;
    return price;
  };

  // Handle order taxi
  const handleOrderTaxi = async () => {
    if (!destinationAddress) return;

    setIsLoading(true);

    try {
      // Save coordinates in global state
      globalState.pickupCoordinates = pickupAddress.coordinates;
      globalState.destinationCoordinates = destinationAddress.coordinates;

      // Calculate distance between pickup and destination
      const distance = calculateDistance(
        pickupAddress.coordinates,
        destinationAddress.coordinates
      );

      // Create a taxi request using the API service
      if (user) {
        const taxiRequest = await TaxiService.createTrip({
          customer: {
            id: user.id || 0,
            name: user.name || "Customer",
          },
          pickup: {
            name: pickupAddress.name,
            coordinates: pickupAddress.coordinates,
          },
          destination: {
            name: destinationAddress.name,
            coordinates: destinationAddress.coordinates,
          },
          fare: selectedFare,
          distance_km: distance,
        });

        if (taxiRequest) {
          // Start a trip locally for the customer to track
          tripManager.startTrip({
            driverId: "pending_driver",
            driverName: "Seeking Driver...",
            origin: pickupAddress.name,
            destination: destinationAddress.name,
            fare: selectedFare,
            duration: 120,
          });

          // Go to trip screen
          router.replace("/(tabs)/taxi-service/trip");
        }
      }
    } catch (error) {
      console.error("Error creating taxi request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Go back from car selection to initial screen
  const handleGoBack = () => {
    setCurrentView("location");
    setShowCarSelection(false);
  };

  // Add handler for location updates
  const handleLocationUpdate = (location: Location.LocationObject) => {
    // Update the map to center on the user's location if appropriate
    if (
      (currentView === "location" || currentView === "cars") &&
      mapRef.current
    ) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  // Add a function to navigate to driver dashboard
  const goToDriverDashboard = () => {
    router.push("/(tabs)/taxi-service/driver");
  };

  // Remove location permission check from initializeTaxiScreen
  const initializeTaxiScreen = async () => {
    if (!user) {
      console.log("No user found, redirecting to login");
      router.replace("/(tabs)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Set default location first
      setUserLocation({
        latitude: 43.238949,
        longitude: 76.889709,
      });

      setPickupAddress({
        id: "",
        name: "Almaty City Center",
        fullAddress: "",
        coordinates: {
          latitude: 43.238949,
          longitude: 76.889709,
        },
        latitude: 43.238949,
        longitude: 76.889709,
      });

      // Set initial map region
      const newRegion = {
        latitude: 43.238949,
        longitude: 76.889709,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegion);

      // Handle authentication
      if (token) {
        await TaxiService.updateTaxiToken();
        setGlobalToken(token);
      } else {
        const storedToken = await AsyncStorage.getItem("token");
        if (!storedToken) {
          throw new Error("Не удалось получить токен авторизации");
        }
        await TaxiService.updateTaxiToken();
        setGlobalToken(storedToken);
      }

      // Check for active trip
      const activeTrip = await AsyncStorage.getItem("active_trip");
      if (activeTrip) {
        console.log("Active trip found:", activeTrip);
      }

      setIsInitialized(true);
    } catch (err) {
      console.error("Error initializing taxi screen:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Произошла ошибка при инициализации"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Effects - group all useEffect hooks together
  useEffect(() => {
    initializeTaxiScreen();
  }, [user, token]);

  // Render methods
  const renderContent = () => {
    if (isLoading) {
      return <LoadingView />;
    }

    if (error) {
      return <ErrorView error={error} onRetry={initializeTaxiScreen} />;
    }

    // Return the main content
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: "white", paddingTop: 0, paddingBottom: 0 },
        ]}
      >
        {/* Include the LocationTracker component */}
        <LocationTracker
          isActive={locationTrackingEnabled && !!user}
          tripId={activeTripId}
          onLocationUpdate={handleLocationUpdate}
        />

        {isDriver && showDriverControls ? (
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
          >
            {renderDriverRequestsScreen()}
          </KeyboardAvoidingView>
        ) : (
          <>
            {isDriver && (
              <TouchableOpacity
                style={styles.driverModeFloatingButton}
                onPress={goToDriverDashboard}
              >
                <FontAwesome name="car" size={20} color="white" />
                <Text style={styles.driverModeButtonText}>
                  Driver Dashboard
                </Text>
              </TouchableOpacity>
            )}

            {showCarSelection ? (
              renderCarSelectionScreen()
            ) : (
              <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
              >
                <SafeAreaView style={styles.container}>
                  {/* Map view - reduce height when keyboard is visible */}
                  <View
                    style={[
                      styles.mapContainer,
                      keyboardVisible && { height: "50%" },
                    ]}
                  >
                    <MapView
                      style={styles.map}
                      region={mapRegion}
                      onRegionChangeComplete={setMapRegion}
                      ref={mapRef}
                    >
                      {/* Pickup marker */}
                      {pickupAddress && (
                        <Marker
                          coordinate={pickupAddress.coordinates}
                          title="Your Location"
                          description={pickupAddress.name}
                        >
                          <View style={styles.currentLocationMarker}>
                            <View style={styles.currentLocationDot} />
                          </View>
                        </Marker>
                      )}

                      {/* Destination marker */}
                      {destinationAddress && (
                        <Marker
                          coordinate={destinationAddress.coordinates}
                          title="Destination"
                          description={destinationAddress.name}
                        >
                          <View style={styles.destinationMarker}>
                            <View style={styles.destinationDot} />
                          </View>
                        </Marker>
                      )}

                      {/* Route line between pickup and destination */}
                      {pickupAddress && destinationAddress && (
                        <Polyline
                          coordinates={[
                            pickupAddress.coordinates,
                            destinationAddress.coordinates,
                          ]}
                          strokeColor="#4A5D23"
                          strokeWidth={4}
                        />
                      )}
                    </MapView>
                  </View>

                  {/* Back button */}
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.replace("/(tabs)")}
                  >
                    <Ionicons name="arrow-back" size={24} color="black" />
                  </TouchableOpacity>

                  {/* Bottom panel - adjust position based on keyboard */}
                  <Animated.View
                    style={[
                      styles.bottomPanel,
                      keyboardVisible && styles.bottomPanelWithKeyboard,
                    ]}
                  >
                    <ScrollView
                      ref={scrollViewRef}
                      contentContainerStyle={styles.bottomPanelContent}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.dragIndicator} />
                      <Text style={styles.panelTitle}>{t("taxi.taxi")}</Text>

                      {/* Location inputs */}
                      <TouchableOpacity
                        style={styles.locationInput}
                        onPress={() => {
                          Keyboard.dismiss();
                          getUserLocation();
                        }}
                      >
                        <View style={styles.inputIconContainer}>
                          <Ionicons
                            name="navigate-circle-outline"
                            size={24}
                            color="#666"
                          />
                        </View>
                        <Text style={styles.inputText}>
                          {pickupAddress
                            ? pickupAddress.name
                            : t("taxi.yourLocation")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.locationInput}
                        activeOpacity={1}
                        onPress={() => {
                          if (destinationInputRef.current) {
                            destinationInputRef.current.focus();
                          }
                        }}
                      >
                        <View style={styles.inputIconContainer}>
                          <Ionicons
                            name="location-outline"
                            size={24}
                            color="#666"
                          />
                        </View>
                        <TextInput
                          ref={destinationInputRef}
                          style={styles.inputText}
                          placeholder={t("taxi.whereToGo")}
                          placeholderTextColor="#999"
                          value={destinationInput}
                          onChangeText={handleDestinationInputChange}
                          onFocus={() => {
                            // Scroll to this input when focused
                            setTimeout(() => {
                              if (scrollViewRef.current) {
                                scrollViewRef.current.scrollToEnd({
                                  animated: true,
                                });
                              }
                            }, 100);
                          }}
                        />
                      </TouchableOpacity>

                      {/* Search results with scrollable container */}
                      {searchResults.length > 0 && (
                        <ScrollView
                          style={[
                            styles.searchResultsContainer,
                            keyboardVisible &&
                              styles.searchResultsContainerExpanded,
                          ]}
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled={true}
                        >
                          {searchResults.map((item, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.searchResultItem}
                              onPress={() => {
                                handleSelectAddress(item);
                                Keyboard.dismiss();
                              }}
                            >
                              <Ionicons
                                name="location-outline"
                                size={18}
                                color="#666"
                              />
                              <Text style={styles.searchResultText}>
                                {item.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}

                      {/* Order button - ensure it's always visible */}
                      <View
                        style={[
                          styles.orderButtonContainer,
                          keyboardVisible && { marginTop: 16 },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.orderButton,
                            !destinationAddress && styles.orderButtonDisabled,
                          ]}
                          onPress={() => {
                            Keyboard.dismiss();
                            handleInitialOrder();
                          }}
                          disabled={!destinationAddress}
                        >
                          <Text style={styles.orderButtonText}>
                            {t("taxi.order")}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Add padding when keyboard is visible to ensure everything is accessible */}
                      {keyboardVisible && (
                        <View style={{ height: keyboardHeight - 64 }} />
                      )}
                    </ScrollView>
                  </Animated.View>

                  {/* Loading indicator */}
                  {isLoading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#000" />
                    </View>
                  )}
                </SafeAreaView>
              </KeyboardAvoidingView>
            )}
          </>
        )}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4A5D23" />
            <Text style={styles.loadingText}>Processing your request...</Text>
          </View>
        )}
      </SafeAreaView>
    );
  };

  // Main return
  return renderContent();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    height: "60%",
    width: "100%",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  bottomPanelWithKeyboard: {
    maxHeight: "85%", // When keyboard is visible, allow panel to take more space
    bottom: 0,
  },
  bottomPanelContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 100,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputIconContainer: {
    marginRight: 12,
  },
  inputText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  searchResultsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 16,
    maxHeight: 150,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchResultsContainerExpanded: {
    maxHeight: 200, // More space for results when keyboard is visible
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
  },
  orderButtonContainer: {
    width: "100%",
    marginTop: 8,
  },
  orderButton: {
    backgroundColor: "#212121",
    borderRadius: 100,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  orderButtonDisabled: {
    opacity: 0.6,
  },
  orderButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  carOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  carOption: {
    width: (width - 72) / 3,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  carOptionSelected: {
    backgroundColor: "#F5F5F9",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  carTypeText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  currentLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  destinationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F44336",
  },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F44336",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
  switchModeButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
  },
  switchModeButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  loadingText: {
    color: "#4A5D23",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
  },
  driverModeFloatingButton: {
    position: "absolute",
    top: 90,
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  driverModeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "white",
    fontWeight: "500",
  },
  carTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedCarTypeButton: {
    backgroundColor: "#4C6A2E",
  },
  carTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedCarTypeName: {
    color: "#FFFFFF",
  },
  carTypeDetails: {
    fontSize: 14,
    color: "#888888",
  },
  selectedCarTypeDetails: {
    color: "#FFFFFF",
    opacity: 0.8,
  },
  carTypePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
  },
  selectedCarTypePrice: {
    color: "#FFFFFF",
  },
  orderSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
    width: "100%",
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333333",
  },
  orderButtonNew: {
    backgroundColor: "#212121",
    width: 160,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  carTypesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    width: "100%",
  },
  distanceInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: "center",
    width: "100%",
  },
  distanceInfoText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  loadingButton: {
    opacity: 0.7,
  },
  carPriceContainer: {
    alignItems: "flex-end",
  },
  basePricePerKm: {
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
  },
  selectedBasePricePerKm: {
    color: "#FFFFFF",
    opacity: 0.8,
  },
  carSelectionPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 6,
  },
  carSelectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    color: "#000",
  },
  carCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  carCard: {
    width: "30%",
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  carCardSelected: {
    backgroundColor: "#F9F9F9",
    borderColor: "#DDDDDD",
  },
  carImage: {
    width: 70,
    height: 45,
    resizeMode: "contain",
    marginVertical: 15,
  },
  carTypeName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 5,
  },
  carPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  completionContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 10,
  },
  successIcon: {
    width: 40,
    height: 40,
  },
  tripSummary: {
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: "#666",
  },
  archiveButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  archiveButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  doneButton: {
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  doneButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#4A5D23",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});

const stylesDriver = StyleSheet.create({
  requestItemContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  requestClient: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  requestTime: {
    fontSize: 12,
    color: "#888",
  },
  requestDetails: {
    marginTop: 8,
  },
  requestAddressContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  addressIconContainer: {
    width: 14,
    alignItems: "center",
    marginRight: 10,
  },
  addressLine: {
    width: 2,
    height: 30,
    backgroundColor: "#DDD",
    marginVertical: 4,
  },
  addressTextContainer: {
    flex: 1,
  },
  pickupText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  destinationTextInput: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  requestStats: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    marginRight: 24,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  driverPickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  driverDestinationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F44336",
  },
  driverAcceptButton: {
    backgroundColor: "#4A5D23",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  driverAcceptButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  destinationTextItem: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
});
