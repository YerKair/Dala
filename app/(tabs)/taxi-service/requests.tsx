import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { tripManager } from "../../store/globalState";

// Define ride request interface
interface RideRequest {
  id: string;
  client: string;
  pickup: string;
  destination: string;
  distance: number;
  fare: number;
  timestamp: number;
}

// Demo ride requests
const DEMO_REQUESTS: RideRequest[] = [
  {
    id: "req1",
    client: "Alexandra Kim",
    pickup: "Abay Ave 68",
    destination: "Tole Bi St 155",
    distance: 3.2,
    fare: 1200,
    timestamp: new Date().getTime() - 1000 * 60 * 2, // 2 minutes ago
  },
  {
    id: "req2",
    client: "Bolat Ermekov",
    pickup: "Rozybakiev St 247",
    destination: "Khan Shatyr, Astana",
    distance: 4.5,
    fare: 1800,
    timestamp: new Date().getTime() - 1000 * 60 * 5, // 5 minutes ago
  },
  {
    id: "req3",
    client: "Dana Muratova",
    pickup: "Mega Center Alma-Ata",
    destination: "Almaty Airport",
    distance: 12.8,
    fare: 3500,
    timestamp: new Date().getTime() - 1000 * 60 * 8, // 8 minutes ago
  },
];

// Request item component props
interface RequestItemProps {
  request: RideRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

// Request item component
const RequestItem: React.FC<RequestItemProps> = ({
  request,
  onAccept,
  onDecline,
}) => {
  // Format time ago
  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  };

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.clientName}>{request.client}</Text>
        <Text style={styles.timeAgo}>{formatTimeAgo(request.timestamp)}</Text>
      </View>

      <View style={styles.locations}>
        <View style={styles.locationRow}>
          <View style={styles.pickupDot} />
          <Text style={styles.locationText}>{request.pickup}</Text>
        </View>
        <View style={styles.locationLine} />
        <View style={styles.locationRow}>
          <View style={styles.destinationDot} />
          <Text style={styles.locationText}>{request.destination}</Text>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.detailItem}>
          <MaterialIcons name="route" size={16} color="#555" />
          <Text style={styles.detailText}>{request.distance} km</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="payments" size={16} color="#555" />
          <Text style={styles.detailText}>{request.fare} ₸</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => onDecline(request.id)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => onAccept(request.id)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function TaxiRequestsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [activeMode, setActiveMode] = useState(true); // true=online, false=offline

  // Load requests on mount
  useEffect(() => {
    loadRequests();
  }, []);

  // Mock function to load requests
  const loadRequests = () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setRequests(DEMO_REQUESTS);
      setLoading(false);
      setRefreshing(false);
    }, 1500);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  // Handle accept request
  const handleAcceptRequest = (requestId: string) => {
    const request = requests.find((req) => req.id === requestId);

    if (request) {
      Alert.alert(
        "Accept Ride Request",
        `Are you sure you want to accept the ride request from ${request.client}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Accept",
            onPress: () => {
              // Start trip via global trip manager
              tripManager.startTrip({
                driverId: user ? user.id.toString() : "1",
                driverName: user ? user.name : "Driver",
                origin: request.pickup,
                destination: request.destination,
                fare: request.fare,
                duration: 120, // 2 minutes arrival time
              });

              // Remove the request from the list
              setRequests(requests.filter((req) => req.id !== requestId));

              // Navigate to trip screen
              router.push("/(tabs)/taxi-service/trip");
            },
          },
        ]
      );
    }
  };

  // Handle decline request
  const handleDeclineRequest = (requestId: string) => {
    Alert.alert(
      "Decline Request",
      "Are you sure you want to decline this ride request?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Decline",
          onPress: () => {
            // Remove the request from the list
            setRequests(requests.filter((req) => req.id !== requestId));
          },
        },
      ]
    );
  };

  // Toggle active mode
  const toggleActiveMode = () => {
    if (!activeMode) {
      // Going online
      setActiveMode(true);
      loadRequests(); // Reload requests when going online
    } else {
      // Going offline
      Alert.alert(
        "Go Offline",
        "Are you sure you want to stop receiving ride requests?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Go Offline",
            onPress: () => {
              setActiveMode(false);
              setRequests([]); // Clear requests when going offline
            },
          },
        ]
      );
    }
  };

  // Handle back button press
  const handleBackPress = () => {
    router.push("/profile-information-views/WorkInDamuScreen");
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Requests</Text>
        <TouchableOpacity
          style={[
            styles.activeToggle,
            activeMode ? styles.activeToggleOn : styles.activeToggleOff,
          ]}
          onPress={toggleActiveMode}
        >
          <Text style={activeMode ? styles.activeTextOn : styles.activeTextOff}>
            {activeMode ? "Online" : "Offline"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {!activeMode ? (
        <View style={styles.offlineContainer}>
          <Image
            source={require("../../../assets/images/driver-offline.jpg")}
            style={styles.offlineImage}
            defaultSource={require("../../../assets/images/driver-offline.jpg")}
          />
          <Text style={styles.offlineTitle}>You're Offline</Text>
          <Text style={styles.offlineSubtitle}>
            Go online to start receiving ride requests
          </Text>
          <TouchableOpacity
            style={styles.goOnlineButton}
            onPress={toggleActiveMode}
          >
            <Text style={styles.goOnlineButtonText}>Go Online</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require("../../../assets/images/no-request.jpeg")}
            style={styles.emptyImage}
            defaultSource={require("../../../assets/images/no-request.jpeg")}
          />
          <Text style={styles.emptyTitle}>No Requests Yet</Text>
          <Text style={styles.emptySubtitle}>
            New ride requests will appear here
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={({ item }) => (
            <RequestItem
              request={item}
              onAccept={handleAcceptRequest}
              onDecline={handleDeclineRequest}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  activeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  activeToggleOn: {
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
  },
  activeToggleOff: {
    backgroundColor: "#FFEBEE",
    borderColor: "#F44336",
  },
  activeTextOn: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  activeTextOff: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F44336",
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  timeAgo: {
    fontSize: 14,
    color: "#999",
  },
  locations: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    marginRight: 8,
  },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F44336",
    marginRight: 8,
  },
  locationLine: {
    width: 1,
    height: 16,
    backgroundColor: "#E0E0E0",
    marginLeft: 5,
  },
  locationText: {
    fontSize: 14,
    color: "#555",
    flex: 1,
  },
  tripDetails: {
    flexDirection: "row",
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  detailText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  declineButton: {
    backgroundColor: "#F5F5F5",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  declineButtonText: {
    color: "#555",
    fontWeight: "600",
  },
  acceptButtonText: {
    color: "white",
    fontWeight: "600",
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
    padding: 32,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  offlineImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  offlineSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  goOnlineButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goOnlineButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
