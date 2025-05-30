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
  PanResponder,
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

export default function TaxiOrderScreen() {
  // Hooks from libraries
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  // Car types definition
  const CAR_TYPES: CarType[] = [
    {
      id: "normal",
      name: t("taxi.carTypes.normal"),
      icon: "car-outline",
      basePrice: 200,
      minPrice: 1500,
      time: "3-5",
      image: require("../../../assets/images/car-normal.png"),
    },
    {
      id: "minivan",
      name: t("taxi.carTypes.minivan"),
      icon: "car-sport-outline",
      basePrice: 300,
      minPrice: 2100,
      time: "5-7",
      image: require("../../../assets/images/car-minivan.png"),
    },
    {
      id: "joint",
      name: t("taxi.carTypes.joint"),
      icon: "car-sport-outline",
      basePrice: 150,
      minPrice: 1100,
      time: "7-10",
      image: require("../../../assets/images/car-joint.png"),
    },
  ];

  // Refs
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const destinationInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bottomPanelHeight = useRef(new Animated.Value(0)).current;
  const panelHeight = useRef(new Animated.Value(1)).current;

  // State declarations
  const [stateRestored, setStateRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<
    "location" | "cars" | "requests"
  >("location");
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
  const [isLocating, setIsLocating] = useState(true);
  const [isSearchingDriver, setIsSearchingDriver] = useState(false);
  const [searchTimeSeconds, setSearchTimeSeconds] = useState(0);
  const [mapRegion, setMapRegion] = useState({
    latitude: 43.238949,
    longitude: 76.889709,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [tripDistance, setTripDistance] = useState<number>(0);
  const [carPrices, setCarPrices] = useState<{ [key: string]: number }>({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeTripId, setActiveTripId] = useState<string | undefined>(
    undefined
  );
  const [isDriverMode, setIsDriverMode] = useState<boolean>(false);
  const [locationTrackingEnabled, setLocationTrackingEnabled] =
    useState<boolean>(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Add timer effect
  useEffect(() => {
    let interval: number;

    if (isSearchingDriver) {
      interval = setInterval(() => {
        setSearchTimeSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSearchTimeSeconds(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isSearchingDriver]);

  // Effect to check for active trip
  useEffect(() => {
    if (globalState.activeTaxiTrip && globalState.tripData.isActive) {
      // If we have an active trip and a driver is assigned, stop searching
      if (
        globalState.tripData.driverId &&
        globalState.tripData.driverId !== "pending_driver"
      ) {
        setIsSearchingDriver(false);
      }
    }
  }, [globalState.activeTaxiTrip, globalState.tripData]);

  // Add cleanup effect for search timer
  useEffect(() => {
    return () => {
      // Reset search state when component unmounts
      setIsSearchingDriver(false);
      setSearchTimeSeconds(0);
    };
  }, []);

  // Function to check and restore trip state
  const checkAndRestoreTrip = async () => {
    if (!user || !user.id) return;

    console.log("TaxiScreen mounted - initializing with auth token");

    try {
      // Check for active trip
      const hasActiveTrip = await checkUserActiveTrip(user.id.toString());

      if (hasActiveTrip) {
        console.log(`User ${user.id} has an active trip, restoring state...`);

        // Restore trip state
        const restored = await restoreTripState(user.id.toString());

        if (restored) {
          console.log("Trip state restored, redirecting to trip screen");
          router.replace("/taxi-service/trip");
          return;
        }
      }

      console.log(
        "No active trip, showing taxi order screen",
        !globalState.activeTaxiTrip
      );
      setStateRestored(true);
    } catch (error) {
      console.error("Error checking for active trip:", error);
      setStateRestored(true);
    }
  };

  // Create pan responder for drag gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0 && !isPanelCollapsed) {
          // Dragging down
          const newValue = 1 - gestureState.dy / 400;
          panelHeight.setValue(Math.max(0.1, Math.min(1, newValue)));
        } else if (gestureState.dy < 0 && isPanelCollapsed) {
          // Dragging up
          const newValue = Math.abs(gestureState.dy) / 400;
          panelHeight.setValue(Math.max(0.1, Math.min(1, newValue)));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50 && !isPanelCollapsed) {
          // Collapse panel
          Animated.spring(panelHeight, {
            toValue: 0.1,
            useNativeDriver: false,
          }).start();
          setIsPanelCollapsed(true);
        } else if (gestureState.dy < -50 && isPanelCollapsed) {
          // Expand panel
          Animated.spring(panelHeight, {
            toValue: 1,
            useNativeDriver: false,
          }).start();
          setIsPanelCollapsed(false);
        } else {
          // Return to previous state
          Animated.spring(panelHeight, {
            toValue: isPanelCollapsed ? 0.1 : 1,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Helper functions
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

  // Initialize TaxiService with token immediately when component mounts
  useEffect(() => {
    console.log("TaxiScreen mounted - initializing with auth token");
    // Use the dedicated method to update the taxi token
    TaxiService.updateTaxiToken().then((success) => {
      if (success) {
        console.log("Successfully updated TaxiService token on mount");
      } else {
        console.log("Failed to update TaxiService token on mount");

        // If direct method fails, try setting it directly if available
        if (token) {
          console.log("Setting token from AuthContext in TaxiService");
          setGlobalToken(token);
        }
      }
    });
  }, []); // Empty dependency array so this runs once on mount

  // Listen for token changes
  useEffect(() => {
    if (token) {
      console.log("Token changed - updating in TaxiService");
      setGlobalToken(token);

      // Also update authToken for consistency
      AsyncStorage.setItem("authToken", token)
        .then(() => console.log("Updated authToken in AsyncStorage"))
        .catch((err) => console.error("Failed to update authToken:", err));
    } else if (user) {
      // If we have a user but no token, something might be wrong with auth
      console.log(
        "Warning: Have user but no token, updating via TaxiService.updateTaxiToken"
      );
      TaxiService.updateTaxiToken();
    }
  }, [token, user]); // Listen for changes to token or user

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
      setIsSearchingDriver(requests.length === 0); // Set searching state based on pending orders
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setPendingOrders([]);
      setIsSearchingDriver(true); // Set to true when there's an error to continue showing animation
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
    const distance = calculateDistanceBetweenPoints(
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

    if (seconds < 60) {
      return `${seconds}${t("taxi.secondsAgo")}`;
    }
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}${t("taxi.minutesAgo")}`;
    }
    const hours = Math.floor(seconds / 3600);
    return `${hours}${t("taxi.hoursAgo")}`;
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

  // Функция для получения текущего местоположения пользователя
  const getUserLocation = async () => {
    setIsLocating(true);

    try {
      // Запрашиваем разрешение на доступ к местоположению
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Permission to access location was denied. We'll use a default location instead.",
          [{ text: "OK" }]
        );
        setIsLocating(false);
        return;
      }

      // Получаем текущее местоположение
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Обновляем userLocation для использования в компоненте RequestItem
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Получаем имя местоположения через обратное геокодирование
      const reverseGeocode = async (latitude: number, longitude: number) => {
        try {
          // Используем Nominatim для обратного геокодирования
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                "User-Agent": "DalaTaxiApp/1.0",
              },
            }
          );

          const data = await response.json();

          // Форматируем адрес
          let addressName = "Your location";
          if (data && data.display_name) {
            // Берем первые компоненты адреса для короткого отображения
            const addressParts = data.display_name.split(",");
            addressName = addressParts.slice(0, 2).join(", ");
          }

          return addressName;
        } catch (error) {
          console.error("Error in reverse geocoding:", error);
          return "Your location";
        }
      };

      // Получаем имя адреса
      const addressName = await reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      // Устанавливаем данные о местоположении
      const currentLocation = {
        id: "",
        name: addressName,
        fullAddress: "",
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setPickupAddress(currentLocation);
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Анимируем карту к текущему местоположению
      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Location error",
        "Could not determine your location. Please check your device settings.",
        [{ text: "OK" }]
      );
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
            "User-Agent": "DalaTaxiApp/1.0",
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
          {t(`taxi.carTypes.${carType.id}`)}
        </Text>
        <Text style={styles.carPrice}>{price} ₸</Text>
        <Text style={styles.basePricePerKm}>{carType.basePrice} ₸/км</Text>
      </TouchableOpacity>
    );
  };

  // Second screen - car selection
  const renderCarSelectionScreen = () => {
    return (
      <View style={styles.carSelectionWrapper}>
        <TouchableOpacity
          style={styles.backToSearchButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.mainTitle}>{t("taxi.selectCar")}</Text>
        <View style={styles.carTypesList}>
          {CAR_TYPES.map((carType) => renderCarTypeButton(carType))}
        </View>
        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t("taxi.price")}:</Text>
            <Text style={styles.detailValue}>{getSelectedCarPrice()} ₸</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t("taxi.distance")}:</Text>
            <Text style={styles.detailValue}>{tripDistance.toFixed(1)} km</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t("taxi.estTime")}:</Text>
            <Text style={styles.detailValue}>
              {selectedCarType
                ? CAR_TYPES.find((car) => car.id === selectedCarType)?.time
                : "-"}{" "}
              min
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.actionButton,
            (!selectedCarType || !destinationAddress) &&
              styles.actionButtonDisabled,
          ]}
          onPress={handleOrderTaxi}
          disabled={!selectedCarType || !destinationAddress}
        >
          <Text style={styles.actionButtonText}>{t("taxi.order")}</Text>
        </TouchableOpacity>
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
    <View style={styles.requestsContainer}>
      <Text style={styles.mainTitle}>{t("taxi.trip.tripDetails")}</Text>
      {pendingOrders.length > 0 ? (
        <FlatList
          data={pendingOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestItem request={item} onAccept={handleAcceptRequest} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshOrdersList}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t("taxi.trip.waitingForRequests")}
          </Text>
          <SonarAnimation isSearching={isSearchingDriver} />
        </View>
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
    setIsSearchingDriver(true); // Start searching
    setSearchTimeSeconds(0); // Reset timer

    try {
      // Save coordinates in global state
      globalState.pickupCoordinates = pickupAddress.coordinates;
      globalState.destinationCoordinates = destinationAddress.coordinates;

      // Calculate distance between pickup and destination
      const distance = calculateDistanceBetweenPoints(
        pickupAddress.coordinates,
        destinationAddress.coordinates
      );

      // Create route coordinates array
      const routeCoordinates = [
        pickupAddress.coordinates,
        destinationAddress.coordinates,
      ];

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
          route: routeCoordinates,
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
            route: routeCoordinates,
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

  // Проверяем состояние поездки при монтировании компонента
  useEffect(() => {
    checkAndRestoreTrip();
  }, [user]);

  // В случае если состояние не восстановлено, показываем загрузку
  if (!stateRestored && !globalState.tripData.isActive) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A5D23" />
        <Text style={{ marginTop: 20 }}>Загрузка...</Text>
      </View>
    );
  }

  // Main component render
  return (
    <View style={styles.mainContainer}>
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
              <Text style={styles.driverModeButtonText}>Driver Dashboard</Text>
            </TouchableOpacity>
          )}

          <View style={styles.container}>
            {/* Map view - always visible */}
            <View style={styles.mapContainer}>
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

            {/* Bottom panels */}
            {!showCarSelection ? (
              <Animated.View
                style={[
                  styles.bottomPanel,
                  keyboardVisible && styles.bottomPanelWithKeyboard,
                  {
                    height: panelHeight.interpolate({
                      inputRange: [0.1, 1],
                      outputRange: ["15%", "60%"],
                    }),
                  },
                ]}
              >
                <View {...panResponder.panHandlers}>
                  <View style={styles.dragIndicator} />
                </View>
                <ScrollView
                  ref={scrollViewRef}
                  contentContainerStyle={styles.bottomPanelContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="interactive"
                >
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

                  {/* Search results */}
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

                  {/* Order button */}
                  <View
                    style={[
                      styles.actionButtonContainer,
                      keyboardVisible && { marginTop: 16 },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        !destinationAddress && styles.actionButtonDisabled,
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleInitialOrder();
                      }}
                      disabled={!destinationAddress}
                    >
                      <Text style={styles.actionButtonText}>
                        {t("taxi.order")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Add padding when keyboard is visible */}
                  {keyboardVisible && (
                    <View style={{ height: keyboardHeight - 64 }} />
                  )}
                </ScrollView>
              </Animated.View>
            ) : (
              <View style={styles.carSelectionWrapper}>
                <TouchableOpacity
                  style={styles.backToSearchButton}
                  onPress={handleGoBack}
                >
                  <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.mainTitle}>{t("taxi.selectCar")}</Text>
                <View style={styles.carTypesList}>
                  {CAR_TYPES.map((carType) => renderCarTypeButton(carType))}
                </View>
                <View style={styles.tripDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("taxi.price")}:</Text>
                    <Text style={styles.detailValue}>
                      {getSelectedCarPrice()} ₸
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t("taxi.distance")}:
                    </Text>
                    <Text style={styles.detailValue}>
                      {tripDistance.toFixed(1)} km
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("taxi.estTime")}:</Text>
                    <Text style={styles.detailValue}>
                      {selectedCarType
                        ? CAR_TYPES.find((car) => car.id === selectedCarType)
                            ?.time
                        : "-"}{" "}
                      min
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    (!selectedCarType || !destinationAddress) &&
                      styles.actionButtonDisabled,
                  ]}
                  onPress={handleOrderTaxi}
                  disabled={!selectedCarType || !destinationAddress}
                >
                  <Text style={styles.actionButtonText}>{t("taxi.order")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4A5D23" />
          <Text style={styles.loadingText}>Processing your request...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 100,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    maxHeight: "100%",
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
    marginVertical: 12,
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
    maxHeight: Platform.OS === "ios" ? 200 : 250,
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
    maxHeight: Platform.OS === "ios" ? 300 : 350,
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
  actionButtonContainer: {
    width: "100%",
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: "#212121",
    borderRadius: 100,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  loadingText: {
    color: "#4A5D23",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  driverModeFloatingButton: {
    position: "absolute",
    top: 90,
    right: 20,
    backgroundColor: "#4A5D23",
    padding: 12,
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
  basePricePerKm: {
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
  },
  carSelectionWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 6,
    maxHeight: "50%",
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    color: "#000",
  },
  carTypesList: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  tripDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: "#888",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  requestsContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  driverRequestsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  backToSearchButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 1,
  },
  carSelectionContent: {
    width: "100%",
    marginBottom: 20,
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
