import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

// Import our type definitions
import { Order } from "./types/order";

// Import our services and helpers
import { useAuth } from "../../../auth/AuthContext";
import { RestaurantOrderService } from "../../../services/RestaurantOrderService";
import { OrderHistoryService } from "../../../services/OrderHistoryService";

// Interface for cart item from API
interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  updated_at: string;
  product: {
    id: number;
    category_id: number;
    title: string;
    description: string;
    price: string;
    images: string | null;
    status: string;
  };
  quantity?: number;
}

// Interface for pickup points
interface RestaurantLocation {
  id: string;
  name: string;
  address: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

// Interface for payment methods
interface PaymentMethod {
  id: string;
  type: "CARD" | "CASH";
  cardNumber?: string;
  cardExpiry?: string;
}

// Interface for address
interface Address {
  street: string;
  apartment: string;
  city: string;
  postalCode: string;
  instructions: string;
}

// Interface for delivery info
interface OrderDeliveryInfo {
  isPickup: boolean;
  pickupPointId?: string;
  address?: AddressWithCoords;
  contactlessDelivery?: boolean;
}

// Interface for contact info
interface OrderContactInfo {
  name: string;
  phone: string;
}

// Interface for address with coordinates
interface AddressWithCoords extends Address {
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Add SearchAddress interface
interface SearchAddress {
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export default function CheckoutPage() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pickupPoints, setPickupPoints] = useState<RestaurantLocation[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Cart totals
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(3.99);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  // Delivery info state
  const [isPickup, setIsPickup] = useState(false);
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<string>("");
  const [userLocationObtained, setUserLocationObtained] = useState(false);
  const [address, setAddress] = useState<Address>({
    street: "",
    apartment: "",
    city: "",
    postalCode: "",
    instructions: "",
  });

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(-1);

  // Contact info state - now pulled from user context
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactlessDelivery, setContactlessDelivery] = useState(true);

  // Payment method state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "CARD" | "CASH"
  >("CARD");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [currentRegion, setCurrentRegion] = useState({
    latitude: 43.238949,
    longitude: 76.889709,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const mapRef = useRef<MapView>(null);

  // Add new state variables for address search
  const [addressSearchInput, setAddressSearchInput] = useState("");
  const [addressSearchResults, setAddressSearchResults] = useState<
    SearchAddress[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check authentication on load
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(t("chechout.authRequired"), t("chechout.pleaseLogin"), [
        {
          text: "OK",
          onPress: () => router.push("/auth/login"),
        },
      ]);
      return;
    }

    // Auto get user location immediately
    getUserLocation();

    // Load data if authenticated
    loadData();

    // Set user data from AuthContext
    if (user) {
      setContactName(user.name || "");
      setContactPhone(user.phone || "");
    }

    // Load saved addresses
    loadSavedAddresses();
  }, [isAuthenticated, user]);

  // Load all necessary data
  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Load cart items from API
      await loadCartItems();

      // Load pickup points
      await loadPickupPoints();

      // Load payment methods
      await loadPaymentMethods();
    } catch (error) {
      console.error("Failed to load data:", error);
      Alert.alert(t("error"), t("chechout.failedToLoad"));
    } finally {
      setIsLoading(false);
    }
  };

  // Load sample saved addresses
  const loadSavedAddresses = async () => {
    try {
      // In a real app, fetch this from the API
      const addresses: Address[] = [
        {
          street: "123 Main St",
          apartment: "Apt 4B",
          city: "Seattle",
          postalCode: "98101",
          instructions: "Leave at the front door",
        },
        {
          street: "456 Park Ave",
          apartment: "",
          city: "Seattle",
          postalCode: "98102",
          instructions: "Call upon arrival",
        },
        {
          street: "789 Broadway",
          apartment: "Unit 12",
          city: "Bellevue",
          postalCode: "98004",
          instructions: "",
        },
      ];
      setSavedAddresses(addresses);
    } catch (error) {
      console.error("Error loading addresses:", error);
      // Non-critical, so we can continue
    }
  };

  // Calculate total price whenever cart items change
  useEffect(() => {
    if (cartItems.length > 0) {
      calculateTotals();
    }
  }, [cartItems]);

  // Load cart items from API
  const loadCartItems = async () => {
    try {
      // Get token from AsyncStorage
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        throw new Error("Authentication token not found");
      }

      console.log("Fetching cart items...");

      const response = await fetch("http://192.168.0.109:8000/api/cart", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cart: ${response.status}`);
      }

      const data = await response.json();
      console.log("Cart items fetched:", data.length);

      // Add quantity property to each item (defaulting to 1)
      const itemsWithQuantity = data.map((item: CartItem) => ({
        ...item,
        quantity: 1, // Default quantity since the API doesn't provide it
      }));

      setCartItems(itemsWithQuantity);
    } catch (error) {
      console.error("Failed to load cart:", error);
      Alert.alert("Error", "Failed to load your cart.");
    }
  };

  // Load pickup points (sample data for now)
  const loadPickupPoints = async () => {
    try {
      // In a real app, this would be an API call to get restaurant locations
      const restaurants: RestaurantLocation[] = [
        {
          id: "pp1",
          name: "Downtown Restaurant",
          address: "123 Main Street, Downtown",
          coords: {
            latitude: 43.235,
            longitude: 76.909,
          },
        },
        {
          id: "pp2",
          name: "Westside Cafe",
          address: "456 West Avenue, Westside",
          coords: {
            latitude: 43.238,
            longitude: 76.89,
          },
        },
        {
          id: "pp3",
          name: "Eastside Eatery",
          address: "789 East Blvd, Eastside",
          coords: {
            latitude: 43.241,
            longitude: 76.925,
          },
        },
      ];
      setPickupPoints(restaurants);

      // Auto-select first restaurant if available
      if (restaurants.length > 0) {
        setSelectedPickupPoint(restaurants[0].id);
      }
    } catch (error) {
      console.error("Error loading restaurant locations:", error);
      Alert.alert(
        "Notice",
        "Failed to load restaurant locations. Some options may be limited."
      );
    }
  };

  // Load payment methods (sample data for now)
  const loadPaymentMethods = async () => {
    try {
      //TODO make real api call

      const methods: PaymentMethod[] = [
        {
          id: "pm1",
          type: "CARD",
          cardNumber: "**** **** **** 1234",
          cardExpiry: "12/25",
        },
        {
          id: "pm2",
          type: "CARD",
          cardNumber: "**** **** **** 5678",
          cardExpiry: "03/26",
        },
      ];
      setPaymentMethods(methods);

      if (methods.length > 0) {
        setSelectedPaymentId(methods[0].id);
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
    }
  };

  // Calculate subtotal, tax, and total
  const calculateTotals = () => {
    try {
      // Calculate subtotal
      const calculatedSubtotal = cartItems.reduce((sum, item) => {
        const price = parseFloat(item.product.price);
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);

      // Calculate tax (assuming 8% tax rate)
      const calculatedTax = calculatedSubtotal * 0.08;

      // Calculate total
      const calculatedTotal = calculatedSubtotal + calculatedTax + deliveryFee;

      setSubtotal(calculatedSubtotal);
      setTax(calculatedTax);
      setTotal(calculatedTotal);
    } catch (error) {
      console.error("Error calculating totals:", error);
      // Set fallback values if calculation fails
      setSubtotal(0);
      setTax(0);
      setTotal(0);
    }
  };

  // Go back
  const goBack = () => {
    router.back();
  };

  // Update address field
  const updateAddress = (field: keyof Address, value: string) => {
    setAddress((prev: Address) => ({ ...prev, [field]: value }));
  };

  // Handle saved address selection
  const handleSelectSavedAddress = (index: number) => {
    setAddress(savedAddresses[index]);
    setSelectedAddressIndex(index);
    setShowAddressModal(false);
  };

  // Handle pickup point selection
  const handlePickupPointSelect = (id: string) => {
    setSelectedPickupPoint(id);
  };

  // Toggle delivery method
  const toggleDeliveryMethod = (pickup: boolean) => {
    setIsPickup(pickup);
  };

  // Validate checkout form
  const validateForm = (): boolean => {
    // Check if cart is empty
    if (cartItems.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty");
      return false;
    }

    // Validate delivery address if not using pickup
    if (!isPickup) {
      if (!address.street || !address.city || !address.postalCode) {
        Alert.alert(
          "Missing Address",
          "Please fill in all required address fields"
        );
        return false;
      }
    } else if (!selectedPickupPoint) {
      Alert.alert("Missing Pickup", "Please select a pickup point");
      return false;
    }

    // Validate contact info
    if (!contactName || !contactPhone) {
      Alert.alert(
        "Missing Contact Info",
        "Please provide your name and phone number"
      );
      return false;
    }

    return true;
  };

  const addToOrderHistory = async (newOrder: Order) => {
    try {
      // Добавляем userId к заказу для правильной фильтрации в истории
      if (user && user.id) {
        console.log(`Сохраняем заказ для пользователя ID: ${user.id}`);
        newOrder.userId = String(user.id);
      } else {
        console.warn("Заказ сохраняется без привязки к пользователю");
      }

      // Используем OrderHistoryService для сохранения заказа в истории
      await OrderHistoryService.saveOrder(newOrder);
      console.log("Заказ успешно сохранен в истории:", newOrder.id);
    } catch (error) {
      console.error("Ошибка при сохранении заказа в истории:", error);
    }
  };

  const clearCart = async () => {
    try {
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        throw new Error("Authentication token not found");
      }

      console.log("Clearing cart...");

      const response = await fetch("http://192.168.0.109:8000/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear cart: ${response.status}`);
      }

      console.log("Cart cleared successfully");
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const scheduleOrderCompletion = (orderId: string, delayMs: number) => {
    console.log(
      `Scheduling order ${orderId} to complete in ${delayMs / 1000} seconds`
    );

    window.setTimeout(async () => {
      try {
        // Получаем заказ по ID
        const orderToComplete = await OrderHistoryService.getOrderById(orderId);
        if (!orderToComplete) {
          console.error(`Order ${orderId} not found in history`);
          return;
        }

        // Обновляем статус заказа
        await OrderHistoryService.updateOrderStatus(orderId, "completed");
        console.log(`Order ${orderId} has been marked as completed`);

        // Также отправляем на сервер API для истории
        try {
          // Format the order for the server
          const serverOrder = {
            id: orderToComplete.id,
            timestamp: new Date().toISOString(),
            restaurant_name: orderToComplete.storeName,
            items: orderToComplete.items,
            total: orderToComplete.total,
            status: orderToComplete.status,
            delivery_address: orderToComplete.address,
            payment_method: orderToComplete.paymentMethod,
          };

          // Send to server history
          const success = await RestaurantOrderService.sendOrderToHistory(
            serverOrder
          );
          if (success) {
            console.log(`Order ${orderId} successfully sent to server history`);
          } else {
            console.log(
              `Order ${orderId} saved locally but failed to send to server`
            );
          }
        } catch (apiError) {
          console.error("Error sending order to server history:", apiError);
        }
      } catch (error) {
        console.error("Error updating order status:", error);
      }
    }, delayMs);
  };

  // Get user location
  useEffect(() => {
    getUserLocation();
  }, []);

  // Get user's current location
  const getUserLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      setCurrentRegion({
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });

      // Reverse geocode to get address details
      const addressFromCoords = await reverseGeocode(latitude, longitude);
      if (addressFromCoords) {
        setAddress({
          ...address,
          street: addressFromCoords.street || "",
          city: addressFromCoords.city || "",
          postalCode: addressFromCoords.postalCode || "",
        });

        // Mark that we've successfully obtained the user's location
        setUserLocationObtained(true);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(t("error"), t("chechout.locationError"));
    } finally {
      setIsLocating(false);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (results && results.length > 0) {
        const result = results[0];
        return {
          street: `${result.street || ""} ${result.name || ""}`,
          city: result.city || "",
          postalCode: result.postalCode || "",
        };
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
    return null;
  };

  // Open map to select location
  const handleOpenMap = () => {
    setSelectedLocation(userLocation);
    setShowMapModal(true);
  };

  // Handle map location selection
  const handleSelectLocationOnMap = async (event: any) => {
    const { coordinate } = event.nativeEvent;
    setSelectedLocation(coordinate);

    // Reverse geocode the selected location
    const addressFromCoords = await reverseGeocode(
      coordinate.latitude,
      coordinate.longitude
    );
    if (addressFromCoords) {
      setAddress({
        ...address,
        street: addressFromCoords.street || "",
        city: addressFromCoords.city || "",
        postalCode: addressFromCoords.postalCode || "",
      });
    }
  };

  // Confirm selected location and close map
  const confirmLocationSelection = () => {
    if (selectedLocation) {
      setShowMapModal(false);
    } else {
      Alert.alert(t("chechout.selectLocation"), t("chechout.tapMapToSelect"));
    }
  };

  // Place order
  // Updated placeOrder function with auto-completion after 2 minutes
  const placeOrder = async () => {
    if (!validateForm() || !isAuthenticated) {
      return;
    }

    setIsLoading(true);

    try {
      // Generate order ID with a format similar to the screenshot (e.g., "Order №19")
      const orderId = `${Math.floor(10 + Math.random() * 90)}`; // Random number between 10-99

      // Get current date in "October 18, 2024" format
      const orderDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Format address string
      const addressString = isPickup
        ? pickupPoints.find((p) => p.id === selectedPickupPoint)?.address ||
          "Pickup location"
        : `${address.street}${
            address.apartment ? `, ${address.apartment}` : ""
          }, ${address.city}, ${address.postalCode}`;

      // Find selected payment method
      let paymentMethodString: string;
      if (selectedPaymentMethod === "CARD" && selectedPaymentId) {
        const method = paymentMethods.find((p) => p.id === selectedPaymentId);
        paymentMethodString = method
          ? `Credit Card (${method.cardNumber})`
          : "Credit Card";
      } else {
        paymentMethodString = "Cash on Delivery";
      }

      // Format cart items for order history
      const orderItems = cartItems.map((item) => ({
        name: item.product.title,
        quantity: item.quantity || 1,
        price: item.product.price,
      }));

      // Создаем правильный объект координат, исключая null значение
      const coordinates = selectedLocation || userLocation || undefined;

      // Include coordinates in the delivery address if available
      const deliveryInfo: OrderDeliveryInfo = {
        isPickup,
        pickupPointId: isPickup ? selectedPickupPoint : undefined,
        address: !isPickup
          ? {
              ...address,
              coordinates: coordinates,
            }
          : undefined,
        contactlessDelivery: !isPickup ? contactlessDelivery : undefined,
      };

      // Create order object for history - matching the expected format from the order history screen
      const newOrder: Order = {
        id: orderId,
        date: orderDate,
        storeName: "Grocery Store", // This would come from the API in a real app
        items: orderItems,
        total: total.toFixed(2),
        status: "active", // Initially active
        address: addressString,
        paymentMethod: paymentMethodString,
      };

      console.log("Adding order to history:", newOrder);

      // Add to order history in AsyncStorage
      await addToOrderHistory(newOrder);

      // Schedule status change to "completed" after 2 minutes
      scheduleOrderCompletion(orderId, 2 * 60 * 1000); // 2 minutes in milliseconds

      // Clear the cart via API
      await clearCart();

      // Navigate to tracking page
      Alert.alert(
        "Order Placed Successfully",
        "Your order has been placed and is now being processed.",
        [
          {
            text: "OK",
            onPress: () => {
              // Get selected pickup point for navigation
              const selectedPoint = pickupPoints.find(
                (p) => p.id === selectedPickupPoint
              );

              // Navigate to tracking page
              router.push({
                pathname: "/(tabs)/delivery/delivery/DeliveryTrackingPage",
                params: {
                  orderId: orderId,
                  fromAddress:
                    isPickup && selectedPoint
                      ? selectedPoint.address
                      : "Store Location",
                  toAddress: isPickup ? "Customer Pickup" : addressString,
                  fromLat:
                    isPickup && selectedPoint
                      ? selectedPoint.coords.latitude
                      : 43.235,
                  fromLng:
                    isPickup && selectedPoint
                      ? selectedPoint.coords.longitude
                      : 76.909,
                  toLat:
                    !isPickup && (selectedLocation || userLocation)
                      ? (selectedLocation || userLocation)?.latitude
                      : undefined,
                  toLng:
                    !isPickup && (selectedLocation || userLocation)
                      ? (selectedLocation || userLocation)?.longitude
                      : undefined,
                  customerName: contactName,
                  useRealLocation: "true",
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error placing order:", error);
      Alert.alert("Error", "Failed to place your order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Address Modal Component
  const AddressSelectionModal = () => (
    <Modal
      visible={showAddressModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddressModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t("chechout.addressSelectionTitle")}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddressModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.addressList}>
            {savedAddresses.map((addr, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.addressItem,
                  selectedAddressIndex === index && styles.selectedAddressItem,
                ]}
                onPress={() => handleSelectSavedAddress(index)}
              >
                <View style={styles.addressItemContent}>
                  <View style={styles.addressIconContainer}>
                    <Ionicons
                      name={index === 0 ? "home" : "business"}
                      size={20}
                      color="#4A5D23"
                    />
                  </View>
                  <View style={styles.addressDetails}>
                    <Text style={styles.addressType}>
                      {index === 0 ? "Home" : index === 1 ? "Work" : "Other"}
                    </Text>
                    <Text style={styles.addressText}>
                      {addr.street}
                      {addr.apartment ? `, ${addr.apartment}` : ""}
                    </Text>
                    <Text style={styles.addressCity}>
                      {addr.city}, {addr.postalCode}
                    </Text>
                  </View>
                  <View style={styles.radioButton}>
                    {selectedAddressIndex === index && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                </View>
                {addr.instructions ? (
                  <Text style={styles.addressInstructions}>
                    {t("chechout.note")}: {addr.instructions}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addNewAddressButton}
              onPress={() => {
                setShowAddressModal(false);
                // This would typically navigate to an address form
                Alert.alert(
                  "Add New Address",
                  "This would open an address form screen"
                );
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#4A5D23" />
              <Text style={styles.addNewAddressText}>
                {t("chechout.addNewAddress")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Map modal component
  const MapSelectionModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showMapModal}
      onRequestClose={() => setShowMapModal(false)}
    >
      <SafeAreaView style={styles.mapModalContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>
            {t("chechout.selectDeliveryLocation")}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowMapModal(false)}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          {isLocating ? (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color="#FF6347" />
              <Text style={styles.loadingText}>
                {t("chechout.gettingLocation")}
              </Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={currentRegion}
              onPress={handleSelectLocationOnMap}
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  title={t("chechout.deliveryLocation")}
                  description={address.street}
                  pinColor="#FF6347"
                />
              )}
            </MapView>
          )}
        </View>

        <View style={styles.mapFooter}>
          <Text style={styles.mapFooterText}>
            {selectedLocation
              ? t("chechout.locationSelected")
              : t("chechout.tapMapToSelect")}
          </Text>
          {userLocation && (
            <TouchableOpacity
              style={styles.useCurrentLocationButton}
              onPress={() => {
                setSelectedLocation(userLocation);
                if (mapRef.current) {
                  mapRef.current.animateToRegion(
                    {
                      ...currentRegion,
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    },
                    500
                  );
                }
              }}
            >
              <Ionicons name="locate" size={20} color="#FFFFFF" />
              <Text style={styles.useCurrentLocationText}>
                Использовать мое текущее местоположение
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.confirmLocationButton,
              !selectedLocation && styles.disabledButton,
            ]}
            onPress={confirmLocationSelection}
            disabled={!selectedLocation}
          >
            <Text style={styles.confirmLocationButtonText}>
              {t("chechout.confirmLocation")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Add search addresses using Nominatim API
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setAddressSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchQuery = `${query}, Almaty, Kazakhstan`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            "User-Agent": "DalaDeliveryApp/1.0",
          },
        }
      );

      const data = await response.json();

      // Transform results to our format
      const addresses: SearchAddress[] = data.map((item: any) => ({
        name: item.display_name.split(",").slice(0, 2).join(", "),
        coordinates: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
      }));

      setAddressSearchResults(addresses);
    } catch (error) {
      console.error("Error searching addresses:", error);
      // Use backup data in case of error
      setAddressSearchResults([
        {
          name: "Dostyk 91, Almaty",
          coordinates: { latitude: 43.234525, longitude: 76.956627 },
        },
        {
          name: "Manasa 34/1, Almaty",
          coordinates: { latitude: 43.22551, longitude: 76.906395 },
        },
      ]);
    } finally {
      setIsSearching(false);
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

  // Handle address input change with debounce
  const handleAddressInputChange = (text: string) => {
    setAddressSearchInput(text);
    debouncedSearchAddresses(text);
  };

  // Select address from search results
  const handleSelectSearchAddress = (searchAddress: SearchAddress) => {
    setAddressSearchInput(searchAddress.name);
    setAddressSearchResults([]);

    // Update address fields
    const addressParts = searchAddress.name.split(",");

    setAddress({
      ...address,
      street: addressParts[0]?.trim() || "",
      city: "Almaty", // Default to Almaty
      postalCode: "", // Set default or leave empty
      instructions: "",
    });

    // Update location for delivery
    setUserLocation(searchAddress.coordinates);
    setSelectedLocation(searchAddress.coordinates);
    setUserLocationObtained(true);

    // Update map region if needed
    setCurrentRegion({
      latitude: searchAddress.coordinates.latitude,
      longitude: searchAddress.coordinates.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4A5D23" />
        <Text style={styles.loadingText}>{t("chechout.loading")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("chechout.checkout")}</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        // Loading state
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6347" />
          <Text style={styles.loadingText}>{t("chechout.loading")}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Restaurant Selection Section - Now at the top */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Select Restaurant")}</Text>

            <View style={styles.pickupPointsContainer}>
              {pickupPoints.length > 0 ? (
                pickupPoints.map((point) => (
                  <TouchableOpacity
                    key={point.id}
                    style={[
                      styles.pickupPointItem,
                      selectedPickupPoint === point.id &&
                        styles.pickupPointItemSelected,
                    ]}
                    onPress={() => handlePickupPointSelect(point.id)}
                  >
                    <View style={styles.pickupPointIcon}>
                      <Ionicons name="restaurant" size={20} color="#4A5D23" />
                    </View>
                    <View style={styles.pickupPointDetails}>
                      <Text style={styles.pickupPointName}>{point.name}</Text>
                      <Text style={styles.pickupPointAddress}>
                        {point.address}
                      </Text>
                    </View>
                    <View style={styles.radioButton}>
                      {selectedPickupPoint === point.id && (
                        <View style={styles.radioButtonSelected} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyStateText}>
                  {t("No restaurants available")}
                </Text>
              )}
            </View>
          </View>

          {/* Delivery Method Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("chechout.deliveryMethod")}
            </Text>

            <View style={styles.deliveryToggle}>
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  !isPickup && styles.deliveryOptionSelected,
                ]}
                onPress={() => toggleDeliveryMethod(false)}
              >
                <Text
                  style={[
                    styles.deliveryOptionText,
                    !isPickup && styles.deliveryOptionTextSelected,
                  ]}
                >
                  {t("chechout.delivery")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  isPickup && styles.deliveryOptionSelected,
                ]}
                onPress={() => toggleDeliveryMethod(true)}
              >
                <Text
                  style={[
                    styles.deliveryOptionText,
                    isPickup && styles.deliveryOptionTextSelected,
                  ]}
                >
                  {t("chechout.pickup")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery Address Section - show only if not pickup */}
          {!isPickup && (
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t("chechout.deliveryAddress")}
                </Text>
                <TouchableOpacity
                  style={styles.savedAddressesButton}
                  onPress={() => setShowAddressModal(true)}
                >
                  <Text style={styles.savedAddressesButtonText}>
                    {t("chechout.savedAddresses")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Real location info block */}
              {userLocationObtained && (
                <View style={styles.realLocationInfoContainer}>
                  <View style={styles.realLocationIconContainer}>
                    <Ionicons name="location" size={20} color="#4A5D23" />
                  </View>
                  <View style={styles.realLocationTextContainer}>
                    <Text style={styles.realLocationTitle}>
                      Ваше реальное местоположение используется
                    </Text>
                    <Text style={styles.realLocationDescription}>
                      Для точной доставки и отслеживания
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.mapSelectionButton}
                onPress={handleOpenMap}
              >
                <MaterialIcons name="map" size={24} color="#4A5D23" />
                <Text style={styles.mapSelectionText}>
                  {userLocation
                    ? "Изменить местоположение на карте"
                    : "Выбрать местоположение на карте"}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder={t("chechout.streetAddress")}
                value={address.street}
                onChangeText={(text) => updateAddress("street", text)}
              />

              <TextInput
                style={styles.input}
                placeholder={t("chechout.apartment")}
                value={address.apartment}
                onChangeText={(text) => updateAddress("apartment", text)}
              />

              <View style={styles.cityPostalRow}>
                <TextInput
                  style={[styles.input, styles.cityInput]}
                  placeholder={t("chechout.city")}
                  value={address.city}
                  onChangeText={(text) => updateAddress("city", text)}
                />

                <TextInput
                  style={[styles.input, styles.postalInput]}
                  placeholder={t("chechout.postalCode")}
                  value={address.postalCode}
                  onChangeText={(text) => updateAddress("postalCode", text)}
                  keyboardType="number-pad"
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={t("chechout.deliveryInstructions")}
                value={address.instructions}
                onChangeText={(text) => updateAddress("instructions", text)}
                multiline
              />

              <View style={styles.contactlessDeliveryRow}>
                <Text style={styles.contactlessText}>
                  {t("chechout.contactlessDelivery")}
                </Text>

                <Switch
                  value={contactlessDelivery}
                  onValueChange={setContactlessDelivery}
                  trackColor={{ false: "#D3D3D3", true: "#FF6347" }}
                  thumbColor="#FFF"
                />
              </View>
            </View>
          )}

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("chechout.contactInformation")}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t("chechout.fullName")} *</Text>
              <TextInput
                style={styles.textInput}
                value={contactName}
                onChangeText={setContactName}
                placeholder={t("chechout.enterFullName")}
                editable={!user} // Disable if we have user data
              />
              {user && (
                <Text style={styles.autofilledText}>
                  {t("chechout.autoFilledFromAccount")}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                {t("chechout.phoneNumber")} *
              </Text>
              <TextInput
                style={styles.textInput}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder={t("chechout.enterPhoneNumber")}
                keyboardType="phone-pad"
                editable={!user} // Disable if we have user data
              />
              {user && (
                <Text style={styles.autofilledText}>
                  {t("chechout.autoFilledFromAccount")}
                </Text>
              )}
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("chechout.paymentMethod")}
              </Text>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>
                  {t("chechout.addNew")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Payment options */}
            <View style={styles.paymentOptionsContainer}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentOption,
                    selectedPaymentMethod === method.type &&
                      selectedPaymentId === method.id &&
                      styles.paymentOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedPaymentMethod(method.type);
                    setSelectedPaymentId(method.id);
                  }}
                >
                  <View style={styles.paymentOptionIcon}>
                    {method.type === "CARD" ? (
                      <FontAwesome
                        name="credit-card"
                        size={18}
                        color="#4A5D23"
                      />
                    ) : (
                      <FontAwesome name="money" size={18} color="#4A5D23" />
                    )}
                  </View>
                  <View style={styles.paymentOptionDetails}>
                    <Text style={styles.paymentOptionTitle}>
                      {method.type === "CARD"
                        ? "Credit Card"
                        : "Cash on Delivery"}
                    </Text>
                    {method.type === "CARD" && (
                      <Text style={styles.paymentOptionSubtitle}>
                        {method.cardNumber}
                      </Text>
                    )}
                  </View>
                  <View style={styles.radioButton}>
                    {selectedPaymentMethod === method.type &&
                      selectedPaymentId === method.id && (
                        <View style={styles.radioButtonSelected} />
                      )}
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === "CASH" &&
                    selectedPaymentId === "" &&
                    styles.paymentOptionSelected,
                ]}
                onPress={() => {
                  setSelectedPaymentMethod("CASH");
                  setSelectedPaymentId("");
                }}
              >
                <View style={styles.paymentOptionIcon}>
                  <FontAwesome name="money" size={18} color="#4A5D23" />
                </View>
                <View style={styles.paymentOptionDetails}>
                  <Text style={styles.paymentOptionTitle}>
                    {t("chechout.cashOnDelivery")}
                  </Text>
                  <Text style={styles.paymentOptionSubtitle}>
                    {t("chechout.cashOnDeliveryDescription")}
                  </Text>
                </View>
                <View style={styles.radioButton}>
                  {selectedPaymentMethod === "CASH" &&
                    selectedPaymentId === "" && (
                      <View style={styles.radioButtonSelected} />
                    )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("chechout.orderSummary")}
            </Text>

            <View style={styles.orderSummaryContainer}>
              {/* Cart items list */}
              {cartItems.length > 0 ? (
                <>
                  {cartItems.map((item, index) => (
                    <View key={index} style={styles.cartItemSummary}>
                      <View style={styles.cartItemDetails}>
                        <Text style={styles.cartItemName} numberOfLines={1}>
                          {item.product.title}
                        </Text>
                        <Text style={styles.cartItemPrice}>
                          ${parseFloat(item.product.price).toFixed(2)} x{" "}
                          {item.quantity || 1}
                        </Text>
                      </View>
                      <Text style={styles.cartItemTotal}>
                        $
                        {(
                          parseFloat(item.product.price) * (item.quantity || 1)
                        ).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.divider} />
                </>
              ) : (
                <Text style={styles.emptyCartText}>
                  {t("chechout.emptyCart")}
                </Text>
              )}

              {/* Items summary */}
              <Text style={styles.orderItemCount}>
                {cartItems.length} {t("chechout.itemsFrom")}{" "}
                {cartItems.length > 0 ? "Store" : "0 stores"}
              </Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {t("chechout.subtotal")}
                </Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {t("chechout.deliveryFee")}
                </Text>
                <Text style={styles.summaryValue}>
                  ${deliveryFee.toFixed(2)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t("chechout.tax")}</Text>
                <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
              </View>

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>{t("chechout.total")}</Text>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Checkout Button */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
        ]}
      >
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={placeOrder}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.checkoutButtonText}>
                {t("chechout.placeOrder")}
              </Text>
              <Text style={styles.checkoutButtonPrice}>
                ${total.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Map Selection Modal */}
      <MapSelectionModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333333",
  },
  deliveryToggle: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  deliveryOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  deliveryOptionSelected: {
    backgroundColor: "#4A5D23",
  },
  deliveryOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666666",
  },
  deliveryOptionTextSelected: {
    color: "#FFFFFF",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    padding: 16,
  },
  pickupPointsContainer: {
    marginTop: 8,
  },
  pickupPointItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pickupPointItemSelected: {
    borderColor: "#4A5D23",
    backgroundColor: "#F9FDF7",
  },
  pickupPointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5F1E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pickupPointDetails: {
    flex: 1,
  },
  pickupPointName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  pickupPointAddress: {
    fontSize: 14,
    color: "#666666",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E5F1E0",
    borderRadius: 16,
  },
  editButtonText: {
    color: "#4A5D23",
    fontSize: 12,
    fontWeight: "600",
  },
  formSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  savedAddressesButton: {
    padding: 4,
  },
  savedAddressesButtonText: {
    color: "#4A5D23",
    fontSize: 12,
    fontWeight: "600",
  },
  realLocationInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  realLocationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5F1E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  realLocationTextContainer: {
    flex: 1,
  },
  realLocationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  realLocationDescription: {
    fontSize: 14,
    color: "#666666",
  },
  input: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  cityPostalRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  cityInput: {
    flex: 1,
    marginRight: 8,
  },
  postalInput: {
    flex: 1,
  },
  contactlessDeliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  contactlessText: {
    fontSize: 14,
    color: "#666666",
  },
  orderSummaryContainer: {
    paddingTop: 8,
  },
  orderItemCount: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666666",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333333",
    fontWeight: "500",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4A5D23",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  checkoutButton: {
    backgroundColor: "#4A5D23",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  checkoutButtonPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  closeButton: {
    padding: 4,
  },
  addressList: {
    padding: 16,
    maxHeight: 500,
  },
  cartItemSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cartItemDetails: {
    flex: 1,
    marginRight: 8,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 12,
    color: "#666666",
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
  },
  emptyCartText: {
    fontSize: 14,
    color: "#666666",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 16,
  },
  addressItem: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  addressItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedAddressItem: {
    borderColor: "#4A5D23",
    backgroundColor: "#F9FDF7",
  },
  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5F1E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressDetails: {
    flex: 1,
  },
  addressType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: "#333333",
  },
  addressCity: {
    fontSize: 14,
    color: "#666666",
  },
  addressInstructions: {
    fontSize: 12,
    color: "#666666",
    marginTop: 8,
    fontStyle: "italic",
    paddingLeft: 52,
  },
  addNewAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 8,
    backgroundColor: "#F9FDF7",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4A5D23",
  },
  addNewAddressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4A5D23",
    marginLeft: 8,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  mapFooterText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  confirmLocationButton: {
    backgroundColor: "#FF6347",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  confirmLocationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  // Styling for radio buttons
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4A5D23",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4A5D23",
  },
  // Styling for form group
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666666",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  autofilledText: {
    fontSize: 12,
    color: "#4A5D23",
    marginTop: 4,
    fontStyle: "italic",
  },
  // Styling for payment options
  paymentOptionsContainer: {
    marginTop: 8,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  paymentOptionSelected: {
    borderColor: "#4A5D23",
    backgroundColor: "#F9FDF7",
  },
  paymentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5F1E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentOptionDetails: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: "#666666",
  },
  placeholder: {
    width: 40,
  },
  searchAddressContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchAddressInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 8,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  searchResultText: {
    fontSize: 14,
    color: "#333333",
    marginLeft: 8,
  },
  useCurrentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#FF6347",
    borderRadius: 8,
  },
  useCurrentLocationText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  mapSelectionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#FF6347",
    borderRadius: 8,
  },
  mapSelectionText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
