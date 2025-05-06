import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { globalState } from "../store/globalState";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

// Используем тот же интерфейс, что и в globalState
interface DeliveryInfo {
  orderId: string;
  fromAddress: string;
  toAddress: string;
  driverName: string;
  status: "preparing" | "pickup" | "onTheWay" | "arrived" | "delivered";
  estimatedTime: string;
  remainingTime: number;
  updatedAt?: number;
}

const DeliveryTrackingWidget = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  // Проверяем, есть ли активная доставка при загрузке компонента
  useEffect(() => {
    const checkForActiveDelivery = async () => {
      try {
        // Проверяем в локальном хранилище, есть ли активная доставка
        const activeDeliveryString = await AsyncStorage.getItem(
          "activeDelivery"
        );

        if (activeDeliveryString) {
          const activeDelivery = JSON.parse(activeDeliveryString);

          // Если доставка завершена, и прошло более 10 минут, очищаем данные
          if (activeDelivery.status === "delivered") {
            const now = new Date().getTime();
            const deliveryTime = activeDelivery.updatedAt || now;
            const tenMinutes = 10 * 60 * 1000;

            if (now - deliveryTime > tenMinutes) {
              await AsyncStorage.removeItem("activeDelivery");
              globalState.activeDelivery = null;
              setIsVisible(false);
              setDeliveryInfo(null);
              return;
            }
          }

          setDeliveryInfo(activeDelivery);
          setIsVisible(true);

          // Если есть активная доставка, сохраняем ее в глобальном состоянии
          globalState.activeDelivery = activeDelivery;

          // Анимация появления только если виджет еще не отображается
          if (!isVisible) {
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // Если доставки нет, и виджет был видимым, анимируем его скрытие
          if (isVisible) {
            Animated.timing(slideAnim, {
              toValue: -100,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setIsVisible(false);
              setDeliveryInfo(null);
            });
          } else {
            setIsVisible(false);
            setDeliveryInfo(null);
          }

          globalState.activeDelivery = null;
        }
      } catch (error) {
        console.error("Error checking for active delivery:", error);
      }
    };

    checkForActiveDelivery();

    // Устанавливаем интервал для обновления данных каждые 10 секунд
    const interval = setInterval(checkForActiveDelivery, 10000);
    return () => clearInterval(interval);
  }, [slideAnim, isVisible]);

  // Обработчик для перехода к полному экрану отслеживания
  const openTrackingPage = () => {
    if (deliveryInfo) {
      router.push({
        pathname: "/(tabs)/delivery/delivery/DeliveryTrackingPage",
        params: {
          orderId: deliveryInfo.orderId,
          fromAddress: deliveryInfo.fromAddress,
          toAddress: deliveryInfo.toAddress,
        },
      });
    }
  };

  // Функция для получения статуса доставки
  const getStatusMessage = (status: string) => {
    switch (status) {
      case "preparing":
        return "Ваш заказ готовится";
      case "pickup":
        return "Курьер забирает заказ";
      case "onTheWay":
        return `Курьер в пути (${deliveryInfo?.remainingTime} мин)`;
      case "arrived":
        return "Курьер прибыл";
      case "delivered":
        return "Заказ доставлен";
      default:
        return "Отслеживание заказа...";
    }
  };

  // Возвращаем null, если нет активной доставки или виджет не должен быть видимым
  if (!isVisible || !deliveryInfo) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="delivery-dining" size={24} color="#4A5D23" />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.statusText}>
            {getStatusMessage(deliveryInfo.status)}
          </Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {deliveryInfo.toAddress}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={openTrackingPage}
        >
          <Text style={styles.actionButtonText}>Отследить</Text>
          <Ionicons name="chevron-forward" size={16} color="#4A5D23" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 999,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F7E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 12,
    color: "#666",
    width: "90%",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7E8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#4A5D23",
    marginRight: 4,
  },
});

export default DeliveryTrackingWidget;
