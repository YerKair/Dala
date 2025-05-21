import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";

// Back Icon
const BackIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth={2}
  >
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

// Credit Card Icon
const CreditCardIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000"
    strokeWidth={1.5}
  >
    <Rect x="2" y="5" width="20" height="14" rx="2" />
    <Path d="M2 10h20" />
  </Svg>
);

// Visa Card Icon
const VisaIcon = () => (
  <Svg width={40} height={24} viewBox="0 0 40 24" fill="none">
    <Rect x="0" y="0" width="40" height="24" rx="4" fill="#1A1F71" />
    <Path d="M15 17H12L9.5 7H12.5L15 17Z" fill="#FFFFFF" />
    <Path
      d="M23 7C22 7 20.5 7.5 20.5 9C20.5 11.5 24 11.5 24 13.5C24 14.5 23 15 22 15C21 15 20 14.5 19 14L18.5 16C19.5 16.5 20.5 17 22 17C24 17 26 15.5 26 13.5C26 11 22.5 10.5 22.5 9C22.5 8.5 23 8 24 8C24.5 8 25.5 8.5 26 9L27 7C26 7 24.5 7 23 7Z"
      fill="#FFFFFF"
    />
    <Path d="M30 17L27 7H29C30 7 30.5 7.5 30.5 8L33 17H30Z" fill="#FFFFFF" />
    <Path d="M6 7L3 14L2.5 12.5C2 11 1 9.5 0 9L3 17H6L11 7H6Z" fill="#FFFFFF" />
  </Svg>
);

// MasterCard Icon
const MasterCardIcon = () => (
  <Svg width={40} height={24} viewBox="0 0 40 24" fill="none">
    <Rect x="0" y="0" width="40" height="24" rx="4" fill="#F7F7F7" />
    <Circle cx="15" cy="12" r="8" fill="#EB001B" />
    <Circle cx="25" cy="12" r="8" fill="#F79E1B" />
    <Path
      d="M20 6.5C22.5 8.5 24 10 24 12C24 14 22.5 15.5 20 17.5C17.5 15.5 16 14 16 12C16 10 17.5 8.5 20 6.5Z"
      fill="#FF5F00"
    />
  </Svg>
);

// Add Icon
const PlusIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFFFFF"
    strokeWidth={2}
  >
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

// Delete Icon
const TrashIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FF5555"
    strokeWidth={1.5}
  >
    <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <Path d="M10 11v6M14 11v6" />
  </Svg>
);

// Default Card Icon
const StarIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="#FFD700"
    stroke="#FFD700"
    strokeWidth={1.5}
  >
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

// Define payment method type
interface PaymentMethod {
  id: number;
  card_number: string;
  cardholder_name: string;
  expiration_date: string;
  cvv: string;
  type: "visa" | "mastercard";
  is_default: boolean;
}

export default function PaymentMethodsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Handle back button press
  const handleBackPress = () => {
    router.push("/profile-information-views/profile-information");
  };

  // Handle add new payment method
  const handleAddPaymentMethod = () => {
    router.push("/profile-information-views/payment/AddPaymentMethodScreen");
  };

  // Fetch payment methods - вынесено за пределы useEffect
  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      // Получаем токен из правильного ключа в AsyncStorage
      let token = await AsyncStorage.getItem("token");

      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        throw new Error("Токен авторизации не найден");
      }

      console.log("Using token for fetch:", token);

      const response = await fetch(
        "http://192.168.0.104:8000/api/credit-cards",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      console.log("Fetch response status:", response.status);

      const responseText = await response.text();
      console.log("Fetch response body:", responseText);

      if (!response.ok) {
        let errorMessage = "Failed to fetch payment methods";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.log("Response is not JSON");
        throw new Error("Invalid response format");
      }

      console.log("Fetched data:", data);

      // Transform API response to match our component's expected format
      const formattedPaymentMethods = data.map((card: any) => ({
        id: card.id,
        card_number: card.card_number,
        cardholder_name: card.cardholder_name,
        expiration_date: card.expiration_date,
        cvv: card.cvv,
        type: card.card_number.startsWith("4") ? "visa" : "mastercard", // Simple logic for card type
        is_default: card.is_default || false,
      }));

      setPaymentMethods(formattedPaymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      Alert.alert(
        "Error",
        "Could not fetch payment methods: " + (error as Error).message
      );
    } finally {
      setLoading(false);
    }
  };

  // Используем useEffect для вызова функции при монтировании компонента
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  // Функция для удаления карты
  const handleDeleteCard = async (cardId: number) => {
    // Show confirmation dialog
    Alert.alert(t("deleteCard"), t("deleteCardConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

            // Получаем токен из AsyncStorage
            let token = await AsyncStorage.getItem("token");

            if (!token) {
              token = await AsyncStorage.getItem("userToken");
            }

            if (!token) {
              throw new Error("Токен авторизации не найден");
            }

            console.log(`Deleting card with ID: ${cardId}`);

            // Отправляем DELETE-запрос к API
            const response = await fetch(
              `http://192.168.0.104:8000/api/credit-cards/${cardId}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                },
              }
            );

            console.log("Delete response status:", response.status);

            if (!response.ok) {
              const responseText = await response.text();
              console.log("Delete response body:", responseText);

              let errorMessage = "Failed to delete card";
              try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorMessage;
              } catch (e) {
                errorMessage = responseText || errorMessage;
              }
              throw new Error(errorMessage);
            }

            console.log("Card deleted successfully");
            Alert.alert(t("success"), t("cardDeletedSuccessfully"));

            // Обновление списка карт после удаления
            fetchPaymentMethods();
          } catch (error) {
            console.error("Error deleting card:", error);
            Alert.alert(t("error"), t("failedToDeleteCard"));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Handle setting a card as default
  const handleSetDefault = async (id: number) => {
    try {
      let token = await AsyncStorage.getItem("token");

      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        throw new Error("Токен авторизации не найден");
      }

      const response = await fetch(
        `http://192.168.0.104
        /api/credit-cards/${id}/set-default`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      console.log("Set default response status:", response.status);

      const responseText = await response.text();
      console.log("Set default response body:", responseText);

      if (!response.ok) {
        let errorMessage = "Failed to set default payment method";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Update state locally
      setPaymentMethods((prevMethods) =>
        prevMethods.map((method) => ({
          ...method,
          is_default: method.id === id,
        }))
      );

      Alert.alert(t("success"), t("cardSetAsDefault"));
    } catch (error) {
      console.error("Error setting default payment method:", error);
      Alert.alert(t("error"), t("failedToSetDefaultCard"));
    }
  };

  // Format card number to display only last 4 digits
  const formatCardNumber = (number: string) => {
    return `•••• •••• •••• ${number.slice(-4)}`;
  };

  // Render each payment method
  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.type === "visa" ? <VisaIcon /> : <MasterCardIcon />}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteCard(item.id)}
        >
          <TrashIcon />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardNumber}>
        {formatCardNumber(item.card_number)}
      </Text>
      <Text style={styles.cardholderName}>{item.cardholder_name}</Text>
      <Text style={styles.expiryDate}>
        {t("expiresOn")} {item.expiration_date}
      </Text>
      {item.is_default ? (
        <View style={styles.defaultBadge}>
          <StarIcon />
          <Text style={styles.defaultText}>{t("default")}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.setDefaultButton}
          onPress={() => handleSetDefault(item.id)}
        >
          <Text style={styles.setDefaultText}>{t("setAsDefault")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("paymentMethods")}</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>{t("loadingPaymentMethods")}</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <FlatList
            data={paymentMethods}
            renderItem={renderPaymentMethod}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <CreditCardIcon />
                <Text style={styles.emptyText}>
                  {t("noPaymentMethodsAdded")}
                </Text>
                <Text style={styles.emptySubText}>
                  {t("addCardToPayForTrips")}
                </Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddPaymentMethod}
          >
            <PlusIcon />
            <Text style={styles.addButtonText}>{t("addPaymentMethod")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  },
  testButton: {
    backgroundColor: "#FF5252",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: "center",
  },
  testButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  cardholderName: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  expiryDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFDE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 12,
    color: "#FF8F00",
    fontWeight: "500",
    marginLeft: 4,
  },
  setDefaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#E3F2FD",
    marginRight: 8,
  },
  setDefaultText: {
    fontSize: 12,
    color: "#1976D2",
    fontWeight: "500",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
});
