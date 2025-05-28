import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  Linking,
  Animated,
  PanResponder,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  LayoutAnimation,
  UIManager,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import {
  Ionicons,
  FontAwesome,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import {
  globalState,
  tripManager,
  taxiRequestsManager,
  TaxiRequest,
  forceResetTripState,
} from "../../store/globalState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CancelConfirmationDialog from "./CancelConfirmationDialog";
import { useAuth } from "../../auth/AuthContext";
import SonarAnimation from "../../../components/SonarAnimation";
import { useTranslation } from "react-i18next";
import { TaxiService } from "../../services/TaxiService";
import { GeocodingService } from "../../services/GeocodingService";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

// Adjusted height constants to account for safe area
const PANEL_MIN_HEIGHT = 140; // Height in collapsed state (only driver info)
const PANEL_MAX_HEIGHT = 500; // Увеличиваем с 400 до 500 для большего обзора

// Removing Extended TaxiRequest interface that we added
interface DriverInfo {
  id: string;
  name: string;
  photo: any;
  rating: number;
  car: string;
  licensePlate: string;
  phone?: string;
}

// Demo driver data
const DEMO_DRIVER = {
  id: "d1",
  name: "Ivan Shastyn",
  rating: 4.8,
  phone: "+7 777 123 4567",
  photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
  carModel: "Toyota Camry",
  carColor: "White",
  carPlate: "A 123 BC",
};

export default function TaxiTripScreen() {
  const { t } = useTranslation();
  const [secondsRemaining, setSecondsRemaining] = useState(
    tripManager.getRemainingTime() || globalState.tripData.tripDuration
  );
  const insets = useSafeAreaInsets(); // Get safe area insets
  const [tripStatus, setTripStatus] = useState<
    | "waiting"
    | "active"
    | "completed"
    | "cancelled"
    | "accepted"
    | "in_progress"
  >(globalState.tripData.status || "waiting");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [activeRequest, setActiveRequest] = useState<TaxiRequest | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [driverFound, setDriverFound] = useState(false);
  const [isSearchingDriver, setIsSearchingDriver] = useState(false);
  const [searchTimeSeconds, setSearchTimeSeconds] = useState(0);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showTripCompletedModal, setShowTripCompletedModal] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);

  // Map related refs and state
  const mapRef = useRef<MapView>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destination, setDestination] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(PANEL_MAX_HEIGHT);
  const initialRegion = {
    latitude: 43.238949,
    longitude: 76.889709,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  // Keyboard state
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // For panel animation
  const panelHeight = useRef(new Animated.Value(PANEL_MAX_HEIGHT)).current;
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Route coordinates - используем координаты из globalState
  const [route, setRoute] = useState([
    // Начальные значения - будут обновлены в useEffect
    { latitude: 43.240854, longitude: 76.889709 }, // Driver position - будет обновлено на случайную точку
    { latitude: 43.238949, longitude: 76.889709 }, // Client position - будет обновлено из globalState
  ]);

  // Регион карты
  const [mapRegion, setMapRegion] = useState({
    latitude: 43.238949,
    longitude: 76.889709,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Driver information - initialize from globalState if available
  const [driver, setDriver] = useState<DriverInfo>({
    id: globalState.tripData.driverId || "driver123",
    name: globalState.tripData.driverName || "Ivan Shastyn",
    photo: require("@/assets/images/driver-photo.jpg"),
    rating: 5.0,
    car: "Grey Chevrolet Cobalt",
    licensePlate: "666QSO2",
  });

  // Driver info derived from driver object
  const driverName = driver?.name || "Driver";
  const driverRating = driver?.rating || 4.8;
  const driverPhoto = driver?.photo;
  const carModel = driver?.car || "Car";
  const carColor = driver?.car?.split(" ")[0] || "Grey";
  const carPlate = driver?.licensePlate || "ABC123";

  // Trip details - используем данные из activeRequest, если доступно
  const tripDetails = {
    price: activeRequest?.fare
      ? `${activeRequest.fare} ₸`
      : globalState.tripData.fare
      ? `${globalState.tripData.fare} ₸`
      : "1500 ₸",
    paymentMethod: "VISA **** **** **** 5967",
    destination:
      activeRequest?.destination.name ||
      globalState.tripData.destination ||
      "Manasa 34/1",
  };

  // Trip price and destination derived from tripDetails
  const tripPrice = tripDetails?.price || "0";
  const destinationAddress = tripDetails?.destination || "Manasa 34/1";

  // Masking the payment card number for display
  const maskedCardNumber = "•••• •••• •••• 5967";

  // Add role check from auth context
  const { user } = useAuth();
  const hasTaxiRole = React.useMemo(() => {
    if (!user || !user.role) return false;
    const roles = user.role.split(",");
    return roles.includes("driver");
  }, [user]);

  // Добавляем состояние для хранения времени последней проверки событий
  const [lastEventCheck, setLastEventCheck] = useState<number>(Date.now());

  // Функция для проверки новых событий поездки
  const checkTripEvents = async () => {
    if (!user || !user.id) return;

    try {
      // Получаем события для этого пользователя, которые произошли с момента последней проверки
      const events = await TaxiService.getTripEventsForUser(
        user.id.toString(),
        lastEventCheck
      );

      if (events.length > 0) {
        console.log(`Found ${events.length} new trip events`);

        // Обрабатываем каждое событие по порядку (от старых к новым)
        for (const event of events) {
          console.log(
            `Processing event: ${event.type} for trip ${event.tripId}`
          );

          // Обновляем UI на основе типа события
          if (event.type === "trip_accepted") {
            // Водитель принял заказ
            if (event.customerId === user.id.toString()) {
              console.log(`Trip accepted by driver: ${event.driverName}`);
              if (event.driverName && event.driverId) {
                setDriverInfo(
                  createDefaultDriver(event.driverId, event.driverName)
                );
                setDriverFound(true);
                setIsSearchingDriver(false);
              }
            }
          } else if (
            event.type === "trip_completed" ||
            event.type === "trip_cancelled"
          ) {
            // Поездка завершена или отменена
            if (
              event.customerId === user.id.toString() ||
              event.driverId === user.id.toString()
            ) {
              console.log(`Trip ${event.type.replace("trip_", "")}`);

              if (event.type === "trip_completed") {
                setTripStatus("completed");
                setShowTripCompletedModal(true);
              } else {
                setTripStatus("cancelled");
                Alert.alert(
                  t("taxi.trip.tripCancelled"),
                  t("taxi.trip.tripCancelledMessage"),
                  [
                    {
                      text: t("ok"),
                      onPress: () => {
                        tripManager.startOrderFlow();
                        globalState.needsNewOrder = true;
                        router.replace("/(tabs)/taxi-service/taxi");
                      },
                    },
                  ]
                );
              }
            }
          } else if (event.type.startsWith("trip_")) {
            // Обновление статуса поездки
            const newStatus = event.type.replace("trip_", "");
            if (
              event.customerId === user.id.toString() ||
              event.driverId === user.id.toString()
            ) {
              console.log(`Trip status updated to: ${newStatus}`);

              // Обновляем статус поездки в UI
              if (newStatus === "on_the_way" || newStatus === "arrived") {
                setTripStatus("waiting");
              } else if (newStatus === "in_progress") {
                setTripStatus("active");
              } else {
                setTripStatus(newStatus);
              }

              // Обновляем глобальное состояние
              tripManager.updateTripStatus(newStatus);
            }
          }
        }

        // Обновляем время последней проверки
        setLastEventCheck(Date.now());
      }
    } catch (error) {
      console.error("Error checking trip events:", error);
    }
  };

  // Добавляем интервал для регулярной проверки событий поездки
  useEffect(() => {
    // Запускаем периодическую проверку событий каждые 3 секунды
    const eventCheckInterval = setInterval(checkTripEvents, 3000);

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(eventCheckInterval);
  }, [user, lastEventCheck]);

  // Получаем активный заказ пользователя
  const fetchUserActiveRequest = async () => {
    if (!user || !user.id) return;

    try {
      console.log(`Fetching active request for user ${user.id}`);

      // First check if we have trip data in global state
      if (globalState.tripData.isActive) {
        console.log("Using existing trip data from global state");

        // If we have coordinates in global state, use them
        if (
          globalState.pickupCoordinates &&
          globalState.destinationCoordinates
        ) {
          setRoute([
            globalState.pickupCoordinates,
            globalState.destinationCoordinates,
          ]);

          // Update map region to show the route
          const midLat =
            (globalState.pickupCoordinates.latitude +
              globalState.destinationCoordinates.latitude) /
            2;
          const midLng =
            (globalState.pickupCoordinates.longitude +
              globalState.destinationCoordinates.longitude) /
            2;

          setMapRegion({
            latitude: midLat,
            longitude: midLng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        }

        // Continue with existing global state data
        return;
      }

      // Массив ключей, по которым будем проверять наличие сохраненных данных
      const keysToCheck = [
        `active_trip_${user.id}`, // 1. Активный трип с информацией о водителе
        `user_active_request_${user.id}`, // 2. Полный объект запроса
        `taxiRequests_${user.id}`, // 3. Массив запросов для пользователя
      ];

      let foundTrip = false;

      // 1. Проверяем наличие активного трипа, обновленного водителем
      const activeTripKey = `active_trip_${user.id}`;
      const customerTripJson = await AsyncStorage.getItem(activeTripKey);

      if (customerTripJson) {
        console.log("Found customer trip data updated by driver");
        const customerTrip = JSON.parse(customerTripJson);

        // Use the driver-updated trip information
        if (
          customerTrip.driverId &&
          customerTrip.driverId !== "pending_driver"
        ) {
          console.log(`Trip accepted by driver: ${customerTrip.driverName}`);
          setDriverFound(true);
          setIsSearchingDriver(false);
          foundTrip = true;

          // Immediately update the UI to show driver found
          // and prevent redirection to taxi screen
          if (!driver || !driver.id) {
            setDriver({
              id: customerTrip.driverId,
              name: customerTrip.driverName,
              photo: require("../../../assets/images/driver-photo.jpg"),
              rating: 4.8,
              car: "Toyota Camry",
              licensePlate: "A 234 BC",
              phone: "+7 777 123 4567",
            });
          }

          // Update trip status in global state
          tripManager.startTrip({
            driverId: customerTrip.driverId,
            driverName: customerTrip.driverName,
            origin: customerTrip.pickupAddress,
            destination: customerTrip.destinationAddress,
            fare: customerTrip.fare,
            duration: 120,
          });

          // Если есть координаты, обновляем маршрут
          if (
            customerTrip.pickupCoordinates &&
            customerTrip.destinationCoordinates
          ) {
            setRoute([
              customerTrip.pickupCoordinates,
              customerTrip.destinationCoordinates,
            ]);

            // Обновляем регион карты
            const midLat =
              (customerTrip.pickupCoordinates.latitude +
                customerTrip.destinationCoordinates.latitude) /
              2;
            const midLng =
              (customerTrip.pickupCoordinates.longitude +
                customerTrip.destinationCoordinates.longitude) /
              2;

            setMapRegion({
              latitude: midLat,
              longitude: midLng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
          }

          console.log("Updated trip state with driver info from AsyncStorage");
        }
      }

      // 2. Проверяем наличие полного запроса пользователя
      if (!foundTrip) {
        const userRequestKey = `user_active_request_${user.id}`;
        const fullRequestJson = await AsyncStorage.getItem(userRequestKey);

        if (fullRequestJson) {
          console.log("Found full trip request data saved for user");
          const fullRequest = JSON.parse(fullRequestJson);

          setActiveRequest(fullRequest);
          foundTrip = true;

          // Update driver status based on request status
          setDriverInfo(
            fullRequest.driverId !== null &&
              fullRequest.driverId !== "pending_driver"
              ? createDefaultDriver(fullRequest.driverId, "Your Driver")
              : null
          );
          setIsSearchingDriver(
            fullRequest.status === "pending" ||
              fullRequest.driverId === "pending_driver"
          );

          // Update route based on request coordinates
          if (fullRequest.pickup && fullRequest.destination) {
            setRoute([
              fullRequest.pickup.coordinates,
              fullRequest.destination.coordinates,
            ]);

            // Update map region
            const midLat =
              (fullRequest.pickup.coordinates.latitude +
                fullRequest.destination.coordinates.latitude) /
              2;
            const midLng =
              (fullRequest.pickup.coordinates.longitude +
                fullRequest.destination.coordinates.longitude) /
              2;

            setMapRegion({
              latitude: midLat,
              longitude: midLng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
          }

          // If we have a driver assigned, update the status
          if (
            fullRequest.driverId &&
            fullRequest.driverId !== "pending_driver"
          ) {
            // Update the globalState's tripData
            tripManager.startTrip({
              driverId: fullRequest.driverId,
              driverName: "Your Driver",
              origin: fullRequest.pickup.name,
              destination: fullRequest.destination.name,
              fare: fullRequest.fare,
              duration: 120,
            });
          }
        }
      }

      // 3. Если предыдущие методы не сработали, проверяем массив запросов пользователя
      if (!foundTrip) {
        const userRequestsKey = `taxiRequests_${user.id}`;
        const userRequestsJson = await AsyncStorage.getItem(userRequestsKey);

        if (userRequestsJson) {
          console.log("Found user requests array in storage");
          const userRequests = JSON.parse(userRequestsJson);

          // Ищем активный запрос пользователя (не отмененный и не завершенный)
          const activeUserRequest = userRequests.find(
            (req: TaxiRequest) =>
              req.status !== "completed" && req.status !== "cancelled"
          );

          if (activeUserRequest) {
            console.log(
              "Found active request in user requests array:",
              activeUserRequest.id
            );
            setActiveRequest(activeUserRequest);
            foundTrip = true;

            // Update driver status based on request status
            setDriverInfo(
              activeUserRequest.driverId !== null &&
                activeUserRequest.driverId !== "pending_driver"
                ? createDefaultDriver(activeUserRequest.driverId, "Your Driver")
                : null
            );
            setIsSearchingDriver(
              activeUserRequest.status === "pending" ||
                activeUserRequest.driverId === "pending_driver"
            );

            // Update route based on request coordinates
            if (activeUserRequest.pickup && activeUserRequest.destination) {
              const routeCoordinates = activeUserRequest.route || [
                activeUserRequest.pickup.coordinates,
                activeUserRequest.destination.coordinates,
              ];
              setRoute(routeCoordinates);

              // Update map region
              const midLat =
                (activeUserRequest.pickup.coordinates.latitude +
                  activeUserRequest.destination.coordinates.latitude) /
                2;
              const midLng =
                (activeUserRequest.pickup.coordinates.longitude +
                  activeUserRequest.destination.coordinates.longitude) /
                2;

              setMapRegion({
                latitude: midLat,
                longitude: midLng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
            }

            // If we have a driver assigned, update the status
            if (
              activeUserRequest.driverId &&
              activeUserRequest.driverId !== "pending_driver"
            ) {
              // Update the globalState's tripData
              tripManager.startTrip({
                driverId: activeUserRequest.driverId,
                driverName: "Your Driver",
                origin: activeUserRequest.pickup.name,
                destination: activeUserRequest.destination.name,
                fare: activeUserRequest.fare,
                duration: 120,
                route: activeUserRequest.route,
              });
            }
          }
        }
      }

      // 4. Если все предыдущие методы не сработали, используем старый метод
      if (!foundTrip) {
        // If we don't have active trip data in global state, try to fetch from local storage first
        // as a fallback in case the API is unavailable
        let request = await taxiRequestsManager.getUserActiveRequest(
          user.id.toString()
        );

        // If we have a request from local storage, use it
        if (request) {
          console.log("Found active request in local storage:", request);
          setActiveRequest(request);
          foundTrip = true;

          // Update route based on request coordinates
          if (request.pickup && request.destination) {
            setRoute([
              request.pickup.coordinates,
              request.destination.coordinates,
            ]);

            // Update map region
            const midLat =
              (request.pickup.coordinates.latitude +
                request.destination.coordinates.latitude) /
              2;
            const midLng =
              (request.pickup.coordinates.longitude +
                request.destination.coordinates.longitude) /
              2;

            setMapRegion({
              latitude: midLat,
              longitude: midLng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
          }

          // Update driver status based on request status
          setDriverInfo(
            request.driverId !== null && request.driverId !== "pending_driver"
              ? createDefaultDriver(request.driverId, "Your Driver")
              : null
          );
          setIsSearchingDriver(
            request.status === "pending" ||
              request.driverId === "pending_driver"
          );

          // If we have a driver assigned, update the status
          if (request.driverId && request.driverId !== "pending_driver") {
            // Update the globalState's tripData
            tripManager.startTrip({
              driverId: request.driverId,
              driverName:
                request.driverId === "pending_driver"
                  ? "Seeking Driver..."
                  : "Your Driver",
              origin: request.pickup.name,
              destination: request.destination.name,
              fare: request.fare,
              duration: 120,
            });
          }

          return request;
        }
      }

      // 5. Если активный запрос не найден нигде, перенаправляем на экран заказа такси
      if (!foundTrip) {
        console.log("No active request found anywhere");

        // Check if we have an active trip in globalState before redirecting
        if (!globalState.tripData.isActive && !customerTripJson) {
          console.log(
            "No active trip found anywhere, redirecting to taxi screen"
          );
          tripManager.startOrderFlow(); // Reset trip state
          router.replace("/(tabs)/taxi-service/taxi");
        }
      }
    } catch (error) {
      console.error("Error fetching user active request:", error);
    }
  };

  // Update driving status if user is a taxi driver
  useEffect(() => {
    if (hasTaxiRole && tripStatus === "waiting") {
      // For taxi drivers, automatically mark the trip as active
      // since they are the ones driving
      const updated = tripManager.updateTripStatus("active");
      if (updated) {
        setTripStatus("active");
      }
    }
  }, [hasTaxiRole, tripStatus]);

  // Check and initialize trip state on component mount
  useEffect(() => {
    // Verify if there's an active trip
    const isActive = tripManager.checkTripActive();
    console.log("Trip active check:", isActive);

    // Fetch user's active request
    const fetchTripData = async () => {
      if (!user || !user.id) {
        console.log("No user logged in, redirecting to home screen");
        router.replace("/(tabs)");
        return;
      }

      // Security check: Verify the trip belongs to the current user
      if (
        globalState.tripData.isActive &&
        globalState.tripData.driverId !== null &&
        // If user is a driver, they should only see trips they are assigned to
        hasTaxiRole &&
        globalState.tripData.driverId !== user.id.toString()
      ) {
        console.error(
          "Security alert: Attempted access to unauthorized trip data"
        );
        // Reset the global state to prevent data leakage
        resetTripAndCoordinates();
        // Redirect to appropriate screen based on role
        if (hasTaxiRole) {
          console.log(
            "Driver not authorized for this trip, redirecting to taxi screen"
          );
          router.replace("/(tabs)/taxi-service/taxi");
        } else {
          console.log("User not authorized for this trip, redirecting to home");
          router.replace("/(tabs)");
        }
        return;
      }

      // Попытаемся найти активный заказ для пользователя
      const activeReq = await fetchUserActiveRequest();
      console.log(
        "Active request for user:",
        activeReq ? `ID: ${activeReq.id}, status: ${activeReq.status}` : "None"
      );

      // Если активный запрос найден, но нет активной поездки - инициализируем её
      if (activeReq && (!isActive || !globalState.tripData.isActive)) {
        console.log(
          "Active request found but no active trip, initializing trip"
        );

        // Проверяем, есть ли уже назначенный водитель
        const hasAssignedDriver = Boolean(
          activeReq.driverId && activeReq.driverId !== "pending_driver"
        );

        // Принудительно устанавливаем состояния для предотвращения появления сонара
        setDriverFound(true);
        setIsSearchingDriver(false);

        // Всегда устанавливаем информацию о водителе, если он назначен
        if (hasAssignedDriver && activeReq.driverId) {
          setDriverInfo({
            id: activeReq.driverId,
            name: "Your Driver",
            photo: require("../../../assets/images/driver-photo.jpg"),
            rating: 4.8,
            car: "Toyota Camry",
            licensePlate: "A 234 BC",
          });

          // Сразу устанавливаем активный статус
          setTripStatus("active");
        }

        tripManager.startTrip({
          driverId: activeReq.driverId || "pending_driver",
          driverName: hasAssignedDriver ? "Your Driver" : "Seeking Driver...",
          origin: activeReq.pickup.name,
          destination: activeReq.destination.name,
          fare: activeReq.fare,
          duration: 120, // 2 minutes default
        });

        // Обновляем глобальное состояние
        globalState.isSearchingDriver = false;
        globalState.driverFound = true;
      }

      // Set global flag
      globalState.activeTaxiTrip = true;
      console.log("Trip screen mounted, trip data:", globalState.tripData);

      // Обновляем маршрут, используя координаты из запроса
      if (activeReq) {
        const clientCoordinates = activeReq.pickup.coordinates;
        const destinationCoordinates = activeReq.destination.coordinates;

        // Генерируем случайную точку для водителя в радиусе 1 км от клиента
        const driverRandomCoordinates = generateRandomNearbyPoint(
          clientCoordinates.latitude,
          clientCoordinates.longitude,
          1
        );

        // Обновляем маршрут с новыми точками
        const updatedRoute = [
          driverRandomCoordinates, // Случайная позиция водителя
          destinationCoordinates, // Конечная точка
        ];

        setRoute(updatedRoute);

        // Обновляем регион карты, чтобы показать весь маршрут
        const midLat =
          (updatedRoute[0].latitude + updatedRoute[1].latitude) / 2;
        const midLng =
          (updatedRoute[0].longitude + updatedRoute[1].longitude) / 2;

        // Вычисляем разницу между координатами для охвата обеих точек
        const latDelta =
          Math.abs(updatedRoute[0].latitude - updatedRoute[1].latitude) * 1.5;
        const lngDelta =
          Math.abs(updatedRoute[0].longitude - updatedRoute[1].longitude) * 1.5;

        setMapRegion({
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: Math.max(0.01, latDelta),
          longitudeDelta: Math.max(0.01, lngDelta),
        });
      }
    };

    fetchTripData();

    // Clean up function when component unmounts
    return () => {
      // Don't reset the trip state on unmount - we want it to persist
      console.log("Trip screen unmounted, trip state preserved");
    };
  }, []);

  // Panel gesture handler with adjusted heights
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0 && isPanelExpanded) {
          // Dragging down
          const newValue = PANEL_MAX_HEIGHT - gestureState.dy;
          panelHeight.setValue(
            Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, newValue))
          );
        } else if (gestureState.dy < 0 && !isPanelExpanded) {
          // Dragging up
          const newValue = PANEL_MIN_HEIGHT + Math.abs(gestureState.dy);
          panelHeight.setValue(
            Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, newValue))
          );
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50 && isPanelExpanded) {
          // Collapse panel
          Animated.spring(panelHeight, {
            toValue: PANEL_MIN_HEIGHT,
            useNativeDriver: false,
          }).start();
          setIsPanelExpanded(false);
        } else if (gestureState.dy < -50 && !isPanelExpanded) {
          // Expand panel
          Animated.spring(panelHeight, {
            toValue: PANEL_MAX_HEIGHT,
            useNativeDriver: false,
          }).start();
          setIsPanelExpanded(true);
        } else {
          // Return to previous state
          Animated.spring(panelHeight, {
            toValue: isPanelExpanded ? PANEL_MAX_HEIGHT : PANEL_MIN_HEIGHT,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Panel animation functions
  const expandPanel = () => {
    Animated.spring(panelHeight, {
      toValue: PANEL_MAX_HEIGHT,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setIsPanelExpanded(true);
  };

  const collapsePanel = () => {
    Animated.spring(panelHeight, {
      toValue: PANEL_MIN_HEIGHT,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setIsPanelExpanded(false);
  };

  // Toggle panel state
  const togglePanel = () => {
    if (isPanelExpanded) {
      collapsePanel();
    } else {
      expandPanel();
    }
  };

  // Countdown timer for arrival time - synced with global state
  useEffect(() => {
    // Don't start timer if we're in sonar search mode
    if (isSearchingDriver) {
      return;
    }

    const timer = setInterval(() => {
      const remaining = tripManager.getRemainingTime();

      if (remaining <= 0 && tripStatus === "waiting") {
        // When timer reaches zero, update trip status
        const updated = tripManager.updateTripStatus("active");
        if (updated) {
          setTripStatus("active");

          // Show alert that driver has arrived
          Alert.alert(
            t("taxi.trip.driverArrived"),
            t("taxi.trip.driverArrived") + ".",
            [
              {
                text: t("ok"),
                onPress: () => console.log("Driver arrival acknowledged"),
              },
            ]
          );
        }
        clearInterval(timer);
      } else {
        setSecondsRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tripStatus, isSearchingDriver]);

  // Format remaining time
  const formatTimeRemaining = () => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} second${
      seconds !== 1 ? "s" : ""
    }`;
  };

  // Get status message based on trip status
  const getStatusMessage = () => {
    switch (tripStatus) {
      case "waiting":
        return `The driver will be there in ${formatTimeRemaining()}.`;
      case "active":
        return "The driver has arrived. Enjoy your trip!";
      case "completed":
        return "Your trip has been completed.";
      case "cancelled":
        return "Your trip has been cancelled.";
      default:
        return `The driver will be there in ${formatTimeRemaining()}.`;
    }
  };

  // Call driver function
  const callDriver = () => {
    Linking.openURL("tel:+77771234567");
  };

  // Chat with driver function
  const chatWithDriver = () => {
    // Navigate to chat screen
    router.push("/(tabs)/taxi-service/chat");
  };

  // Cancel trip function - show cancel dialog
  const cancelTrip = () => {
    handleCancelTrip();
  };

  // Handle dialog close
  const handleCancelDialogClose = () => {
    setShowCancelDialog(false);
    console.log("Closing cancel dialog"); // Добавляем лог для отладки
  };

  // This is used to handle the cancellation confirmation from the dialog
  const confirmCancelTrip = (reason: string) => {
    console.log("Cancelling trip with reason:", reason);
    handleCancellationConfirm();
    setShowCancelDialog(false); // Добавляем явное закрытие модального окна
  };

  // Add these helper methods to the globalState object
  const resetTripAndCoordinates = () => {
    // Reset trip data
    globalState.activeTaxiTrip = false;
    globalState.needsNewOrder = true; // Установить флаг необходимости нового заказа

    // Reset coordinates
    globalState.pickupCoordinates = null;
    globalState.destinationCoordinates = null;

    // Reset all trip data fields
    globalState.tripData = {
      isActive: false,
      startTime: null,
      endTime: null,
      tripDuration: 120, // Сброс до 2 минут по умолчанию
      driverId: null,
      driverName: null,
      origin: null,
      destination: null,
      fare: null,
      status: null,
    };

    console.log("Global state reset completed - new order will be required");
  };

  // Add method to remove a request from taxiRequestsManager
  const removeRequestFromStorage = async (requestId: string) => {
    const requestsJson = await AsyncStorage.getItem("taxiRequests");
    if (requestsJson) {
      const requests: TaxiRequest[] = JSON.parse(requestsJson);
      const filteredRequests = requests.filter((req) => req.id !== requestId);
      await AsyncStorage.setItem(
        "taxiRequests",
        JSON.stringify(filteredRequests)
      );
      return true;
    }
    return false;
  };

  // Handle cancellation confirmation
  const handleCancellationConfirm = async () => {
    // Check if user is logged in
    if (!user || !user.id) {
      Alert.alert("Error", "You need to be logged in to cancel a trip");
      return;
    }

    try {
      // Get cancellation message
      let cancelMessage = "Trip cancelled";
      let fee = 0;

      // Get active request
      const activeRequest = await taxiRequestsManager.getUserActiveRequest(
        user.id
      );

      console.log("Cancelling request:", activeRequest);

      if (activeRequest) {
        const orderTime = new Date(activeRequest.timestamp).getTime();
        const currentTime = new Date().getTime();
        const timeDiffMinutes = (currentTime - orderTime) / (1000 * 60);

        if (timeDiffMinutes > 2) {
          fee = 5; // $5 cancellation fee after 2 minutes
          cancelMessage = `Trip cancelled with a $${fee} cancellation fee`;
        }

        try {
          // Try to cancel the trip via API first
          const response = await fetch(
            `${TaxiService["API_URL"]}/trips/${activeRequest.id}/cancel`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_id: user.id,
                cancellation_fee: fee,
              }),
            }
          );

          console.log("API cancellation response:", response.status);

          // If API cancellation failed, fall back to local cancellation
          if (!response.ok) {
            console.log(
              "API cancellation failed, falling back to local cancellation"
            );

            // Update request status locally
            await taxiRequestsManager.updateRequestStatus(
              activeRequest.id,
              "cancelled"
            );

            // Also remove from local storage
            const allRequestsJson = await AsyncStorage.getItem("taxiRequests");
            if (allRequestsJson) {
              const allRequests: TaxiRequest[] = JSON.parse(allRequestsJson);
              const filteredRequests = allRequests.filter(
                (req) => req.id !== activeRequest.id
              );
              await AsyncStorage.setItem(
                "taxiRequests",
                JSON.stringify(filteredRequests)
              );
              console.log(
                "Removed request from local storage:",
                activeRequest.id
              );
            }
          }
        } catch (error) {
          console.error("Error cancelling trip via API:", error);

          // Fallback to local cancellation
          // Update request status locally
          await taxiRequestsManager.updateRequestStatus(
            activeRequest.id,
            "cancelled"
          );

          // Also remove from local storage
          const allRequestsJson = await AsyncStorage.getItem("taxiRequests");
          if (allRequestsJson) {
            const allRequests: TaxiRequest[] = JSON.parse(allRequestsJson);
            const filteredRequests = allRequests.filter(
              (req) => req.id !== activeRequest.id
            );
            await AsyncStorage.setItem(
              "taxiRequests",
              JSON.stringify(filteredRequests)
            );
            console.log(
              "Removed request from local storage after API error:",
              activeRequest.id
            );
          }
        }
      }

      // Reset global state
      resetTripAndCoordinates();
      console.log("Trip state reset after cancellation");

      // Reset component state
      setActiveRequest(null);
      setTripStatus("cancelled");
      setIsSearchingDriver(false);
      setDriverInfo(null);

      // Show cancellation alert
      Alert.alert(t("taxi.trip.tripCancelled"), cancelMessage, [
        {
          text: t("ok"),
          onPress: () => {
            setShowCancelDialog(false);

            // Navigate to taxi order screen to allow creating a new order
            tripManager.startOrderFlow();
            globalState.needsNewOrder = true;
            router.replace("/(tabs)/taxi-service/taxi");
          },
        },
      ]);
    } catch (error) {
      console.error("Error in trip cancellation:", error);
      Alert.alert("Error", "Failed to cancel trip. Please try again.");
    }
  };

  // Go to home function
  const goToHome = () => {
    if (tripStatus === "waiting" || tripStatus === "active") {
      // If trip is still active, confirm before leaving
      Alert.alert(t("taxi.trip.tripCancelled"), t("taxi.leaveActiveTrip"), [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("yes"),
          onPress: () => {
            // Go to the home screen instead of taxi screen
            router.replace("/(tabs)");
          },
        },
      ]);
    } else {
      // If trip is already completed or cancelled, go to home screen
      router.replace("/(tabs)");
    }
  };

  // Render rating stars
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FontAwesome
          key={i}
          name="star"
          size={14}
          color={i <= rating ? "#FFC107" : "#E0E0E0"}
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  // Start the driver search process and monitor state changes
  useEffect(() => {
    // Don't use automatic driver search, just check the global state for changes
    if (
      tripStatus === "waiting" &&
      (!globalState.tripData.driverId ||
        globalState.tripData.driverId === "pending_driver")
    ) {
      console.log("Waiting for a driver to accept the request...");
      setIsSearchingDriver(true);

      // Set up an interval to only check the global state for changes
      const stateCheckTimerId = setInterval(() => {
        // Update local state from global state
        setSearchTimeSeconds(globalState.searchTimeSeconds || 0);

        // If driver info was updated in the global state
        if (
          globalState.tripData.driverId &&
          globalState.tripData.driverId !== "pending_driver"
        ) {
          console.log(
            "Driver accepted the request:",
            globalState.tripData.driverId
          );
          setDriverFound(true);
          setIsSearchingDriver(false);
          setShowDriverModal(true);

          // After showing the modal, update the trip status after a delay
          setTimeout(() => {
            setShowDriverModal(false);
            const updated = tripManager.updateTripStatus("active");
            if (updated) {
              setTripStatus("active");
            }
          }, 3000);

          // Clear the interval as we don't need to check anymore
          clearInterval(stateCheckTimerId);
        }
      }, 1000);

      // Return cleanup function
      return () => {
        clearInterval(stateCheckTimerId);
      };
    } else if (
      globalState.tripData.driverId &&
      globalState.tripData.driverId !== "pending_driver"
    ) {
      // Driver is already assigned
      setDriverFound(true);
      setIsSearchingDriver(false);
    }
  }, [tripStatus]);

  // Add keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);

        // Animate layout changes
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // Make sure modal content is visible above keyboard
        if (showCancelDialog || showDriverModal) {
          setTimeout(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        }
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);

        // Animate layout changes
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [showCancelDialog, showDriverModal]);

  // Toggle expanded content
  const toggleExpandedContent = () => {
    console.log(
      "Toggling expanded content, current state:",
      showExpandedContent
    );
    setShowExpandedContent(!showExpandedContent);

    // Также изменим высоту панели
    if (showExpandedContent) {
      // Если панель расширена, то сжимаем
      setBottomPanelHeight(PANEL_MIN_HEIGHT);
    } else {
      // Если панель сжата, то расширяем
      setBottomPanelHeight(PANEL_MAX_HEIGHT);
    }
  };

  // Get ETA text
  const getEtaText = () => {
    if (tripStatus === "waiting") {
      return t("taxi.trip.driverArrivalTime", { time: formatTimeRemaining() });
    } else if (tripStatus === "active") {
      return t("taxi.trip.driverArrived");
    } else if (tripStatus === "completed") {
      return t("taxi.trip.tripCompleted");
    } else {
      return t("taxi.trip.tripCancelled");
    }
  };

  // Handle call driver
  const handleCallDriver = () => {
    // Implement call functionality here
    Linking.openURL(`tel:${driver?.phone || "+77771234567"}`);
  };

  // Handle chat with driver
  const handleChatWithDriver = () => {
    // Navigate to chat screen
    router.push("/(tabs)/taxi-service/chat");
  };

  // Handle rating driver later
  const handleRateDriverLater = () => {
    setShowTripCompletedModal(false);
    router.replace("/(tabs)/taxi-service/taxi");
  };

  // Update driver location
  const updateDriverLocation = async (location: {
    latitude: number;
    longitude: number;
  }) => {
    try {
      // Get address name using GeocodingService
      const addressName = await GeocodingService.reverseGeocode(
        location.latitude,
        location.longitude
      );

      setDriverLocation(location);
      console.log(`Driver location updated: ${addressName}`);

      // Update map region to include both driver and destination
      if (destination) {
        const midLat = (location.latitude + destination.latitude) / 2;
        const midLng = (location.longitude + destination.longitude) / 2;

        const latDelta =
          Math.abs(location.latitude - destination.latitude) * 1.5 + 0.01;
        const lngDelta =
          Math.abs(location.longitude - destination.longitude) * 1.5 + 0.01;

        setMapRegion({
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        });
      }
    } catch (error) {
      console.error("Error updating driver location:", error);
    }
  };

  // Initialize trip data
  useEffect(() => {
    // Set initial route coordinates based on trip details
    if (globalState.pickupCoordinates && globalState.destinationCoordinates) {
      const driverCoords = generateRandomNearbyPoint(
        globalState.pickupCoordinates.latitude,
        globalState.pickupCoordinates.longitude,
        1
      );

      setDriverLocation(driverCoords);
      setDestination(globalState.destinationCoordinates);

      setRouteCoordinates([driverCoords, globalState.destinationCoordinates]);
    }
  }, []);

  // Генерируем случайную точку рядом с заданными координатами
  const generateRandomNearbyPoint = (
    lat: number,
    lng: number,
    radiusKm: number = 1
  ) => {
    // Радиус Земли примерно 6371 км
    const earthRadius = 6371;

    // Преобразуем радиус из километров в радианы
    const radiusInRadian = radiusKm / earthRadius;

    // Генерируем случайный угол в радианах
    const randomAngle = Math.random() * Math.PI * 2;

    // Генерируем случайное расстояние в пределах указанного радиуса
    const randomDistance = Math.random() * radiusInRadian;

    // Преобразуем координаты в радианы
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;

    // Вычисляем новую точку
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(randomDistance) +
        Math.cos(latRad) * Math.sin(randomDistance) * Math.cos(randomAngle)
    );

    const newLngRad =
      lngRad +
      Math.atan2(
        Math.sin(randomAngle) * Math.sin(randomDistance) * Math.cos(latRad),
        Math.cos(randomDistance) - Math.sin(latRad) * Math.sin(newLatRad)
      );

    // Преобразуем обратно в градусы
    const newLat = (newLatRad * 180) / Math.PI;
    const newLng = (newLngRad * 180) / Math.PI;

    return { latitude: newLat, longitude: newLng };
  };

  // Effect to check for trip updates periodically
  useEffect(() => {
    // Don't run polling if user is a driver
    if (hasTaxiRole) return;

    // Only poll for updates if we're in search mode
    if (isSearchingDriver && user && user.id) {
      console.log("Starting trip update polling");

      // Poll for trip updates every 5 seconds
      const updateInterval = setInterval(async () => {
        try {
          let driverFound = false;

          // Проверяем все возможные источники данных о поездке

          // 1. Проверяем активный трип
          const activeTripKey = `active_trip_${user.id}`;
          const customerTripJson = await AsyncStorage.getItem(activeTripKey);

          if (customerTripJson) {
            const customerTrip = JSON.parse(customerTripJson);

            // If driver has been assigned, update UI
            if (
              customerTrip.driverId &&
              customerTrip.driverId !== "pending_driver"
            ) {
              console.log(
                `Trip accepted by driver: ${customerTrip.driverName}`
              );

              // Update UI state
              setDriverFound(true);
              setIsSearchingDriver(false);
              driverFound = true;

              // Update driver info
              setDriver({
                id: customerTrip.driverId,
                name: customerTrip.driverName,
                photo: require("../../../assets/images/driver-photo.jpg"),
                rating: 4.8,
                car: "Toyota Camry",
                licensePlate: "A 234 BC",
                phone: "+7 777 123 4567",
              });

              // Update trip status in global state
              tripManager.startTrip({
                driverId: customerTrip.driverId,
                driverName: customerTrip.driverName,
                origin: customerTrip.pickupAddress,
                destination: customerTrip.destinationAddress,
                fare: customerTrip.fare,
                duration: 120,
              });

              // Если есть координаты, обновляем маршрут
              if (
                customerTrip.pickupCoordinates &&
                customerTrip.destinationCoordinates
              ) {
                setRoute([
                  customerTrip.pickupCoordinates,
                  customerTrip.destinationCoordinates,
                ]);

                // Обновляем регион карты
                const midLat =
                  (customerTrip.pickupCoordinates.latitude +
                    customerTrip.destinationCoordinates.latitude) /
                  2;
                const midLng =
                  (customerTrip.pickupCoordinates.longitude +
                    customerTrip.destinationCoordinates.longitude) /
                  2;

                setMapRegion({
                  latitude: midLat,
                  longitude: midLng,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                });
              }
            }
          }

          // Если водитель найден, прекращаем периодический опрос
          if (driverFound) {
            console.log("Driver found, stopping polling");
            clearInterval(updateInterval);
          }
        } catch (error) {
          console.error("Error polling for trip updates:", error);
        }
      }, 5000);

      // Clean up on unmount
      return () => clearInterval(updateInterval);
    }
  }, [isSearchingDriver, user, hasTaxiRole]);

  // Найдем функцию handleCancelTrip и изменим ее
  const handleCancelTrip = async () => {
    try {
      console.log("Starting trip cancellation process");

      // Try to get request ID from either activeRequest or globalState
      let requestId = activeRequest?.id;

      if (!requestId && globalState.tripData.isActive) {
        // If no active request but trip is active in globalState,
        // use the startTime as a fallback ID
        requestId = globalState.tripData.startTime?.toString();
        console.log("Using startTime as request ID:", requestId);
      }

      if (!requestId) {
        console.log("No request ID found, redirecting to taxi screen");
        // Reset all states and navigate
        setDriverInfo(null);
        setDriverFound(false);
        setIsSearchingDriver(false);
        setActiveRequest(null);
        setRoute([]);
        setTripStatus("cancelled");

        // Reset global state
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
        globalState.needsNewOrder = true;
        globalState.isSearchingDriver = false;
        globalState.driverFound = false;
        globalState.activeTaxiTrip = false;

        // Clear AsyncStorage
        if (user?.id) {
          const keysToRemove = [
            `trip_state_${user.id}`,
            `active_request_${user.id}`,
            `taxiRequests_${user.id}`,
            `trip_coordinates_${user.id}`,
            `active_trip_${user.id}`,
            `user_active_request_${user.id}`,
            `driver_location_${user.id}`,
            `customer_location_${user.id}`,
            `trip_events_${user.id}`,
          ];
          await AsyncStorage.multiRemove(keysToRemove);
        }

        router.replace("/(tabs)/taxi-service/taxi");
        return;
      }

      // Try to cancel the trip
      const cancelled = await TaxiService.cancelTrip(requestId);

      // Even if the API call fails, we want to clean up the local state
      if (!cancelled) {
        console.log("Trip cancellation failed, cleaning up local state anyway");
      }

      // Reset all states regardless of API response
      setDriverInfo(null);
      setDriverFound(false);
      setIsSearchingDriver(false);
      setActiveRequest(null);
      setRoute([]);
      setTripStatus("cancelled");

      // Reset global state
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
      globalState.needsNewOrder = true;
      globalState.isSearchingDriver = false;
      globalState.driverFound = false;
      globalState.activeTaxiTrip = false;

      // Clear AsyncStorage
      if (user?.id) {
        const keysToRemove = [
          `trip_state_${user.id}`,
          `active_request_${user.id}`,
          `taxiRequests_${user.id}`,
          `trip_coordinates_${user.id}`,
          `active_trip_${user.id}`,
          `user_active_request_${user.id}`,
          `driver_location_${user.id}`,
          `customer_location_${user.id}`,
          `trip_events_${user.id}`,
        ];
        await AsyncStorage.multiRemove(keysToRemove);
      }

      console.log("Trip state cleanup completed, navigating to taxi screen");
      router.replace("/(tabs)/taxi-service/taxi");
    } catch (error) {
      console.error("Error in handleCancelTrip:", error);
      Alert.alert(
        "Error",
        "An error occurred while canceling the trip. Please try again."
      );
      // Also navigate to taxi screen in case of error
      router.replace("/(tabs)/taxi-service/taxi");
    }
  };

  // В самом начале функции, после констант добавим состояние загрузки
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [taxiRequestId, setTaxiRequestId] = useState<string | null>(null);

  // В функции fetchUserActiveRequest найдем ID заказа такси
  useEffect(() => {
    if (activeRequest && activeRequest.id) {
      setTaxiRequestId(activeRequest.id);
      console.log("Set taxi request ID:", activeRequest.id);
    }
  }, [activeRequest]);

  // Добавляем эффект для очистки при размонтировании
  useEffect(() => {
    return () => {
      console.log("Trip screen unmounting, cleaning up state");

      // Очищаем состояние компонента при размонтировании
      setTaxiRequestId(null);
      setDriverLocation(null);
      setDestination(null);
      setRouteCoordinates([]);
      setMapRegion({
        latitude: 43.238949,
        longitude: 76.889709,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      setActiveRequest(null);
      setDriverInfo(null);
      setIsSearchingDriver(false);
      setSearchTimeSeconds(0);

      // Всегда очищаем глобальное состояние при размонтировании
      console.log("Resetting global state on unmount");
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
      };
      globalState.pickupCoordinates = null;
      globalState.destinationCoordinates = null;
      globalState.needsNewOrder = true;
      globalState.isSearchingDriver = false;
      globalState.driverFound = false;
      globalState.driverLocation = null;
      globalState.customerLocation = null;
      globalState.activeTaxiTrip = false;

      // Очищаем AsyncStorage
      if (user?.id) {
        const keysToRemove = [
          "activeRequest",
          "tripData",
          "tripState",
          "lastTripId",
          `trip_state_${user.id}`,
          `active_request_${user.id}`,
          `driver_location_${user.id}`,
          `customer_location_${user.id}`,
          `trip_events_${user.id}`,
          `taxi_requests_${user.id}`,
          `active_trip_${user.id}`,
          `user_active_request_${user.id}`,
        ];
        AsyncStorage.multiRemove(keysToRemove).catch((error) => {
          console.error("Error cleaning up AsyncStorage:", error);
        });
      }

      console.log("Trip state cleanup completed");
    };
  }, [user]);

  // Helper function to create default driver info
  const createDefaultDriver = (id: string, name: string): DriverInfo => ({
    id,
    name,
    photo: null,
    rating: 0,
    car: "",
    licensePlate: "",
  });

  // Location tracking states
  const [customerLocation, setCustomerLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [simulatedDriverLocation, setSimulatedDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const locationSubscription = useRef<any>(null);
  const driverSimulationInterval = useRef<any>(null);

  // Track if order is accepted
  const [isOrderAccepted, setIsOrderAccepted] = useState(false);

  // Start tracking customer location
  useEffect(() => {
    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location permission is required for this feature"
        );
        return;
      }

      // Start watching position
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          setCustomerLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    };

    startLocationTracking();

    // Cleanup
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (driverSimulationInterval.current) {
        clearInterval(driverSimulationInterval.current);
      }
    };
  }, []);

  // Add new states for driver simulation
  const [driverPhase, setDriverPhase] = useState<
    "to_customer" | "to_destination"
  >("to_customer");

  // Function to generate random initial driver position
  const generateRandomDriverStartPosition = () => {
    // Generate position 2-3 km away from customer
    const radius = 2 + Math.random(); // Random distance between 2-3 km
    const angle = Math.random() * 2 * Math.PI; // Random angle

    const lat = customerLocation!.latitude + (radius / 111) * Math.cos(angle);
    const lng = customerLocation!.longitude + (radius / 111) * Math.sin(angle);

    return { latitude: lat, longitude: lng };
  };

  // Function to simulate driver movement
  const simulateDriverMovement = (
    currentPos: { latitude: number; longitude: number },
    targetPos: { latitude: number; longitude: number },
    speed: number = 0.1
  ) => {
    const newLat =
      currentPos.latitude + (targetPos.latitude - currentPos.latitude) * speed;
    const newLng =
      currentPos.longitude +
      (targetPos.longitude - currentPos.longitude) * speed;

    return { latitude: newLat, longitude: newLng };
  };

  // Calculate distance between two points
  const calculateDistance = (
    pos1: { latitude: number; longitude: number },
    pos2: { latitude: number; longitude: number }
  ) => {
    return Math.sqrt(
      Math.pow(pos1.latitude - pos2.latitude, 2) +
        Math.pow(pos1.longitude - pos2.longitude, 2)
    );
  };

  // Start driver simulation when order is accepted
  useEffect(() => {
    if (isOrderAccepted && customerLocation) {
      // Generate random initial position for driver
      const initialDriverLocation = generateRandomDriverStartPosition();
      setSimulatedDriverLocation(initialDriverLocation);
      setDriverPhase("to_customer");

      // Start movement simulation
      driverSimulationInterval.current = setInterval(() => {
        if (!simulatedDriverLocation) return;

        const targetPosition =
          driverPhase === "to_customer" ? customerLocation : destination;

        if (!targetPosition) return;

        // Calculate new position
        const newLocation = simulateDriverMovement(
          simulatedDriverLocation,
          targetPosition,
          driverPhase === "to_customer" ? 0.1 : 0.05 // Slower speed when driving to destination
        );

        // Update driver location
        setSimulatedDriverLocation(newLocation);

        // Check if reached target
        const distance = calculateDistance(newLocation, targetPosition);

        if (distance < 0.0001) {
          // About 10 meters
          if (driverPhase === "to_customer") {
            // Reached customer, now head to destination
            setDriverPhase("to_destination");
            // Show alert that driver has arrived
            Alert.alert(
              t("taxi.trip.driverArrived"),
              t("taxi.trip.driverArrivedMessage"),
              [{ text: t("ok") }]
            );
          } else {
            // Reached destination
            clearInterval(driverSimulationInterval.current);
            // Show trip completed modal
            setShowTripCompletedModal(true);
          }
        }
      }, 1000);
    }

    return () => {
      if (driverSimulationInterval.current) {
        clearInterval(driverSimulationInterval.current);
      }
    };
  }, [isOrderAccepted, customerLocation, driverPhase]);

  // Update map to show route between driver, customer and destination
  const renderRoute = () => {
    if (!simulatedDriverLocation || !customerLocation || !destination)
      return null;

    return (
      <>
        {/* Show route line */}
        <Polyline
          coordinates={
            driverPhase === "to_customer"
              ? [simulatedDriverLocation, customerLocation]
              : [simulatedDriverLocation, destination]
          }
          strokeWidth={3}
          strokeColor="#000"
        />

        {/* Show all markers */}
        <Marker coordinate={simulatedDriverLocation}>
          <View style={styles.driverMarker}>
            <MaterialCommunityIcons name="car" size={24} color="#000" />
          </View>
        </Marker>

        <Marker coordinate={customerLocation}>
          <View style={styles.customerMarker}>
            <View style={styles.customerDot} />
          </View>
        </Marker>

        <Marker coordinate={destination}>
          <MaterialIcons name="location-pin" size={32} color="#F44336" />
        </Marker>
      </>
    );
  };

  // Update isOrderAccepted when trip status changes
  useEffect(() => {
    setIsOrderAccepted(
      tripStatus === "accepted" || tripStatus === "in_progress"
    );
  }, [tripStatus]);

  // Update map region to show all points
  const updateMapRegion = () => {
    if (
      !simulatedDriverLocation ||
      !customerLocation ||
      !destination ||
      !mapRef.current
    )
      return;

    const points = [simulatedDriverLocation, customerLocation, destination];

    // Calculate bounds
    const minLat = Math.min(...points.map((p) => p.latitude));
    const maxLat = Math.max(...points.map((p) => p.latitude));
    const minLng = Math.min(...points.map((p) => p.longitude));
    const maxLng = Math.max(...points.map((p) => p.longitude));

    // Calculate center
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    // Calculate deltas with padding
    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;

    mapRef.current.animateToRegion(
      {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(latDelta, 0.02),
        longitudeDelta: Math.max(lngDelta, 0.02),
      },
      1000
    );
  };

  // Update map region when points change
  useEffect(() => {
    if (isOrderAccepted) {
      updateMapRegion();
    }
  }, [simulatedDriverLocation, customerLocation, destination, driverPhase]);

  const renderTripDetails = () => (
    <View style={styles.tripDetailsContainer}>
      <Text style={styles.sectionTitle}>{t("taxi.trip.tripDetails")}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{t("taxi.trip.priceOfTrip")}</Text>
        <Text style={styles.detailValue}>{tripPrice}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{t("taxi.trip.paymentMethod")}</Text>
        <Text style={styles.detailValue}>{maskedCardNumber}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{t("taxi.trip.travelPoint")}</Text>
        <Text style={styles.detailValue}>{destinationAddress}</Text>
      </View>
    </View>
  );

  const renderDriverInfo = () => (
    <View style={styles.driverInfoContainer}>
      <Text style={styles.sectionTitle}>{t("taxi.trip.driverInfo")}</Text>
      <View style={styles.driverCard}>
        <Image
          source={driverPhoto}
          style={styles.driverPhoto}
          defaultSource={require("./../../../assets/images/driver-placeholder.jpg")}
        />
        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>{driverName}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>{t("taxi.trip.rating")}: </Text>
            {renderStars(driverRating)}
          </View>
          <View style={styles.carInfo}>
            <Text style={styles.carLabel}>{t("taxi.trip.car")}: </Text>
            <Text style={styles.carValue}>{carModel}</Text>
          </View>
          <View style={styles.plateInfo}>
            <Text style={styles.plateLabel}>
              {t("taxi.trip.licensePlate")}:{" "}
            </Text>
            <Text style={styles.plateValue}>{carPlate}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={[styles.actionButton, styles.callButton]}
        onPress={handleCallDriver}
      >
        <Ionicons name="call" size={24} color="white" />
        <Text style={styles.actionButtonText}>{t("taxi.trip.callDriver")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.chatButton]}
        onPress={handleChatWithDriver}
      >
        <Ionicons name="chatbubble" size={24} color="white" />
        <Text style={styles.actionButtonText}>
          {t("taxi.trip.chatWithDriver")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCancelButton = () => (
    <TouchableOpacity
      style={[styles.actionButton, styles.cancelButton]}
      onPress={handleCancelTrip}
    >
      <Text style={styles.cancelButtonText}>{t("taxi.trip.cancelTrip")}</Text>
    </TouchableOpacity>
  );

  const renderTripStatus = () => {
    let statusMessage = "";
    switch (tripStatus) {
      case "waiting":
        statusMessage = t("taxi.trip.waitingForDriver");
        break;
      case "accepted":
        statusMessage = t("taxi.trip.driverOnWay");
        break;
      case "in_progress":
        statusMessage = t("taxi.trip.inProgress");
        break;
      case "completed":
        statusMessage = t("taxi.trip.completed");
        break;
      case "cancelled":
        statusMessage = t("taxi.trip.cancelled");
        break;
      default:
        statusMessage = "";
    }
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>
    );
  };

  const renderTripCompletedModal = () => (
    <Modal
      visible={showTripCompletedModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t("taxi.trip.thankYou")}</Text>
          <Text style={styles.modalSubtitle}>
            {t("taxi.trip.howWasYourTrip")}
          </Text>
          <View style={styles.ratingContainer}>{renderStars(5)}</View>
          <TextInput
            style={styles.commentInput}
            placeholder={t("taxi.trip.leaveComment")}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleRateDriverLater}
          >
            <Text style={styles.submitButtonText}>{t("taxi.trip.submit")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.laterButton}
            onPress={handleRateDriverLater}
          >
            <Text style={styles.laterButtonText}>
              {t("taxi.trip.rateLater")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          mapType="standard"
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {isOrderAccepted && renderRoute()}
        </MapView>

        <TouchableOpacity style={styles.backButton} onPress={goToHome}>
          <MaterialIcons name="arrow-back" size={24} color="#212121" />
          <Text style={styles.visuallyHidden}>{t("taxi.trip.goBack")}</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.bottomPanel,
          {
            height: bottomPanelHeight,
            paddingBottom: keyboardVisible ? 10 : 20,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.arrivalIndicator}
          onPress={toggleExpandedContent}
          activeOpacity={0.7}
        >
          <View style={styles.indicatorLine} />
        </TouchableOpacity>

        {/* Searching for driver or driver found message */}
        {isSearchingDriver && !driverFound ? (
          <View style={styles.searchingContainer}>
            <SonarAnimation
              isSearching={isSearchingDriver}
              searchTimeSeconds={searchTimeSeconds}
              maxDiameter={120}
              minDiameter={40}
              initialDiameter={40}
              pulseCount={3}
              animationDelay={1000}
              backgroundColor="#4A5D23"
              pulseMode={true}
              onDriverFound={() => setDriverFound(true)}
            />
            <Text style={styles.searchingText}>
              {t("taxi.trip.searchingDriver")}
            </Text>
            <TouchableOpacity
              style={styles.cancelSearchButton}
              onPress={cancelTrip}
            >
              <Text style={styles.cancelSearchButtonText}>
                {t("taxi.trip.cancelSearch")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.arrivalText}>
            <Text style={styles.underlinedText}>
              {t("taxi.trip.driverArrivalTime", { time: "2" })}
            </Text>
          </Text>
        )}

        {/* Driver Info */}
        {(driverFound || driverInfo) && (
          <View style={styles.driverInfoContainer}>
            <Image
              source={
                driverInfo?.photo ||
                require("../../../assets/images/driver-placeholder.jpg")
              }
              style={styles.driverPhoto}
            />
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>
                {driverInfo?.name || driverName}
              </Text>
              <View style={styles.ratingContainer}>
                {renderStars(driverRating)}
              </View>
              <Text style={styles.carInfo}>
                {carColor} {carModel}, {carPlate}
              </Text>
            </View>
            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleCallDriver}
                accessibilityLabel={t("taxi.trip.callDriver")}
              >
                <MaterialIcons name="phone" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, styles.chatButton]}
                onPress={handleChatWithDriver}
                accessibilityLabel={t("taxi.trip.chatWithDriver")}
              >
                <MaterialIcons name="chat" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Trip Details */}
        {(driverFound || driverInfo) && (
          <View style={styles.tripDetailsContainer}>
            <View style={styles.tripDetailRow}>
              <Text style={styles.tripDetailLabel}>
                {t("taxi.trip.priceOfTrip")}
              </Text>
              <Text style={styles.tripDetailValue}>{tripPrice}</Text>
            </View>

            <View style={styles.tripDetailRow}>
              <Text style={styles.tripDetailLabel}>
                {t("taxi.trip.paymentMethod")}
              </Text>
              <View style={styles.paymentMethodContainer}>
                <View style={styles.paymentIcon}>
                  <Text style={styles.paymentIconText}>VISA</Text>
                </View>
                <Text style={styles.paymentCardText}>{maskedCardNumber}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.driverInfoLink}>
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailLabel}>
                  {t("taxi.trip.driverInfo")}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#757575" />
              </View>
            </TouchableOpacity>

            <View style={styles.tripDetailRow}>
              <Text style={styles.tripDetailLabel}>
                {t("taxi.trip.travelPoint")}
              </Text>
              <View style={styles.destinationContainer}>
                <Text
                  style={styles.tripDetailValue}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {destinationAddress}
                </Text>
              </View>
            </View>

            {(tripStatus === "waiting" || tripStatus === "active") && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelTrip}
                >
                  <Text style={styles.cancelButtonText}>
                    {t("taxi.trip.cancelTrip")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Scroll content - only shown if expanded and not in searching state */}
        {!isSearchingDriver && !keyboardVisible && showExpandedContent && (
          <ScrollView
            style={styles.expandedContentScrollable}
            contentContainerStyle={styles.expandedContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Additional content can go here */}
          </ScrollView>
        )}
      </Animated.View>

      {/* Modals */}
      <Modal
        visible={showCancelDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelDialogClose}
      >
        <CancelConfirmationDialog
          visible={showCancelDialog}
          onClose={handleCancelDialogClose}
          onConfirm={confirmCancelTrip}
          tripStage={
            tripStatus as
              | "waiting"
              | "active"
              | "completed"
              | "cancelled"
              | null
          }
        />
      </Modal>

      <Modal
        visible={showTripCompletedModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              keyboardVisible && styles.modalContentWithKeyboard,
            ]}
          >
            <MaterialIcons
              name="check-circle"
              size={50}
              color="#4A5D23"
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Trip Completed!</Text>
            <Text style={styles.modalText}>
              Thank you for using our service. We hope you had a pleasant trip.
            </Text>
            <Image
              source={
                driverPhoto
                  ? { uri: driverPhoto }
                  : require("../../../assets/images/driver-placeholder.jpg")
              }
              style={styles.modalDriverPhoto}
            />
            <Text style={styles.modalDriverInfo}>
              How was your trip with {driverName}?
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleRateDriverLater}
            >
              <Text style={styles.modalButtonText}>Rate Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    position: "relative",
  },
  map: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 100,
  },
  tripDetailsContainer: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 20,
  },
  driverInfoContainer: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  carInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  plateInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  textLabel: {
    fontSize: 14,
    color: "#757575",
  },
  textValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212121",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212121",
    textAlign: "center",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: "#757575",
    textAlign: "center",
    marginBottom: 20,
  },
  statusBox: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  statusMessage: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4CAF50",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
  },
  secondaryButton: {
    backgroundColor: "#673AB7",
  },
  dangerButton: {
    backgroundColor: "#FF3B30",
  },
  textInput: {
    width: "100%",
    height: 100,
    borderWidth: 1,
    borderColor: "#757575",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  arrivalIndicator: {
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  indicatorLine: {
    width: 40,
    height: 4,
    backgroundColor: "#DADADA",
    borderRadius: 10,
  },
  arrivalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  underlinedText: {
    textDecorationLine: "underline",
    fontSize: 16,
  },
  searchingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
  },
  searchingText: {
    fontSize: 16,
    color: "#333",
    marginTop: 10,
  },
  contactButtons: {
    flexDirection: "row",
  },
  contactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  chatButton: {
    backgroundColor: "#673AB7",
  },
  tripDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tripDetailLabel: {
    fontSize: 14,
    color: "#757575",
  },
  tripDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212121",
    maxWidth: "60%",
    textAlign: "right",
  },
  paymentMethodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    backgroundColor: "#000",
    marginRight: 5,
  },
  paymentIconText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  paymentCardText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212121",
  },
  destinationContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  driverInfoLink: {
    width: "100%",
  },
  actionButtonsContainer: {
    marginTop: 20,
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  carMarker: {
    backgroundColor: "white",
    padding: 8,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#4A5D23",
    justifyContent: "center",
    alignItems: "center",
  },
  destinationMarker: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalContentWithKeyboard: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 50,
    height: "auto",
    maxHeight: "70%",
    width: "90%",
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#212121",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#616161",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  modalDriverPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
  },
  modalDriverInfo: {
    fontSize: 16,
    fontWeight: "500",
    color: "#424242",
    marginBottom: 24,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: "#4A5D23",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  expandedContentScrollable: {
    width: "100%",
    marginTop: 5,
    maxHeight: 400,
  },
  expandedContentContainer: {
    paddingBottom: 30,
  },
  visuallyHidden: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
  },
  cancelSearchButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
  },
  cancelSearchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  customerMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 122, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  customerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF",
  },
  driverMarker: {
    padding: 5,
    backgroundColor: "#FFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#000",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#212121",
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: "#757575",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#212121",
  },
  ratingLabel: {
    fontSize: 14,
    color: "#757575",
    marginRight: 5,
  },
  carLabel: {
    fontSize: 14,
    color: "#757575",
    marginRight: 5,
  },
  plateLabel: {
    fontSize: 14,
    color: "#757575",
    marginRight: 5,
  },
  plateValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212121",
  },
  statusContainer: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4CAF50",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
  },
  callButton: {
    backgroundColor: "#4CAF50",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  laterButton: {
    backgroundColor: "#673AB7",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  laterButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  commentInput: {
    width: "100%",
    height: 100,
    borderWidth: 1,
    borderColor: "#757575",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  carValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212121",
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
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
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  panelContent: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});
