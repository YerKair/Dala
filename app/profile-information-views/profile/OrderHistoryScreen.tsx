import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";
import { OrderHistoryService } from "../../services/OrderHistoryService";

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

// Иконка успешного заказа
const SuccessIcon = () => (
  <View style={styles.successIconContainer}>
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4A5D23"
      strokeWidth={2}
    >
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <Path d="M22 4L12 14.01l-3-3" />
    </Svg>
  </View>
);

// Иконка отмененного заказа
const CancelledIcon = () => (
  <View style={styles.cancelledIconContainer}>
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#E53935"
      strokeWidth={2}
    >
      <Path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  </View>
);

// Иконка активного заказа
const ActiveIcon = () => (
  <View style={styles.activeIconContainer}>
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2196F3"
      strokeWidth={2}
    >
      <Path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </Svg>
  </View>
);

// Интерфейс для заказа
export interface Order {
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
  userId?: string;
}

// Компонент элемента истории заказов
const OrderHistoryItem = ({
  order,
  onPress,
}: {
  order: Order;
  onPress: (order: Order) => void;
}) => {
  // Выбираем иконку в зависимости от статуса заказа
  const renderStatusIcon = () => {
    switch (order.status) {
      case "completed":
        return <SuccessIcon />;
      case "cancelled":
        return <CancelledIcon />;
      case "active":
        return <ActiveIcon />;
      default:
        return null;
    }
  };

  // Форматируем статус для отображения
  const getStatusText = () => {
    switch (order.status) {
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

  // Форматируем цвет статуса
  const getStatusColor = () => {
    switch (order.status) {
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

  return (
    <TouchableOpacity style={styles.orderItem} onPress={() => onPress(order)}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <Text style={styles.orderDate}>{order.date}</Text>
        </View>
        <View style={styles.statusContainer}>
          {renderStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      <View style={styles.storeInfoContainer}>
        <Image
          source={{ uri: "/api/placeholder/40/40" }}
          style={styles.storeImage}
          resizeMode="cover"
        />
        <View style={styles.storeTextContainer}>
          <Text style={styles.storeName}>{order.storeName}</Text>
          <Text style={styles.itemsCount}>
            {order.items.length} {order.items.length === 1 ? "item" : "items"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalPrice}>${order.total}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    // Загружаем историю заказов при монтировании компонента и при изменении пользователя
    loadOrders();
  }, [user]);

  // Загрузка истории заказов
  const loadOrders = async () => {
    setLoading(true);
    try {
      // Если пользователь авторизован, получаем его заказы
      if (user && user.id) {
        console.log(
          `Загрузка заказов для пользователя ID: ${user.id}, имя: ${user.name}`
        );

        const userOrders = await OrderHistoryService.getUserOrders(
          String(user.id)
        );
        console.log(
          `Найдено ${userOrders.length} заказов для пользователя ID: ${user.id}`
        );
        setOrders(userOrders);
      } else {
        // Если пользователь не авторизован, показываем пустой список
        console.log(
          "Пользователь не аутентифицирован, показываем пустой список"
        );
        setOrders([]);
      }
    } catch (error) {
      console.error("Ошибка при загрузке заказов:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Функция для очистки истории заказов текущего пользователя
  const clearUserOrderHistory = async () => {
    if (!user || !user.id) return;

    Alert.alert(
      "Очистить историю",
      "Вы уверены, что хотите очистить историю ваших заказов?",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Очистить",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              // Получаем все заказы
              const allOrders = await OrderHistoryService.getAllOrders();
              // Фильтруем, оставляя только заказы других пользователей
              const otherUsersOrders = allOrders.filter(
                (order) =>
                  !order.userId || String(order.userId) !== String(user.id)
              );

              // Сохраняем только заказы других пользователей
              await AsyncStorage.setItem(
                "orderHistory",
                JSON.stringify(otherUsersOrders)
              );
              console.log(
                `История заказов очищена для пользователя ID: ${user.id}`
              );

              // Обновляем список
              setOrders([]);
            } catch (error) {
              console.error("Ошибка при очистке истории заказов:", error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Обработчик для возврата назад
  const handleBackPress = () => {
    router.back();
  };

  // Обработчик для просмотра деталей заказа
  const handleOrderPress = (order: Order) => {
    // Для активных заказов переходим на страницу отслеживания
    if (order.status === "active") {
      router.push("/(tabs)/delivery/delivery/DeliveryTrackingPage");
    } else {
      // Для остальных - показываем детали заказа
      router.push({
        pathname: "/profile-information-views/profile/OrderDetailsScreen",
        params: { orderId: order.id },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок с кнопкой назад */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("profileSection.orderHistory")}
        </Text>
        {user && orders.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearUserOrderHistory}
          >
            <Text style={styles.clearButtonText}>Очистить</Text>
          </TouchableOpacity>
        )}
        {!user || orders.length === 0 ? <View style={{ width: 60 }} /> : null}
      </View>

      {/* Информация о текущем пользователе */}
      {user && (
        <View style={styles.userInfoContainer}>
          <Text style={styles.userInfoText}>
            Пользователь: {user.name} (ID: {user.id})
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5D23" />
        </View>
      ) : orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={({ item }) => (
            <OrderHistoryItem order={item} onPress={handleOrderPress} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          onRefresh={loadOrders}
          refreshing={loading}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image
            source={require("../../../assets/images/empty-orders.png")}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyTitle}>{t("noOrdersYet")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("orderHistoryWillAppearHere")}
          </Text>
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
  resetButton: {
    padding: 8,
  },
  resetButtonText: {
    color: "#F44336",
    fontWeight: "600",
  },
  userInfoContainer: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  userInfoText: {
    fontSize: 12,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ordersList: {
    padding: 16,
  },
  orderItem: {
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
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "600",
  },
  orderDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  successIconContainer: {
    marginRight: 8,
  },
  cancelledIconContainer: {
    marginRight: 8,
  },
  activeIconContainer: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  storeInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  storeImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  storeTextContainer: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "500",
  },
  itemsCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 16,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4A5D23",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginHorizontal: 24,
  },
  clearButton: {
    padding: 8,
    width: 60,
  },
  clearButtonText: {
    color: "#F44336",
    fontWeight: "600",
    textAlign: "center",
  },
});
