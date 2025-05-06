import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Иконка назад
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

// Иконка магазина
const StoreIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#666"
    strokeWidth={1.5}
  >
    <Path d="M3 3h18v7H3z" />
    <Path d="M3 14h18v7H3z" />
    <Path d="M4 10h1v4H4z" />
    <Path d="M19 10h1v4h-1z" />
    <Path d="M8 10h8v4H8z" />
  </Svg>
);

// Иконка адреса
const LocationIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#666"
    strokeWidth={1.5}
  >
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <Path d="M12 13a3 3 0 100-6 3 3 0 000 6z" />
  </Svg>
);

// Иконка оплаты
const PaymentIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#666"
    strokeWidth={1.5}
  >
    <Path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
    <Path d="M1 10h22" />
  </Svg>
);

// Интерфейс для заказа
interface Order {
  id: string;
  date: string;
  storeName: string;
  items: {
    name: string;
    quantity: number;
    price: string;
  }[];
  total: string;
  status: "completed" | "cancelled" | "active";
  address: string;
  paymentMethod: string;
}

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams();
  const { orderId } = params;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем детали заказа при монтировании компонента
    loadOrderDetails();
  }, [orderId]);

  // Загрузка деталей заказа
  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      // Пытаемся получить историю заказов из AsyncStorage
      const storedOrders = await AsyncStorage.getItem("orderHistory");

      if (storedOrders) {
        const orders: Order[] = JSON.parse(storedOrders);
        // Ищем конкретный заказ по ID
        const foundOrder = orders.find((o) => o.id === orderId);

        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          console.error("Order not found:", orderId);
        }
      } else {
        console.error("No orders found in storage");
      }
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик для возврата назад
  const handleBackPress = () => {
    router.back();
  };

  // Получаем цвет статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#4A5D23";
      case "cancelled":
        return "#E53935";
      case "active":
        return "#2196F3";
      default:
        return "#000000";
    }
  };

  // Форматируем статус для отображения
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      case "active":
        return "In Progress";
      default:
        return "";
    }
  };

  // Рассчитываем общую стоимость заказа (без учета доставки и т.д.)
  const calculateSubtotal = (items: { price: string; quantity: number }[]) => {
    return items
      .reduce((sum, item) => {
        return sum + parseFloat(item.price) * item.quantity;
      }, 0)
      .toFixed(2);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5D23" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleBackPress}
          >
            <Text style={styles.buttonPrimaryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок с кнопкой назад */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Верхний блок с основной информацией */}
        <View style={styles.orderHeaderCard}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumberText}>Order #{order.id}</Text>
            <View style={styles.statusBadge}>
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(order.status) },
                ]}
              >
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.orderDate}>{order.date}</Text>

          <View style={styles.divider} />

          <View style={styles.detailsRow}>
            <StoreIcon />
            <Text style={styles.detailsLabel}>Store:</Text>
            <Text style={styles.detailsValue}>{order.storeName}</Text>
          </View>

          <View style={styles.detailsRow}>
            <LocationIcon />
            <Text style={styles.detailsLabel}>Delivery Address:</Text>
            <Text style={styles.detailsValue}>{order.address}</Text>
          </View>

          <View style={styles.detailsRow}>
            <PaymentIcon />
            <Text style={styles.detailsLabel}>Payment Method:</Text>
            <Text style={styles.detailsValue}>{order.paymentMethod}</Text>
          </View>
        </View>

        {/* Список товаров */}
        <View style={styles.productsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>

          {order.items.map((item, index) => (
            <View key={index} style={styles.productItem}>
              <View style={styles.productImageContainer}>
                <Image
                  source={{ uri: "/api/placeholder/60/60" }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.productDetails}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>${item.price}</Text>
              </View>

              <View style={styles.productQuantity}>
                <Text style={styles.quantityText}>x{item.quantity}</Text>
                <Text style={styles.itemTotalText}>
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Итоговая стоимость заказа */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ${calculateSubtotal(order.items)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>$3.99</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>$1.49</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${order.total}</Text>
          </View>
        </View>

        {/* Кнопки действий */}
        <View style={styles.actionsContainer}>
          {order.status === "completed" && (
            <TouchableOpacity style={styles.buttonPrimary}>
              <Text style={styles.buttonPrimaryText}>Reorder</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.buttonSecondary}>
            <Text style={styles.buttonSecondaryText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  orderHeaderCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderNumberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderNumberText: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  orderDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 16,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailsLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    marginRight: 8,
    width: 120,
  },
  detailsValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  productsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  productItem: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
  },
  productDetails: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: "#666",
  },
  productQuantity: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  itemTotalText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4A5D23",
  },
  actionsContainer: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  buttonPrimary: {
    backgroundColor: "#4A5D23",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "600",
  },
});
