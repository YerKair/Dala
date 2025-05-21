import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  NativeModules,
  Platform,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Ionicons,
  FontAwesome5,
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Order, OrderService } from "../../../services/OrderService";
import { calculateEstimatedDeliveryTime } from "../utils/helpers";
import { useAuth } from "../../../auth/AuthContext";

const { width, height } = Dimensions.get("window");

interface DriverInfo {
  id: string;
  name: string;
  photoUrl: string | null;
  rating: number;
  vehicleInfo: string;
  licensePlate: string;
  phone: string;
}

type DeliveryStatus =
  | "preparing"
  | "pickup"
  | "onTheWay"
  | "arrived"
  | "delivered";

// Определяем тип для точек маршрута
interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function DeliveryTrackingPage() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const params = useLocalSearchParams();
  const {
    orderId,
    fromAddress,
    toAddress,
    fromLat,
    fromLng,
    toLat,
    toLng,
    customerName,
  } = params;

  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] =
    useState("15-20 min");

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false);
  const [deliveryStatus, setDeliveryStatus] =
    useState<DeliveryStatus>("preparing");
  const [deliveryProgress, setDeliveryProgress] = useState(0);

  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
  const bottomSheetHeight = useRef(new Animated.Value(100)).current;
  const fullBottomSheetHeight = 380;
  const collapsedBottomSheetHeight = 100;

  const arrowRotation = useRef(new Animated.Value(1)).current;

  const [currentHeight, setCurrentHeight] = useState(
    collapsedBottomSheetHeight
  );
  const startDragHeight = useRef(collapsedBottomSheetHeight);

  // Map reference
  const mapRef = useRef<MapView>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Store the current height at the start of the drag
        startDragHeight.current = currentHeight;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new height from the starting height and gesture delta
        const newHeight = startDragHeight.current + gestureState.dy * -1;

        if (
          newHeight >= collapsedBottomSheetHeight &&
          newHeight <= fullBottomSheetHeight
        ) {
          // Update both the animated value and our state tracker
          bottomSheetHeight.setValue(newHeight);
          setCurrentHeight(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Determine whether to snap to expanded or collapsed state
        const shouldExpand =
          currentHeight >
          (collapsedBottomSheetHeight + fullBottomSheetHeight) / 2;
        toggleBottomSheet(shouldExpand);
      },
    })
  ).current;

  const [driverInfo, setDriverInfo] = useState<DriverInfo>({
    id: "driver1",
    name: "Alex K.",
    photoUrl: null,
    rating: 4.8,
    vehicleInfo: "Toyota Corolla, White",
    licensePlate: "KZ 777 ABC",
    phone: "+7 777 123 4567",
  });

  const [fromCoords, setFromCoords] = useState({
    latitude: fromLat ? parseFloat(fromLat as string) : 43.235,
    longitude: fromLng ? parseFloat(fromLng as string) : 76.909,
  });

  const [toCoords, setToCoords] = useState({
    latitude: toLat ? parseFloat(toLat as string) : 43.258,
    longitude: toLng ? parseFloat(toLng as string) : 76.945,
  });

  const [driverLocation, setDriverLocation] = useState({
    latitude: 0,
    longitude: 0,
  });

  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Location accuracy tracking
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationUpdateTimestamp, setLocationUpdateTimestamp] = useState<
    number | null
  >(null);

  // Добавляем состояния для маршрута
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [deliveryEta, setDeliveryEta] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Состояние для демо-прогресса
  const [demoMode, setDemoMode] = useState(true);
  const progressInterval = useRef<NodeJS.Timeout | number | null>(null);

  // Функция для запуска демо-прогресса доставки
  const startDemoProgress = useCallback(() => {
    // Установка начального статуса и прогресса
    setDeliveryStatus("preparing");
    setDeliveryProgress(0);

    // Вычисление общего времени демо-доставки (50 секунд)
    const totalDemoTime = 50; // в секундах
    const interval = 1000; // обновление каждую секунду
    const incrementStep = 1 / totalDemoTime;

    // Проверяем, есть ли маршрут
    if (routePoints.length === 0) {
      console.warn("No route points available for demo progress");
      return;
    }

    progressInterval.current = setInterval(() => {
      setDeliveryProgress((prev) => {
        const newProgress = Math.min(prev + incrementStep, 1);

        // Обновление статуса доставки на основе прогресса
        if (newProgress >= 0 && newProgress < 0.2) {
          setDeliveryStatus("preparing");
        } else if (newProgress >= 0.2 && newProgress < 0.4) {
          setDeliveryStatus("pickup");
        } else if (newProgress >= 0.4 && newProgress < 0.8) {
          setDeliveryStatus("onTheWay");
        } else if (newProgress >= 0.8 && newProgress < 0.98) {
          setDeliveryStatus("arrived");
        } else if (newProgress >= 0.98) {
          setDeliveryStatus("delivered");
        }

        // Обновление позиции курьера на маршруте в соответствии с прогрессом
        if (routePoints.length > 0) {
          // Вычисляем индекс точки маршрута на основе текущего прогресса
          const routeIndex = Math.min(
            Math.floor(newProgress * routePoints.length),
            routePoints.length - 1
          );

          if (routePoints[routeIndex]) {
            setDriverLocation(routePoints[routeIndex]);
          }
        }

        // Когда прогресс полный, останавливаем интервал
        if (newProgress >= 1) {
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
        }

        return newProgress;
      });
    }, interval);
  }, [routePoints]);

  // Update for delivery status
  const getDeliveryStatusStep = (status: string): DeliveryStatus => {
    switch (status) {
      case "confirmed":
        return "preparing";
      case "preparing":
        return "preparing";
      case "out_for_delivery":
        return "onTheWay";
      case "delivered":
        return "delivered";
      default:
        return "preparing";
    }
  };

  // Функция для расчета расстояния между двумя точками
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Радиус Земли в км
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Расстояние в км
    return distance;
  };

  // Функция для преобразования градусов в радианы
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  // Функция для отображения времени в минутах и секундах
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  };

  // Обновленная функция получения статусного текста
  const getDeliveryStatusText = (status: DeliveryStatus): string => {
    switch (status) {
      case "preparing":
        return "Ваш заказ готовится";
      case "pickup":
        return "Курьер забирает ваш заказ";
      case "onTheWay":
        return "Курьер в пути";
      case "arrived":
        return "Курьер прибыл";
      case "delivered":
        return "Заказ доставлен";
      default:
        return "Отслеживание заказа...";
    }
  };

  // Function to simulate delivery progress
  const simulateDeliveryProgress = () => {
    // Only simulate if order exists and status is not delivered
    if (!order || order.status === "delivered") return;

    // Simple state transition
    setTimeout(() => {
      if (deliveryStatus === "preparing") {
        setDeliveryStatus("pickup");
        setDeliveryProgress(0.25);
      } else if (deliveryStatus === "pickup") {
        setDeliveryStatus("onTheWay");
        setDeliveryProgress(0.5);
      } else if (deliveryStatus === "onTheWay" && deliveryProgress < 0.9) {
        setDeliveryProgress((prev) => prev + 0.1);
      } else if (deliveryStatus === "onTheWay" && deliveryProgress >= 0.9) {
        setDeliveryStatus("arrived");
        setDeliveryProgress(0.95);
      } else if (deliveryStatus === "arrived") {
        setDeliveryStatus("delivered");
        setDeliveryProgress(1);
      }
    }, 10000); // Change stages every 10 seconds for demo
  };

  // Get high accuracy user location with better tracking
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationPermissionGranted(false);
          Alert.alert(
            "Permission Denied",
            "Location permission is required to track your delivery."
          );
          return;
        }

        setLocationPermissionGranted(true);

        // Get initial location with high accuracy
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        if (initialLocation) {
          const { latitude, longitude, accuracy } = initialLocation.coords;
          const newUserLocation = { latitude, longitude };
          setUserLocation(newUserLocation);
          setLocationAccuracy(accuracy);
          setLocationUpdateTimestamp(initialLocation.timestamp);

          // Если не были указаны конкретные координаты в параметрах,
          // обновляем точку назначения с реальным местоположением
          if (!toLat || !toLng) {
            setToCoords(newUserLocation);
            // Перерасчет маршрута с новыми координатами
            if (fromCoords.latitude !== 0 && fromCoords.longitude !== 0) {
              calculateRoute(fromCoords, newUserLocation);
            }
          }

          // Center map on user initially if we have a position
          if (mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              },
              1000
            );
          }
        }

        // Subscribe to location updates with higher accuracy and frequency
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5, // Update every 5 meters
            timeInterval: 3000, // Or at least every 3 seconds
          },
          (location) => {
            const { latitude, longitude, accuracy } = location.coords;
            const newLocation = { latitude, longitude };
            setUserLocation(newLocation);
            setLocationAccuracy(accuracy);
            setLocationUpdateTimestamp(location.timestamp);

            // Если не были указаны конкретные координаты в параметрах,
            // обновляем точку назначения с новым местоположением
            if (!toLat || !toLng) {
              setToCoords(newLocation);
            }
          }
        );
      } catch (error) {
        console.error("Error getting location:", error);
        Alert.alert(
          "Location Error",
          "Could not access your location. Please check your device settings."
        );
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const toggleBottomSheet = (expand = !bottomSheetExpanded) => {
    const toValue = expand ? fullBottomSheetHeight : collapsedBottomSheetHeight;

    Animated.parallel([
      Animated.timing(bottomSheetHeight, {
        toValue: toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(arrowRotation, {
        toValue: expand ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

    setCurrentHeight(toValue);
    setBottomSheetExpanded(expand);
  };

  const arrowRotateStyle = {
    transform: [
      {
        rotate: arrowRotation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        }),
      },
    ],
  };

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please log in to track your delivery",
        [
          {
            text: "OK",
            onPress: () => router.push("/auth/login"),
          },
        ]
      );
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const initializeTracking = async () => {
      setIsLoading(true);
      try {
        // Try to get user's current location for initial region
        let initialLocation = null;
        if (locationPermissionGranted && userLocation) {
          initialLocation = userLocation;

          // Используем реальное местоположение пользователя как конечную точку доставки
          // только если не были указаны конкретные координаты в параметрах
          // или если явно указан параметр useRealLocation
          const useRealLocationParam = params.useRealLocation === "true";
          if (!toLat || !toLng || useRealLocationParam) {
            setToCoords(userLocation);
          }
        }

        // Set initial region based on user location if available, otherwise use restaurant and destination midpoint
        const initialRegion = initialLocation
          ? {
              latitude: initialLocation.latitude,
              longitude: initialLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }
          : {
              latitude: (fromCoords.latitude + toCoords.latitude) / 2,
              longitude: (fromCoords.longitude + toCoords.longitude) / 2,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            };

        setRegion(initialRegion);

        // Driver starts at restaurant
        setDriverLocation(fromCoords);

        // Рассчитываем маршрут между рестораном и пунктом назначения
        // Используем координаты из параметров, если они есть, иначе используем реальное местоположение пользователя
        const useRealLocationParam = params.useRealLocation === "true";
        const destinationCoords = useRealLocationParam
          ? userLocation || toCoords
          : toLat && toLng
          ? toCoords
          : userLocation || toCoords;

        await calculateRoute(fromCoords, destinationCoords);

        const estimatedTime = calculateEstimatedDeliveryTime(
          fromCoords.latitude,
          fromCoords.longitude,
          destinationCoords.latitude,
          destinationCoords.longitude
        );
        setEstimatedDeliveryTime(estimatedTime);

        if (orderId) {
          const orderData = await OrderService.getOrderById(orderId as string);
          if (orderData) {
            setOrder(orderData);
            // Set delivery status based on order status
            setDeliveryStatus(getDeliveryStatusStep(orderData.status));

            // Calculate progress based on status
            switch (getDeliveryStatusStep(orderData.status)) {
              case "preparing":
                setDeliveryProgress(0.1);
                break;
              case "pickup":
                setDeliveryProgress(0.25);
                break;
              case "onTheWay":
                setDeliveryProgress(0.5);
                break;
              case "arrived":
                setDeliveryProgress(0.9);
                break;
              case "delivered":
                setDeliveryProgress(1);
                break;
            }
          }
        }

        // Запускаем автоматическое заполнение прогресса для демо-режима
        if (demoMode) {
          startDemoProgress();
        }
      } catch (error) {
        console.error("Failed to initialize tracking:", error);
        Alert.alert("Error", "Failed to load delivery tracking information");
      } finally {
        setIsLoading(false);
      }
    };

    initializeTracking();

    // При размонтировании компонента очищаем интервал прогресс-бара
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [
    fromLat,
    fromLng,
    toLat,
    toLng,
    orderId,
    isAuthenticated,
    userLocation,
    locationPermissionGranted,
    demoMode, // Добавляем зависимость от демо-режима
  ]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || routePoints.length === 0) return;

    // Симуляция движения курьера по маршруту
    let currentPointIndex = 0;
    let progressIncrement = 1 / (routePoints.length - 1);

    const interval = setInterval(() => {
      // Двигаем курьера только если заказ в нужном статусе
      if (deliveryStatus === "onTheWay" || deliveryStatus === "pickup") {
        if (currentPointIndex < routePoints.length - 1) {
          currentPointIndex++;

          // Обновляем позицию курьера
          setDriverLocation(routePoints[currentPointIndex]);

          // Обновляем прогресс доставки
          const newProgress = Math.min(
            0.5 + progressIncrement * currentPointIndex,
            0.9
          );
          setDeliveryProgress(newProgress);

          // Когда курьер почти достиг пункта назначения
          if (currentPointIndex === routePoints.length - 2) {
            setDeliveryStatus("arrived");
            setDeliveryProgress(0.95);
          }

          // Если курьер достиг конечной точки
          if (currentPointIndex === routePoints.length - 1) {
            setTimeout(() => {
              setDeliveryStatus("delivered");
              setDeliveryProgress(1);
            }, 10000); // Через 10 секунд доставка завершается
          }
        } else {
          clearInterval(interval);
        }
      }
    }, 2000); // Интервал обновления позиции курьера (каждые 2 секунды)

    // Симуляция этапов доставки
    const stageInterval = setInterval(() => {
      simulateDeliveryProgress();
    }, 10000); // Интервал обновления статуса (каждые 10 секунд)

    return () => {
      clearInterval(interval);
      clearInterval(stageInterval);
    };
  }, [
    fromCoords,
    toCoords,
    isLoading,
    isAuthenticated,
    deliveryStatus,
    routePoints,
  ]);

  const goBack = () => {
    router.back();
  };

  const contactDriver = () => {
    if (driverInfo && driverInfo.phone) {
      Linking.openURL(`tel:${driverInfo.phone}`);
    } else {
      Alert.alert(
        "Contact Driver",
        `Call ${driverInfo.name} at ${driverInfo.phone}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Call",
            style: "default",
            onPress: () => Linking.openURL(`tel:${driverInfo.phone}`),
          },
        ]
      );
    }
  };

  const chatWithDriver = () => {
    Alert.alert(
      "Feature Coming Soon",
      "Chat with driver will be available in the next update."
    );
  };

  const renderRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.ratingContainer}>
        {Array(fullStars)
          .fill(0)
          .map((_, i) => (
            <Ionicons key={`full-${i}`} name="star" size={14} color="#FFD700" />
          ))}
        {hasHalfStar && <Ionicons name="star-half" size={14} color="#FFD700" />}
        {Array(emptyStars)
          .fill(0)
          .map((_, i) => (
            <Ionicons
              key={`empty-${i}`}
              name="star-outline"
              size={14}
              color="#FFD700"
            />
          ))}
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  // Render the delivery progress stages
  const renderDeliveryStages = () => {
    return (
      <View style={styles.deliveryStagesContainer}>
        <View style={styles.stageProgressHeader}>
          <Text style={styles.stageProgressTitle}>Статус заказа</Text>
          <Text style={styles.stageProgressPercent}>
            {Math.round(deliveryProgress * 100)}%
          </Text>
        </View>

        <View style={styles.stageProgressLine}>
          <View
            style={[
              styles.stageProgressFill,
              { width: `${deliveryProgress * 100}%` },
            ]}
          />
        </View>

        <View style={styles.stagesRow}>
          <View style={styles.stageItem}>
            <View
              style={[
                styles.stageCircle,
                deliveryStatus === "preparing" && styles.activeStageCircle,
                (deliveryStatus === "pickup" ||
                  deliveryStatus === "onTheWay" ||
                  deliveryStatus === "arrived" ||
                  deliveryStatus === "delivered") &&
                  styles.completedStageCircle,
              ]}
            >
              <MaterialIcons
                name="restaurant"
                size={16}
                color={
                  deliveryStatus === "pickup" ||
                  deliveryStatus === "onTheWay" ||
                  deliveryStatus === "arrived" ||
                  deliveryStatus === "delivered"
                    ? "#FFFFFF"
                    : deliveryStatus === "preparing"
                    ? "#4A5D23"
                    : "#AAA"
                }
              />
            </View>
            <Text
              style={[
                styles.stageText,
                deliveryStatus === "preparing" && styles.activeStageText,
                (deliveryStatus === "pickup" ||
                  deliveryStatus === "onTheWay" ||
                  deliveryStatus === "arrived" ||
                  deliveryStatus === "delivered") &&
                  styles.completedStageText,
              ]}
            >
              Готовится
            </Text>
          </View>

          <View style={styles.stageItem}>
            <View
              style={[
                styles.stageCircle,
                deliveryStatus === "pickup" && styles.activeStageCircle,
                (deliveryStatus === "onTheWay" ||
                  deliveryStatus === "arrived" ||
                  deliveryStatus === "delivered") &&
                  styles.completedStageCircle,
              ]}
            >
              <MaterialIcons
                name="delivery-dining"
                size={16}
                color={
                  deliveryStatus === "onTheWay" ||
                  deliveryStatus === "arrived" ||
                  deliveryStatus === "delivered"
                    ? "#FFFFFF"
                    : deliveryStatus === "pickup"
                    ? "#4A5D23"
                    : "#AAA"
                }
              />
            </View>
            <Text
              style={[
                styles.stageText,
                deliveryStatus === "pickup" && styles.activeStageText,
                (deliveryStatus === "onTheWay" ||
                  deliveryStatus === "arrived" ||
                  deliveryStatus === "delivered") &&
                  styles.completedStageText,
              ]}
            >
              Забрал
            </Text>
          </View>

          <View style={styles.stageItem}>
            <View
              style={[
                styles.stageCircle,
                deliveryStatus === "onTheWay" && styles.activeStageCircle,
                (deliveryStatus === "arrived" ||
                  deliveryStatus === "delivered") &&
                  styles.completedStageCircle,
              ]}
            >
              <FontAwesome5
                name="route"
                size={14}
                color={
                  deliveryStatus === "arrived" || deliveryStatus === "delivered"
                    ? "#FFFFFF"
                    : deliveryStatus === "onTheWay"
                    ? "#4A5D23"
                    : "#AAA"
                }
              />
            </View>
            <Text
              style={[
                styles.stageText,
                deliveryStatus === "onTheWay" && styles.activeStageText,
                (deliveryStatus === "arrived" ||
                  deliveryStatus === "delivered") &&
                  styles.completedStageText,
              ]}
            >
              В пути
            </Text>
          </View>

          <View style={styles.stageItem}>
            <View
              style={[
                styles.stageCircle,
                deliveryStatus === "arrived" && styles.activeStageCircle,
                deliveryStatus === "delivered" && styles.completedStageCircle,
              ]}
            >
              <MaterialIcons
                name="location-on"
                size={16}
                color={
                  deliveryStatus === "delivered"
                    ? "#FFFFFF"
                    : deliveryStatus === "arrived"
                    ? "#4A5D23"
                    : "#AAA"
                }
              />
            </View>
            <Text
              style={[
                styles.stageText,
                deliveryStatus === "arrived" && styles.activeStageText,
                deliveryStatus === "delivered" && styles.completedStageText,
              ]}
            >
              Прибыл
            </Text>
          </View>

          <View style={styles.stageItem}>
            <View
              style={[
                styles.stageCircle,
                deliveryStatus === "delivered" && styles.completedStageCircle,
              ]}
            >
              <Ionicons
                name="checkmark"
                size={16}
                color={deliveryStatus === "delivered" ? "#FFFFFF" : "#AAA"}
              />
            </View>
            <Text
              style={[
                styles.stageText,
                deliveryStatus === "delivered" && styles.completedStageText,
              ]}
            >
              Доставлен
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Функция рассчета маршрута от ресторана к адресу пользователя
  const calculateRoute = async (start: RoutePoint, end: RoutePoint) => {
    if (!start || !end) return;
    if (start.latitude === 0 || end.latitude === 0) return;

    try {
      setRouteLoading(true);

      // В реальном приложении здесь был бы API-запрос к Google Directions API или подобному сервису
      // Для демонстрации мы создадим имитацию маршрута с промежуточными точками

      // Создаем прямую линию между начальной и конечной точками
      const steps = 10; // количество промежуточных точек
      const points: RoutePoint[] = [];

      for (let i = 0; i <= steps; i++) {
        const fraction = i / steps;
        const lat = start.latitude + (end.latitude - start.latitude) * fraction;
        const lng =
          start.longitude + (end.longitude - start.longitude) * fraction;
        points.push({ latitude: lat, longitude: lng });
      }

      // Добавляем некоторую случайность, чтобы маршрут выглядел реалистичнее
      const enhancedPoints = points.map((point, index) => {
        if (index > 0 && index < points.length - 1) {
          // Добавляем небольшое случайное отклонение
          const offset = 0.002 * (Math.random() - 0.5);
          return {
            latitude: point.latitude + offset,
            longitude: point.longitude + offset,
          };
        }
        return point;
      });

      setRoutePoints(enhancedPoints);

      // Рассчитываем приблизительное расстояние маршрута (в км)
      const distance = calculateDistance(
        start.latitude,
        start.longitude,
        end.latitude,
        end.longitude
      );
      setRouteDistance(distance);

      // Рассчитываем приблизительное время маршрута (в минутах)
      // Предполагаем среднюю скорость 20 км/ч для курьера
      const durationMinutes = Math.ceil((distance / 20) * 60);
      setRouteDuration(durationMinutes);

      // Форматируем ETA (время прибытия)
      const now = new Date();
      now.setMinutes(now.getMinutes() + durationMinutes);
      const hours = now.getHours();
      const minutes = now.getMinutes();
      setDeliveryEta(`${hours}:${minutes < 10 ? "0" + minutes : minutes}`);

      // Обновляем регион карты для отображения всего маршрута
      updateMapRegionToFitRoute(start, end);

      return enhancedPoints;
    } catch (error) {
      console.error("Ошибка при расчете маршрута:", error);
      Alert.alert("Ошибка", "Не удалось рассчитать маршрут доставки");
      return null;
    } finally {
      setRouteLoading(false);
    }
  };

  // Функция для обновления региона карты, чтобы показать весь маршрут
  const updateMapRegionToFitRoute = (start: RoutePoint, end: RoutePoint) => {
    if (!start || !end || !mapRef.current) return;

    // Рассчитываем средние координаты
    const midLat = (start.latitude + end.latitude) / 2;
    const midLng = (start.longitude + end.longitude) / 2;

    // Рассчитываем дельту для охвата обеих точек с отступом
    const latDelta = Math.abs(start.latitude - end.latitude) * 1.5;
    const lngDelta = Math.abs(start.longitude - end.longitude) * 1.5;

    // Минимальный zoom для удобства просмотра
    const minDelta = 0.02;

    mapRef.current.animateToRegion(
      {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(latDelta, minDelta),
        longitudeDelta: Math.max(lngDelta, minDelta),
      },
      1000
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4A5D23" />
        <Text style={styles.loadingText}>Loading delivery tracking...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.mapImage}
          initialRegion={{
            latitude: (fromCoords.latitude + toCoords.latitude) / 2,
            longitude: (fromCoords.longitude + toCoords.longitude) / 2,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          region={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Restaurant marker */}
          <Marker
            coordinate={fromCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Restaurant"
            description={fromAddress as string}
          >
            <View style={styles.restaurantMarker}>
              <MaterialIcons name="restaurant" size={18} color="#FFFFFF" />
            </View>
          </Marker>

          {/* User's real location marker */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              title="Your Current Location"
              description="Your real-time location"
            >
              <View style={styles.userLocationMarker}>
                <MaterialIcons
                  name="person-pin-circle"
                  size={22}
                  color="#007AFF"
                />
              </View>
            </Marker>
          )}

          {/* Delivery destination marker - показываем только если отличается от текущего местоположения пользователя 
              и если не используем реальное местоположение */}
          {toLat && toLng && params.useRealLocation !== "true" && (
            <Marker
              coordinate={toCoords}
              anchor={{ x: 0.5, y: 0.5 }}
              title="Delivery Point"
              description={toAddress as string}
            >
              <View style={styles.destinationMarker}>
                <MaterialIcons name="location-pin" size={22} color="#FF3B30" />
              </View>
            </Marker>
          )}

          {/* Driver marker */}
          <Marker
            coordinate={driverLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Driver"
            description={`${driverInfo.name} - ${driverInfo.vehicleInfo}`}
          >
            <View style={styles.driverMarker}>
              <MaterialCommunityIcons name="moped" size={18} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Рассчитанный маршрут от ресторана до точки доставки */}
          {routePoints.length > 0 && (
            <Polyline
              coordinates={routePoints}
              strokeColor="#4A5D23"
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}

          {/* Прямая линия от текущего положения курьера до пункта назначения 
              Если используем реальную геолокацию, то рисуем линию к местоположению пользователя */}
          {deliveryStatus === "onTheWay" && (
            <Polyline
              coordinates={[
                driverLocation,
                params.useRealLocation === "true"
                  ? userLocation || toCoords
                  : toCoords,
              ]}
              strokeColor="#FF9500"
              strokeWidth={3}
              lineDashPattern={[1]}
            />
          )}
        </MapView>

        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="location" size={20} color="#4A5D23" />
          <Text style={styles.searchText}>
            {(toAddress as string) || "Delivery destination"}
          </Text>
        </View>

        {userLocation && (
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={() => {
              if (mapRef.current && userLocation) {
                mapRef.current.animateToRegion(
                  {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  },
                  1000
                );
              }
            }}
          >
            <MaterialIcons name="my-location" size={22} color="#4A5D23" />
          </TouchableOpacity>
        )}
      </View>

      <Animated.View
        style={[styles.bottomSheet, { height: bottomSheetHeight }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.headerContainer}>
          <View style={styles.indicator} />
          <TouchableOpacity
            style={styles.expandCollapseButton}
            onPress={() => toggleBottomSheet()}
          >
            <Animated.View style={arrowRotateStyle}>
              <Ionicons name="chevron-up" size={24} color="#4A5D23" />
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.deliveryStatusContainer}>
            <View style={styles.deliveryStatusIconContainer}>
              <Ionicons name="time-outline" size={22} color="#4A5D23" />
            </View>
            <Text style={styles.deliveryStatusText}>
              {getDeliveryStatusText(deliveryStatus)}
              {deliveryStatus === "onTheWay" && ` (${estimatedDeliveryTime})`}
            </Text>
            {routeDistance && deliveryStatus === "onTheWay" && (
              <View style={styles.routeInfoContainer}>
                <Text style={styles.routeInfoText}>
                  {routeDistance.toFixed(1)} км
                </Text>
                {deliveryEta && (
                  <Text style={styles.etaText}>ETA: {deliveryEta}</Text>
                )}
              </View>
            )}
            {order && order.id.startsWith("offline-order") && (
              <View style={styles.offlineIndicator}>
                <Ionicons name="cloud-offline" size={16} color="#FF3B30" />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
          </View>
        </View>

        {bottomSheetExpanded && (
          <>
            {/* Delivery stages */}
            {renderDeliveryStages()}

            <View style={styles.routeContainer}>
              <View style={styles.routePointsContainer}>
                <View style={styles.routeStartPoint}>
                  <View
                    style={[styles.routeDot, { backgroundColor: "#4A5D23" }]}
                  />
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeEndPoint}>
                  <View
                    style={[styles.routeDot, { backgroundColor: "#FF3B30" }]}
                  />
                </View>
              </View>

              <View style={styles.addressContainer}>
                <Text style={styles.addressLabel}>From:</Text>
                <Text style={styles.addressText}>
                  {(fromAddress as string) || "Pickup point"}
                </Text>
                <Text style={styles.addressLabel}>To:</Text>
                <Text style={styles.addressText}>
                  {(toAddress as string) || "Delivery address"}
                </Text>
              </View>
            </View>

            <View style={styles.driverInfoContainer}>
              <View style={styles.driverDetails}>
                <View style={styles.driverImageContainer}>
                  {driverInfo.photoUrl ? (
                    <Image
                      source={{ uri: driverInfo.photoUrl }}
                      style={styles.driverImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.driverImagePlaceholder}>
                      <FontAwesome5 name="user" size={24} color="#AAA" />
                    </View>
                  )}
                </View>
                <View style={styles.driverTextInfo}>
                  <Text style={styles.driverName}>{driverInfo.name}</Text>
                  {renderRating(driverInfo.rating)}
                  <Text style={styles.vehicleInfo}>
                    {driverInfo.vehicleInfo}
                  </Text>
                  <Text style={styles.licensePlate}>
                    {driverInfo.licensePlate}
                  </Text>
                </View>
              </View>

              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={contactDriver}
                >
                  <Ionicons name="call" size={20} color="#4A5D23" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={chatWithDriver}
                >
                  <Ionicons name="chatbubble" size={20} color="#4A5D23" />
                </TouchableOpacity>
              </View>
            </View>

            {customerName && (
              <View style={styles.customerInfoContainer}>
                <Text style={styles.customerInfoTitle}>Recipient:</Text>
                <Text style={styles.customerInfoValue}>{customerName}</Text>
              </View>
            )}

            {order && (
              <View style={styles.orderInfoContainer}>
                <Text style={styles.orderInfoTitle}>Order #{order.id}</Text>
                <Text style={styles.orderInfoStatus}>
                  Status: {order.status}
                </Text>
                <Text style={styles.orderInfoDate}>
                  Placed: {new Date(order.createdAt).toLocaleString()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.contactDriverButton}
              onPress={contactDriver}
            >
              <Text style={styles.contactDriverButtonText}>Contact Driver</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchBar: {
    position: "absolute",
    top: 16,
    left: 64,
    right: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4A5D23",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  restaurantMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5E9732",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  destinationMarker: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  userLocationMarker: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  headerContainer: {
    alignItems: "center",
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  indicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },
  expandCollapseButton: {
    width: 40,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  deliveryStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    width: "100%",
  },
  deliveryStatusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5F1E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  deliveryStatusText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  deliveryStagesContainer: {
    marginVertical: 10,
    marginTop: 15,
  },
  stageProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stageProgressTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  stageProgressPercent: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4A5D23",
    marginLeft: 8,
  },
  stageProgressLine: {
    height: 4,
    backgroundColor: "#E0E0E0",
    width: "100%",
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  stageProgressFill: {
    height: "100%",
    backgroundColor: "#4A5D23",
    borderRadius: 2,
  },
  stagesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  stageItem: {
    alignItems: "center",
    width: "18%",
  },
  stageCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  activeStageCircle: {
    backgroundColor: "#E5F1E0",
    borderColor: "#4A5D23",
  },
  completedStageCircle: {
    backgroundColor: "#4A5D23",
    borderColor: "#4A5D23",
  },
  stageText: {
    fontSize: 10,
    color: "#888",
    textAlign: "center",
  },
  activeStageText: {
    color: "#4A5D23",
    fontWeight: "600",
  },
  completedStageText: {
    color: "#4A5D23",
    fontWeight: "500",
  },
  routeContainer: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 20,
  },
  routePointsContainer: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  routeStartPoint: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  routeEndPoint: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: "#CCCCCC",
  },
  addressContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  addressLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 12,
  },
  driverInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
  },
  driverDetails: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  driverImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    marginRight: 12,
  },
  driverImage: {
    width: "100%",
    height: "100%",
  },
  driverImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
  },
  driverTextInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  vehicleInfo: {
    fontSize: 12,
    color: "#444",
  },
  licensePlate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  contactButtons: {
    flexDirection: "row",
  },
  contactButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E5F1E0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  customerInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
  },
  customerInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginRight: 8,
  },
  customerInfoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  orderInfoContainer: {
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  orderInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  orderInfoStatus: {
    fontSize: 13,
    color: "#4A5D23",
    fontWeight: "500",
    marginBottom: 2,
  },
  orderInfoDate: {
    fontSize: 12,
    color: "#666",
  },
  contactDriverButton: {
    backgroundColor: "#4A5D23",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  contactDriverButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  offlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEEEE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  offlineText: {
    fontSize: 12,
    color: "#FF3B30",
    fontWeight: "500",
    marginLeft: 4,
  },
  routeInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    padding: 8,
    borderRadius: 8,
  },
  routeInfoText: {
    fontSize: 12,
    color: "#4A5D23",
    fontWeight: "500",
    marginRight: 8,
  },
  etaText: {
    fontSize: 12,
    color: "#4A5D23",
    fontWeight: "500",
  },
  myLocationButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
