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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  globalState,
  tripManager,
  taxiRequestsManager,
  TaxiRequest,
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

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

// Интерфейс для адреса с координатами
interface Address {
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface TaxiRequestExtended extends TaxiRequest {
  estimatedTime?: number;
}

export default function TaxiOrderScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const destinationInputRef = useRef<TextInput>(null);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<
    "location" | "cars" | "requests"
  >("location");
  const [pickupAddress, setPickupAddress] = useState<Address>({
    name: t("taxi.yourLocation"),
    coordinates: {
      latitude: 43.238949,
      longitude: 76.889709,
    },
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
  const [selectedCarType, setSelectedCarType] = useState("Normal");
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

  // Function to fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      if (!user) return;

      const requests = await taxiRequestsManager.getRequests();
      console.log("Available requests for drivers:", requests.length);
      setPendingOrders(requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
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

  // Проверяем, есть ли уже активная поездка и запрашиваем местоположение
  useEffect(() => {
    if (!user || !user.id) return;

    console.log("User effect triggered, user ID:", user.id);

    // Проверяем, есть ли активная поездка для данного пользователя
    const checkForActiveTrip = async () => {
      try {
        const userId = user.id.toString();
        // Check if user is a driver
        const userRoles = user.role ? user.role.split(",") : [];
        const isDriver = userRoles.includes("driver");

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
            const activeRequest =
              await taxiRequestsManager.getUserActiveRequest(userId);
            if (!activeRequest) {
              console.log(
                "Security: No active request found for customer, resetting global trip data"
              );
              tripManager.startOrderFlow();
            }
          }
        }

        // If the user is a driver visiting the taxi screen, they should see the list
        // of available requests, not redirect to a trip screen unless they've accepted one
        if (isDriver && !globalState.activeTaxiTrip) {
          // For drivers, only redirect if they have an active accepted trip
          const activeRequest = await taxiRequestsManager.getUserActiveRequest(
            userId
          );
          if (
            activeRequest &&
            activeRequest.status === "accepted" &&
            activeRequest.driverId === userId
          ) {
            console.log("Driver has an active accepted trip, redirecting");

            // Restore trip data
            globalState.pickupCoordinates = activeRequest.pickup.coordinates;
            globalState.destinationCoordinates =
              activeRequest.destination.coordinates;

            tripManager.startTrip({
              driverId: activeRequest.driverId,
              driverName: "Driver",
              origin: activeRequest.pickup.name,
              destination: activeRequest.destination.name,
              fare: activeRequest.fare,
              duration: 120,
            });

            router.replace("/(tabs)/taxi-service/trip");
          }
          // Otherwise, stay on taxi screen to see available requests
          return;
        }

        // For regular customers
        // Проверяем есть ли активная поездка в глобальном хранилище
        if (globalState.activeTaxiTrip && !globalState.needsNewOrder) {
          console.log("Found active trip in globalState, redirecting");
          router.replace("/(tabs)/taxi-service/trip");
          return;
        }

        // Также проверяем наличие активных заказов в системе
        const activeRequest = await taxiRequestsManager.getUserActiveRequest(
          userId
        );
        if (activeRequest) {
          console.log("Found active request in storage, redirecting");

          // Восстанавливаем данные поездки
          globalState.pickupCoordinates = activeRequest.pickup.coordinates;
          globalState.destinationCoordinates =
            activeRequest.destination.coordinates;

          // Запускаем поездку
          tripManager.startTrip({
            driverId: activeRequest.driverId || "pending_driver",
            driverName: activeRequest.driverId
              ? "Your Driver"
              : "Seeking Driver...",
            origin: activeRequest.pickup.name,
            destination: activeRequest.destination.name,
            fare: activeRequest.fare,
            duration: 120, // 2 minutes default
          });

          router.replace("/(tabs)/taxi-service/trip");
          return;
        }
      } catch (error) {
        console.error("Error checking for active trip:", error);
      }
    };

    checkForActiveTrip();

    // Получаем текущее местоположение пользователя
    getUserLocation();

    // Сохраняем ID пользователя в AsyncStorage при каждом входе
    if (user?.id) {
      AsyncStorage.setItem("userId", user.id.toString());
      console.log("Saved userId to AsyncStorage:", user.id);
    }
  }, [isDriver, user]);

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
                "User-Agent": "DamuTaxiApp/1.0",
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
        name: addressName,
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
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

  // Варианты автомобилей для экрана выбора
  const carOptions = [
    {
      type: "Normal",
      price: 1500,
      image: require("@/assets/images/car-normal.png"),
    },
    {
      type: "Minivan",
      price: 2100,
      image: require("@/assets/images/car-minivan.png"),
    },
    {
      type: "Joint trip",
      price: 1100,
      image: require("@/assets/images/car-joint.png"),
    },
  ];

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
        name: item.display_name.split(",").slice(0, 2).join(", "),
        coordinates: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
      }));

      setSearchResults(addresses);
    } catch (error) {
      console.error("Error searching addresses:", error);
      // Используем резервные данные в случае ошибки
      setSearchResults([
        {
          name: "Достык 91",
          coordinates: { latitude: 43.234525, longitude: 76.956627 },
        },
        {
          name: "Манаса 34/1",
          coordinates: { latitude: 43.22551, longitude: 76.906395 },
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
    }, 300);
  };

  // Handle destination input change - with debounce
  const handleDestinationInputChange = (text: string) => {
    setDestinationInput(text);

    if (destinationAddress) {
      setDestinationAddress(null);
    }

    debouncedSearchAddresses(text);
  };

  // Select destination address from search results
  const handleSelectAddress = (address: Address) => {
    setDestinationAddress(address);
    setDestinationInput(address.name);
    setSearchResults([]);

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
  };

  // Handle initial order - show car selection
  const handleInitialOrder = () => {
    if (!destinationAddress) {
      return;
    }
    setShowCarSelection(true);
  };

  // Handle car selection
  const handleSelectCar = (carType: string, price: number) => {
    setSelectedCarType(carType);
    setSelectedFare(price);
  };

  // Handle final order confirmation
  const handleOrderTaxi = async () => {
    if (!destinationAddress) return;

    setIsLoading(true);

    try {
      // Save coordinates in global state
      globalState.pickupCoordinates = pickupAddress.coordinates;
      globalState.destinationCoordinates = destinationAddress.coordinates;

      // Create a taxi request
      if (user) {
        const taxiRequest = await taxiRequestsManager.createRequest({
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
    setShowCarSelection(false);
  };

  // First screen - input location
  const renderLocationScreen = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <SafeAreaView style={styles.container}>
        {/* Map view - reduce height when keyboard is visible */}
        <View
          style={[styles.mapContainer, keyboardVisible && { height: "50%" }]}
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
                {pickupAddress ? pickupAddress.name : t("taxi.yourLocation")}
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
                <Ionicons name="location-outline" size={24} color="#666" />
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
                      scrollViewRef.current.scrollToEnd({ animated: true });
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
                  keyboardVisible && styles.searchResultsContainerExpanded,
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
                    <Ionicons name="location-outline" size={18} color="#666" />
                    <Text style={styles.searchResultText}>{item.name}</Text>
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
                <Text style={styles.orderButtonText}>{t("taxi.order")}</Text>
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
  );

  // Second screen - car selection
  const renderCarSelectionScreen = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <SafeAreaView style={styles.container}>
        {/* Map view */}
        <View style={styles.mapContainer}>
          <MapView style={styles.map} region={mapRegion} ref={mapRef}>
            {/* Pickup marker */}
            {pickupAddress && (
              <Marker coordinate={pickupAddress.coordinates}>
                <View style={styles.currentLocationMarker}>
                  <View style={styles.currentLocationDot} />
                </View>
              </Marker>
            )}

            {/* Destination marker */}
            {destinationAddress && (
              <Marker coordinate={destinationAddress.coordinates}>
                <View style={styles.destinationMarker}>
                  <View style={styles.destinationDot} />
                </View>
              </Marker>
            )}

            {/* Route line */}
            {destinationAddress && (
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
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        {/* Car selection panel */}
        <ScrollView
          style={styles.bottomPanel}
          contentContainerStyle={styles.bottomPanelContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.dragIndicator} />

          <Text style={styles.panelTitle}>{t("taxi.selectCar")}</Text>

          {/* Car options */}
          <View style={styles.carOptionsContainer}>
            {carOptions.map((car) => (
              <TouchableOpacity
                key={car.type}
                style={[
                  styles.carOption,
                  selectedCarType === car.type && styles.carOptionSelected,
                ]}
                onPress={() => handleSelectCar(car.type, car.price)}
              >
                <Image source={car.image} style={styles.carImage} />
                <Text style={styles.carTypeText}>{car.type}</Text>
                <Text style={styles.carPrice}>{car.price} ₸</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Order button */}
          <TouchableOpacity
            style={styles.orderButton}
            onPress={handleOrderTaxi}
          >
            <Text style={styles.orderButtonText}>{t("taxi.order")}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );

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

              // Accept the request
              const result = await taxiRequestsManager.acceptRequest(
                requestId,
                userId,
                user.name || driver.name || "Driver"
              );

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

  // Main component render
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: "white", paddingTop: 0, paddingBottom: 0 },
      ]}
    >
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
              onPress={() => {
                setShowDriverControls(true);
                fetchPendingRequests();
              }}
            >
              <FontAwesome name="car" size={20} color="white" />
              <Text style={styles.driverModeButtonText}>Driver Mode</Text>
            </TouchableOpacity>
          )}

          {showCarSelection
            ? renderCarSelectionScreen()
            : renderLocationScreen()}
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
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  carImage: {
    width: 70,
    height: 45,
    marginBottom: 10,
    resizeMode: "contain",
  },
  carTypeText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  carPrice: {
    fontSize: 16,
    fontWeight: "bold",
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
    top: 20,
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A5D23",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  driverModeButtonText: {
    marginLeft: 5,
    fontSize: 12,
    color: "white",
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
