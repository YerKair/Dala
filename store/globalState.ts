import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TaxiRequest {
  id: string;
  status: "pending" | "searching" | "accepted" | "cancelled" | "completed";
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  price?: number;
  distance?: number;
  estimatedTime?: number;
  driverId?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

// Ключ для хранения всех запросов в AsyncStorage
const TAXI_REQUESTS_KEY = "taxi_requests";

// Класс для управления запросами такси
class TaxiRequestsManager {
  private requests: TaxiRequest[] = [];
  private isInitialized: boolean = false;

  // Загрузка всех запросов из AsyncStorage
  async initialize() {
    if (this.isInitialized) return;

    try {
      const storedRequests = await AsyncStorage.getItem(TAXI_REQUESTS_KEY);
      if (storedRequests) {
        this.requests = JSON.parse(storedRequests);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to load taxi requests:", error);
    }
  }

  // Получение всех запросов
  async getAllRequests(): Promise<TaxiRequest[]> {
    await this.initialize();
    return this.requests;
  }

  // Получение запроса по ID
  async getRequestById(id: string): Promise<TaxiRequest | undefined> {
    await this.initialize();
    return this.requests.find((request) => request.id === id);
  }

  // Создание нового запроса
  async createRequest(
    request: Omit<TaxiRequest, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxiRequest> {
    await this.initialize();

    const newRequest: TaxiRequest = {
      ...request,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.requests.push(newRequest);
    await this.saveRequests();

    return newRequest;
  }

  // Обновление запроса
  async updateRequest(
    id: string,
    updates: Partial<TaxiRequest>
  ): Promise<TaxiRequest | undefined> {
    await this.initialize();

    const index = this.requests.findIndex((request) => request.id === id);
    if (index === -1) return undefined;

    const updatedRequest = {
      ...this.requests[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.requests[index] = updatedRequest;
    await this.saveRequests();

    return updatedRequest;
  }

  // Удаление запроса
  async deleteRequest(id: string): Promise<boolean> {
    await this.initialize();

    const initialLength = this.requests.length;
    this.requests = this.requests.filter((request) => request.id !== id);

    if (initialLength !== this.requests.length) {
      await this.saveRequests();
      return true;
    }

    return false;
  }

  // Сохранение запросов в AsyncStorage
  private async saveRequests() {
    try {
      await AsyncStorage.setItem(
        TAXI_REQUESTS_KEY,
        JSON.stringify(this.requests)
      );
    } catch (error) {
      console.error("Failed to save taxi requests:", error);
    }
  }

  // Обновление статуса запроса
  async updateRequestStatus(
    id: string,
    status: TaxiRequest["status"]
  ): Promise<TaxiRequest | undefined> {
    return this.updateRequest(id, { status });
  }

  // Получение активных запросов для пользователя
  async getUserActiveRequests(userId: string): Promise<TaxiRequest[]> {
    await this.initialize();

    return this.requests.filter(
      (request) =>
        request.userId === userId &&
        ["pending", "searching", "accepted"].includes(request.status)
    );
  }
}

// Создаем синглтон менеджера запросов
export const taxiRequestsManager = new TaxiRequestsManager();

// WebSocket подключение для реального времени
export const initializeWebSocketConnection = (
  userId: string,
  onUpdate: (data: any) => void
) => {
  // Имитация WebSocket подключения
  console.log(`Initializing WebSocket connection for user ${userId}`);

  // Здесь должна быть настоящая логика WebSocket
  // Например, используя библиотеку socket.io-client:
  //
  // import io from 'socket.io-client';
  // const socket = io('https://your-api.com');
  // socket.on('connect', () => {
  //   socket.emit('join', { userId });
  // });
  // socket.on('orderStatusUpdate', (data) => {
  //   onUpdate(data);
  // });
  //
  // return socket;

  // Для тестирования, возвращаем объект с методом отключения
  return {
    disconnect: () => {
      console.log(`Disconnecting WebSocket for user ${userId}`);
    },
  };
};
