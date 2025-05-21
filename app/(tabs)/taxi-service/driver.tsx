import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  SafeAreaView,
  Modal,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TaxiService } from "../../../app/services/TaxiService";
import { useAuth } from "../../../app/auth/AuthContext";
import {
  TaxiRequest,
  globalState,
  tripManager,
  saveTripState,
  forceResetTripState,
} from "../../../app/store/globalState";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DriverDashboard() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [availableTrips, setAvailableTrips] = useState<TaxiRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<TaxiRequest | null>(null);
  const [tripStatusModalVisible, setTripStatusModalVisible] = useState(false);
  const [lastEventCheck, setLastEventCheck] = useState<number>(Date.now());

  // Check if user is authenticated and is a driver
  useEffect(() => {
    if (!user || !user.role?.includes("driver")) {
      Alert.alert(
        "Unauthorized",
        "You need to be logged in as a driver to access this page.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)"),
          },
        ]
      );
    } else {
      // Load active trip or available trips
      checkActiveTrip();
    }
  }, [user]);

  // Check if there's already an active trip
  const checkActiveTrip = async () => {
    try {
      setLoading(true);
      const activeTrip = await TaxiService.getDriverActiveTrip();

      if (activeTrip) {
        console.log("Active trip found:", activeTrip);
        setActiveTrip(activeTrip);
        // Start or update trip in trip manager
        if (!globalState.activeTaxiTrip) {
          tripManager.startTrip({
            driverId: user?.id?.toString() || "",
            driverName: user?.name || "Driver",
            origin: activeTrip.pickup.name,
            destination: activeTrip.destination.name,
            fare: activeTrip.fare,
            duration: 120,
          });
        }
      } else {
        // No active trip, load available trips
        loadAvailableTrips();
      }
    } catch (error) {
      console.error("Error checking active trip:", error);
      loadAvailableTrips();
    } finally {
      setLoading(false);
    }
  };

  // Load available trips
  const loadAvailableTrips = async () => {
    try {
      const trips = await TaxiService.getPendingTrips();
      console.log("Available trips:", trips.length);
      setAvailableTrips(trips);
    } catch (error) {
      console.error("Error loading available trips:", error);
      setAvailableTrips([]);
      Alert.alert("Error", "Failed to load available trips.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    if (activeTrip) {
      checkActiveTrip();
    } else {
      loadAvailableTrips();
    }
  };

  // Accept a trip
  const handleAcceptTrip = (trip: TaxiRequest) => {
    Alert.alert(
      "Принять заказ",
      `Вы хотите принять поездку от ${trip.pickup.name} до ${trip.destination.name}?`,
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Принять",
          onPress: async () => {
            console.log(`Driver ${user?.name} accepting trip ${trip.id}`);
            setLoading(true);

            // Создаем объект с информацией о водителе
            const driverInfo = {
              id: user?.id?.toString() || "unknown",
              name: user?.name || "Driver",
              photo: user?.avatar,
              car: "Toyota Camry", // Стоит добавить это поле в User интерфейс
              licensePlate: "A 123 BC", // Стоит добавить это поле в User интерфейс
              rating: 4.5, // Стоит добавить это поле в User интерфейс
            };

            // Принимаем заказ с обновленным acceptTrip, который принимает объект с информацией о водителе
            const acceptedTrip = await TaxiService.acceptTrip(
              trip.id,
              driverInfo
            );

            setLoading(false);

            if (acceptedTrip) {
              // Сохраняем информацию о принятом заказе
              await AsyncStorage.setItem(
                `driver_${driverInfo.id}_activeTrip`,
                JSON.stringify(acceptedTrip)
              );

              // Запускаем поездку в глобальном состоянии и сохраняем ее состояние
              tripManager.startTrip({
                driverId: driverInfo.id,
                driverName: driverInfo.name,
                origin: acceptedTrip.pickup.name,
                destination: acceptedTrip.destination.name,
                fare: acceptedTrip.fare,
                duration: 120, // примерное время в минутах
              });

              // Сохраняем состояние поездки
              saveTripState();

              // Обновляем список активных поездок для экрана водителя
              await checkActiveTrip();

              Alert.alert("Поездка принята", "Вы успешно приняли заказ.");
            } else {
              Alert.alert(
                "Ошибка",
                "Не удалось принять заказ. Пожалуйста, попробуйте снова."
              );
            }
          },
        },
      ]
    );
  };

  // Update trip status
  const updateTripStatus = async (
    status: "on_the_way" | "completed" | "cancelled"
  ) => {
    if (!activeTrip) return;

    try {
      setLoading(true);
      const result = await TaxiService.updateTripStatus(activeTrip.id, status);

      if (result) {
        if (status === "completed" || status === "cancelled") {
          // Trip is done, clear active trip and load available trips
          setActiveTrip(null);

          // Если поездка отменена или завершена, выполняем полный сброс состояния
          if (user && user.id) {
            console.log(
              "Forcing state reset after trip completion/cancellation"
            );
            await forceResetTripState(user.id.toString());
          }

          loadAvailableTrips();
          Alert.alert("Success", `Trip ${status.toLowerCase()}.`);
        } else {
          // Update active trip status
          setActiveTrip({
            ...activeTrip,
            status: status === "on_the_way" ? "accepted" : status,
          });
          Alert.alert("Success", "Trip status updated successfully.");
        }
      } else {
        Alert.alert("Error", "Failed to update trip status.");
      }
    } catch (error) {
      console.error("Error updating trip status:", error);
      Alert.alert("Error", "Failed to update trip status. Please try again.");
    } finally {
      setLoading(false);
      setTripStatusModalVisible(false);
    }
  };

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
          if (
            event.type === "trip_accepted" &&
            event.driverId === user.id.toString()
          ) {
            // Я принял заказ как водитель
            console.log(`I accepted trip ${event.tripId}`);
            // Обновляем активный трип
            checkActiveTrip();
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

              // Если у нас был активный трип и его ID совпадает с обновленным
              if (activeTrip && activeTrip.id === event.tripId) {
                // Очищаем активный трип
                setActiveTrip(null);
                // Загружаем доступные поездки
                loadAvailableTrips();
                Alert.alert(
                  "Trip Status",
                  `Trip has been ${event.type.replace("trip_", "")}`,
                  [{ text: "OK" }]
                );
              }
            }
          } else if (event.type.startsWith("trip_")) {
            // Обновление статуса поездки
            const newStatus = event.type.replace("trip_", "");

            // Если это наша активная поездка как водителя
            if (
              activeTrip &&
              activeTrip.id === event.tripId &&
              event.driverId === user.id.toString()
            ) {
              console.log(`Updating active trip status to ${newStatus}`);

              // Обновляем статус активной поездки
              setActiveTrip({
                ...activeTrip,
                status:
                  newStatus === "on_the_way" || newStatus === "arrived"
                    ? "accepted"
                    : newStatus,
              });
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
  }, [user, lastEventCheck, activeTrip]);

  // Render trip item
  const renderTripItem = ({ item }: { item: TaxiRequest }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.fareText}>{item.fare} ₸</Text>
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate-outline" size={14} color="#4A5D23" />
          <Text style={styles.distanceText}>
            {item.distance_km ? `${item.distance_km} km` : "Unknown distance"}
          </Text>
        </View>
      </View>

      <View style={styles.locationContainer}>
        <View style={styles.locationIconContainer}>
          <View style={styles.pickupDot} />
          <View style={styles.locationConnector} />
          <View style={styles.destinationDot} />
        </View>
        <View style={styles.locationDetails}>
          <Text style={styles.locationLabel}>From</Text>
          <Text style={styles.locationText}>{item.pickup.name}</Text>
          <View style={styles.divider} />
          <Text style={styles.locationLabel}>To</Text>
          <Text style={styles.locationText}>{item.destination.name}</Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Ionicons name="person-circle-outline" size={20} color="#666" />
        <Text style={styles.customerName}>{item.customer.name}</Text>
      </View>

      <TouchableOpacity
        style={styles.acceptButton}
        onPress={() => handleAcceptTrip(item)}
      >
        <Text style={styles.acceptButtonText}>Accept Trip</Text>
      </TouchableOpacity>
    </View>
  );

  // Render active trip
  const renderActiveTrip = () => {
    if (!activeTrip) return null;

    return (
      <View style={styles.activeTripContainer}>
        <View style={styles.activeTripHeader}>
          <Text style={styles.activeTripTitle}>Current Trip</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(activeTrip.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(activeTrip.status)}
            </Text>
          </View>
        </View>

        <View style={styles.activeTripCard}>
          <View style={styles.fareDetails}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fareAmount}>{activeTrip.fare} ₸</Text>
          </View>

          <View style={styles.locationContainer}>
            <View style={styles.locationIconContainer}>
              <View style={styles.pickupDot} />
              <View style={styles.locationConnector} />
              <View style={styles.destinationDot} />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>From</Text>
              <Text style={styles.locationText}>{activeTrip.pickup.name}</Text>
              <View style={styles.divider} />
              <Text style={styles.locationLabel}>To</Text>
              <Text style={styles.locationText}>
                {activeTrip.destination.name}
              </Text>
            </View>
          </View>

          <View style={styles.customerInfo}>
            <Ionicons name="person-circle-outline" size={20} color="#666" />
            <Text style={styles.customerName}>{activeTrip.customer.name}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.updateStatusButton}
          onPress={() => setTripStatusModalVisible(true)}
        >
          <Text style={styles.updateStatusButtonText}>Update Status</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Helper functions for status colors and text
  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
      case "on_the_way":
        return "#2196F3"; // Blue
      case "completed":
        return "#4CAF50"; // Green
      case "cancelled":
        return "#F44336"; // Red
      case "pending":
      default:
        return "#FF9800"; // Orange
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "accepted":
        return "Accepted";
      case "on_the_way":
        return "On the way";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "pending":
      default:
        return "Pending";
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A5D23" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {activeTrip ? (
        <View style={styles.content}>{renderActiveTrip()}</View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Available Trips</Text>
          {availableTrips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="map-marker-path"
                size={80}
                color="#E0E0E0"
              />
              <Text style={styles.emptyText}>No available trips</Text>
              <Text style={styles.emptySubtext}>
                Pull down to refresh or check back later
              </Text>

              <TouchableOpacity
                style={styles.returnToPassengerButton}
                onPress={() => router.push("/(tabs)/taxi-service/taxi")}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="white"
                  style={styles.buttonIcon}
                />
                <Text style={styles.returnButtonText}>
                  Return to Passenger Mode
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={availableTrips}
              keyExtractor={(item) => item.id}
              renderItem={renderTripItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#4A5D23"]}
                  tintColor="#4A5D23"
                />
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.returnToPassengerButton}
                  onPress={() => router.push("/(tabs)/taxi-service/taxi")}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="white"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.returnButtonText}>
                    Return to Passenger Mode
                  </Text>
                </TouchableOpacity>
              }
            />
          )}
        </View>
      )}

      {/* Trip Status Modal */}
      <Modal
        visible={tripStatusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTripStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Trip Status</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => updateTripStatus("on_the_way")}
            >
              <Text style={styles.modalOptionText}>On The Way</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => updateTripStatus("completed")}
            >
              <Text style={styles.modalOptionText}>Complete Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => updateTripStatus("cancelled")}
            >
              <Text style={[styles.modalOptionText, styles.cancelText]}>
                Cancel Trip
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setTripStatusModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 0 : 40,
    paddingBottom: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#555",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    maxWidth: "80%",
  },
  listContent: {
    paddingBottom: 20,
  },
  tripCard: {
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
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  fareText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8EA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  distanceText: {
    fontSize: 12,
    color: "#4A5D23",
    marginLeft: 4,
    fontWeight: "500",
  },
  locationContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  locationIconContainer: {
    width: 16,
    alignItems: "center",
    marginRight: 12,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  locationConnector: {
    width: 2,
    height: 30,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
  },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F44336",
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 8,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  customerName: {
    marginLeft: 8,
    fontSize: 14,
    color: "#555",
  },
  acceptButton: {
    backgroundColor: "#4A5D23",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  activeTripContainer: {
    flex: 1,
  },
  activeTripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  activeTripTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  activeTripCard: {
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
  fareDetails: {
    marginBottom: 16,
  },
  fareLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  updateStatusButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  updateStatusButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
  },
  cancelOption: {
    borderBottomWidth: 0,
  },
  cancelText: {
    color: "#F44336",
  },
  closeButton: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
  },
  closeButtonText: {
    textAlign: "center",
    color: "#333",
    fontWeight: "500",
  },
  returnToPassengerButton: {
    backgroundColor: "#444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  returnButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
});
