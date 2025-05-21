import AsyncStorage from "@react-native-async-storage/async-storage";
import { Order } from "../profile-information-views/profile/OrderHistoryScreen";

export class OrderHistoryService {
  // Сохранение нового заказа
  static async saveOrder(order: Order): Promise<void> {
    try {
      // Убедимся, что у заказа есть userId
      if (!order.userId) {
        console.warn("Предупреждение: заказ сохраняется без userId!");
      }

      console.log(
        `Сохранение заказа с ID: ${order.id}, userId: ${order.userId}`
      );

      // Получаем существующие заказы
      const existingOrdersString = await AsyncStorage.getItem("orderHistory");
      let existingOrders: Order[] = [];

      if (existingOrdersString) {
        existingOrders = JSON.parse(existingOrdersString);
      }

      // Добавляем новый заказ в начало массива
      existingOrders.unshift(order);

      // Сохраняем обновленный массив заказов
      await AsyncStorage.setItem(
        "orderHistory",
        JSON.stringify(existingOrders)
      );
      console.log(
        `Заказ успешно сохранен с ID: ${order.id} для пользователя: ${order.userId}`
      );
    } catch (error) {
      console.error("Ошибка при сохранении заказа:", error);
      throw error;
    }
  }

  // Получение всех заказов
  static async getAllOrders(): Promise<Order[]> {
    try {
      const ordersString = await AsyncStorage.getItem("orderHistory");
      if (ordersString) {
        return JSON.parse(ordersString);
      }
      return [];
    } catch (error) {
      console.error("Ошибка при получении заказов:", error);
      return [];
    }
  }

  // Получение заказов пользователя
  static async getUserOrders(userId: string): Promise<Order[]> {
    if (!userId) {
      console.warn("Запрос заказов с пустым userId");
      return [];
    }

    try {
      const allOrders = await this.getAllOrders();
      console.log(`Всего заказов в системе: ${allOrders.length}`);

      // Строгая фильтрация - только заказы с точным совпадением userId
      const userOrders = allOrders.filter(
        (order) => String(order.userId) === String(userId)
      );

      console.log(
        `Найдено ${userOrders.length} заказов для пользователя ID: ${userId}`
      );
      return userOrders;
    } catch (error) {
      console.error("Ошибка при получении заказов пользователя:", error);
      return [];
    }
  }

  // Получение заказа по ID
  static async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const allOrders = await this.getAllOrders();
      const order = allOrders.find((o) => o.id === orderId);
      return order || null;
    } catch (error) {
      console.error("Ошибка при получении заказа по ID:", error);
      return null;
    }
  }

  // Обновление статуса заказа
  static async updateOrderStatus(
    orderId: string,
    newStatus: "completed" | "cancelled" | "active"
  ): Promise<boolean> {
    try {
      const allOrders = await this.getAllOrders();
      const orderIndex = allOrders.findIndex((o) => o.id === orderId);

      if (orderIndex === -1) {
        return false;
      }

      allOrders[orderIndex].status = newStatus;
      await AsyncStorage.setItem("orderHistory", JSON.stringify(allOrders));
      return true;
    } catch (error) {
      console.error("Ошибка при обновлении статуса заказа:", error);
      return false;
    }
  }

  // Удаление заказа
  static async deleteOrder(orderId: string): Promise<boolean> {
    try {
      const allOrders = await this.getAllOrders();
      const updatedOrders = allOrders.filter((order) => order.id !== orderId);

      if (updatedOrders.length === allOrders.length) {
        // Заказ не найден
        return false;
      }

      await AsyncStorage.setItem("orderHistory", JSON.stringify(updatedOrders));
      console.log(`Заказ с ID: ${orderId} успешно удален`);
      return true;
    } catch (error) {
      console.error("Ошибка при удалении заказа:", error);
      return false;
    }
  }

  // Удаление всех заказов пользователя
  static async deleteUserOrders(userId: string): Promise<boolean> {
    try {
      const allOrders = await this.getAllOrders();
      const otherUsersOrders = allOrders.filter(
        (order) => !order.userId || String(order.userId) !== String(userId)
      );

      await AsyncStorage.setItem(
        "orderHistory",
        JSON.stringify(otherUsersOrders)
      );
      console.log(`Все заказы пользователя ID: ${userId} успешно удалены`);
      return true;
    } catch (error) {
      console.error("Ошибка при удалении заказов пользователя:", error);
      return false;
    }
  }
}
