import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { TaxiService } from "../../services/TaxiService";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { formatRelative } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import * as Localization from "expo-localization";

interface Trip {
  id: number;
  user_id: number;
  driver_id: number | null;
  tariff_id: number;
  from_address: string;
  to_address: string;
  distance_km: string;
  price: string;
  status: string;
  created_at: string;
  updated_at: string;
  tariff: {
    id: number;
    name: string;
    base_rate: string;
    price_per_km: string;
  };
  client: {
    id: number;
    name: string;
    avatar: string;
  };
  driver: {
    id: number;
    name: string;
    avatar: string;
  } | null;
  review: any | null;
}

export default function OrderHistoryScreen() {
  const { t, i18n } = useTranslation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determine the date-fns locale based on the app's language
  const dateLocale = i18n.language?.startsWith("ru") ? ru : enUS;

  useEffect(() => {
    loadTripHistory();
  }, []);

  const loadTripHistory = async () => {
    try {
      setLoading(true);
      console.log("Fetching trip history...");
      const tripHistory = await TaxiService.getTripHistory();

      console.log(
        `Trip history received: ${tripHistory ? tripHistory.length : 0} trips`
      );

      if (Array.isArray(tripHistory)) {
        setTrips(tripHistory);
      } else {
        console.error("Invalid trip history format:", tripHistory);
        setTrips([]);
      }
    } catch (error) {
      console.error("Error loading trip history:", error);
      setTrips([]);
      // You could show an error message to the user here
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTripHistory();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#4CAF50"; // Green
      case "on_the_way":
      case "accepted":
        return "#2196F3"; // Blue
      case "pending":
        return "#FF9800"; // Orange
      case "cancelled":
        return "#F44336"; // Red
      default:
        return "#757575"; // Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("taxi.history.completed");
      case "on_the_way":
        return t("taxi.history.onTheWay");
      case "accepted":
        return t("taxi.history.accepted");
      case "pending":
        return t("taxi.history.pending");
      case "cancelled":
        return t("taxi.history.cancelled");
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    try {
      return formatRelative(date, new Date(), { locale: dateLocale });
    } catch (error) {
      // Fallback in case of formatting errors
      return date.toLocaleDateString();
    }
  };

  const renderTripItem = ({ item }: { item: Trip }) => {
    // Check if the trip has all required fields to render properly
    if (!item || !item.id) {
      console.error("Invalid trip data:", item);
      return (
        <View style={styles.tripCard}>
          <Text style={styles.errorText}>Invalid trip data</Text>
        </View>
      );
    }

    return (
      <View style={styles.tripCard}>
        {/* Trip header with status */}
        <View style={styles.tripHeader}>
          <View style={styles.tripInfo}>
            <Text style={styles.tripId}>#{item.id}</Text>
            <Text style={styles.tripDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {/* Trip details */}
        <View style={styles.tripRouteContainer}>
          <View style={styles.routeIconContainer}>
            <View style={styles.pickupDot} />
            <View style={styles.routeLine} />
            <View style={styles.destinationDot} />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={styles.addressText}>{item.from_address}</Text>
            <Text style={styles.addressText}>{item.to_address}</Text>
          </View>
        </View>

        {/* Trip tariff and price */}
        <View style={styles.tripDetailsContainer}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t("taxi.history.tariff")}</Text>
            <Text style={styles.detailValue}>{item.tariff?.name || "-"}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t("taxi.history.distance")}</Text>
            <Text style={styles.detailValue}>{item.distance_km} km</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t("taxi.history.price")}</Text>
            <Text style={styles.detailValue}>{item.price} ₸</Text>
          </View>
        </View>

        {/* Driver info if available */}
        {item.driver && (
          <View style={styles.driverContainer}>
            <Image
              source={{
                uri: item.driver.avatar?.startsWith("http")
                  ? item.driver.avatar
                  : `http://192.168.0.104:8000${item.driver.avatar}`,
              }}
              style={styles.driverAvatar}
              defaultSource={require("@/assets/images/driver-placeholder.jpg")}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{item.driver.name}</Text>
              <Text style={styles.driverRole}>{t("taxi.history.driver")}</Text>
            </View>
          </View>
        )}

        {/* Review button or review status */}
        {item.status === "completed" && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => {
              // Here you would navigate to a review screen
              // router.push(`/trip-review/${item.id}`);
              alert(t("taxi.history.reviewFeatureComingSoon"));
            }}
          >
            <Text style={styles.reviewButtonText}>
              {item.review
                ? t("taxi.history.reviewSubmitted")
                : t("taxi.history.leaveReview")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A5D23" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("taxi.history.title")}</Text>
        <View style={styles.placeholder} />
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="history" size={80} color="#CCCCCC" />
          <Text style={styles.emptyText}>{t("taxi.history.noTrips")}</Text>
          <TouchableOpacity
            style={styles.orderButton}
            onPress={() => router.push("/(tabs)/taxi-service/taxi")}
          >
            <Text style={styles.orderButtonText}>
              {t("taxi.history.orderNow")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTripItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4A5D23"]}
              tintColor="#4A5D23"
            />
          }
        />
      )}
    </View>
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
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: "white",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
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
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  orderButton: {
    backgroundColor: "#4A5D23",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  orderButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tripCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tripInfo: {
    flex: 1,
  },
  tripId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  tripRouteContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  routeIconContainer: {
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
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: "#CCCCCC",
    marginVertical: 4,
  },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F44336",
  },
  routeTextContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 10,
  },
  tripDetailsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
    paddingVertical: 12,
    marginBottom: 16,
  },
  detailItem: {
    width: "33%",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  driverContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#F0F0F0",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  driverRole: {
    fontSize: 12,
    color: "#888",
  },
  reviewButton: {
    paddingVertical: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    alignItems: "center",
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
    textAlign: "center",
    padding: 10,
  },
});
