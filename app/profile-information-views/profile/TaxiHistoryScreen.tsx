import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TaxiService } from "../../services/TaxiService";
import { useAuth } from "../../auth/AuthContext";

// Интерфейс для истории поездок такси
interface TaxiTrip {
  id: string;
  from_address: string;
  to_address: string;
  status: string;
  price: number | string;
  distance_km: number | string;
  created_at: string;
  driver_name?: string;
}

export default function TaxiHistoryScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTaxiHistory();
  }, []);

  const loadTaxiHistory = async () => {
    setIsLoading(true);
    try {
      // Обновим токен для сервиса такси
      await TaxiService.updateTaxiToken();

      // Загрузим историю поездок
      const tripHistory = await TaxiService.getTripHistory();

      // Фильтруем историю только для текущего пользователя
      if (user && user.id) {
        const userTrips = tripHistory.filter(
          (trip) => String(trip.user_id) === String(user.id)
        );
        console.log(
          `Отфильтровано ${userTrips.length} поездок для пользователя ID: ${user.id}`
        );
        setTrips(userTrips);
      } else {
        console.log("Пользователь не аутентифицирован, показываем всю историю");
        setTrips(tripHistory);
      }
    } catch (error) {
      console.error("Error loading taxi history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
        return "#4CAF50"; // Green
      case "pending":
        return "#FFA000"; // Orange
      case "cancelled":
        return "#F44336"; // Red
      default:
        return "#757575"; // Grey
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
        return t("taxiHistoryScreen.completed");
      case "pending":
        return t("taxiHistoryScreen.pending");
      case "cancelled":
        return t("taxiHistoryScreen.cancelled");
      default:
        return status;
    }
  };

  const renderTripItem = ({ item }: { item: TaxiTrip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripId}>#{item.id}</Text>
        <View
          style={[
            styles.statusContainer,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.tripRouteContainer}>
        <View style={styles.routeDetails}>
          <View style={styles.addressRow}>
            <View style={styles.dotContainer}>
              <View style={styles.greenDot} />
              <View style={styles.verticalLine} />
            </View>
            <Text style={styles.addressText} numberOfLines={1}>
              {item.from_address}
            </Text>
          </View>

          <View style={styles.addressRow}>
            <View style={styles.dotContainer}>
              <View style={styles.redDot} />
            </View>
            <Text style={styles.addressText} numberOfLines={1}>
              {item.to_address}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        <View style={styles.tripStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="attach-money" size={16} color="#4A5D23" />
            <Text style={styles.statText}>{item.price} ₸</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="directions-car" size={16} color="#4A5D23" />
            <Text style={styles.statText}>
              {item.distance_km
                ? parseFloat(String(item.distance_km)).toFixed(1)
                : 0}{" "}
              km
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require("../../../assets/images/taxi-service.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>{t("taxiHistoryScreen.noTrips")}</Text>
      <Text style={styles.emptyText}>
        {t("taxiHistoryScreen.noTripsDescription")}
      </Text>
      <TouchableOpacity
        style={styles.orderButton}
        onPress={() => router.push("/(tabs)/taxi-service/taxi")}
      >
        <Text style={styles.orderButtonText}>
          {t("taxiHistoryScreen.orderTaxi")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("taxiHistoryScreen.title")}</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5D23" />
          <Text style={styles.loadingText}>
            {t("taxiHistoryScreen.loading")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTripItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
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
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tripId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  statusContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  tripRouteContainer: {
    marginBottom: 12,
  },
  routeDetails: {
    paddingLeft: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  dotContainer: {
    width: 20,
    alignItems: "center",
    marginRight: 8,
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F44336",
  },
  verticalLine: {
    width: 2,
    height: 20,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  tripStats: {
    flexDirection: "row",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginTop: 40,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  orderButton: {
    backgroundColor: "#4A5D23",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  orderButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
