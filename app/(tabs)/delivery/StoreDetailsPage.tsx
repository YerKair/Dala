import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../auth/AuthContext";
import { getProductImage } from "./utils/imageHelper";
import { getImage } from "./utils/simpleImageStorage";
import ImageManager from "./utils/components/ImageManager";
import {
  demoCategories,
  demoStore,
  generateDemoProducts,
  DemoProduct,
} from "./utils/demoData";

// Интерфейсы
interface Category {
  id: string;
  name: string;
  store_id: string;
  image?: string;
  selected?: boolean;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  images: string | null;
  category_id: string;
  seller?: {
    id: number;
    name: string;
  };
}

interface Store {
  id: string;
  name: string;
  rating?: string;
  minOrderAmount?: string;
  openHours?: string;
}

// Ключи для AsyncStorage
const STORE_INFO_KEY = "store_info_";
const getCategoriesKey = (storeId: string) => `stored_categories_${storeId}`;
const getCategoryImageKey = (storeId: string, categoryId: number) =>
  `category_image_${storeId}_${categoryId}`;
const CATEGORY_PRODUCTS_KEY = "category_products_";

const CategoryItem: React.FC<{ item: Category; onPress: () => void }> = ({
  item,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          borderColor: item.selected ? "#4A5D23" : "#E0E0E0",
          backgroundColor: item.selected ? "rgba(74, 93, 35, 0.1)" : "white",
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.categoryImageContainer}>
        <ImageManager
          entityId={item.id}
          entityType="category"
          size="medium"
          style={styles.categoryImageManager}
          showRemoveButton={false}
          imageUrl={item.image}
        />
      </View>
      <Text
        style={[
          styles.categoryName,
          { color: item.selected ? "#4A5D23" : "#212121" },
        ]}
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

export default function StoreDetailsPage() {
  const params = useLocalSearchParams();
  const { storeId } = params;
  const { isAuthenticated } = useAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<
    Record<string, Product[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      router.back();
      return;
    }

    loadStoreDetails();
    loadCategories();
  }, [storeId]);

  const loadStoreDetails = async () => {
    try {
      // Делаем запрос к API напрямую
      try {
        const response = await fetch(
          `http://192.168.0.117:8000/api/restaurants/${storeId}`
        );
        if (response.ok) {
          const storeData = await response.json();
          // Преобразуем данные в нужный формат
          const storeInfo = {
            id: storeId as string,
            name: storeData.name || "Магазин",
            rating: storeData.rating || "8.8",
            minOrderAmount: storeData.minOrderAmount || "2,500 ₸",
            openHours: storeData.openHours || "09:00",
          };
          setStore(storeInfo);
          console.log("Загружена информация о магазине с API:", storeInfo.name);
        } else {
          // Если запрос не удался, используем базовые данные
          const storeInfo = {
            id: storeId as string,
            name: "Магазин",
            rating: "8.8",
            minOrderAmount: "2,500 ₸",
            openHours: "09:00",
          };
          setStore(storeInfo);
          console.log("Используем базовую информацию о магазине");
        }
      } catch (apiError) {
        console.error("Ошибка запроса к API магазина:", apiError);
        // В случае ошибки используем базовые данные
        const storeInfo = {
          id: storeId as string,
          name: "Магазин",
          rating: "8.8",
          minOrderAmount: "2,500 ₸",
          openHours: "09:00",
        };
        setStore(storeInfo);
        console.log("Используем базовую информацию о магазине");
      }
    } catch (error) {
      console.error("Ошибка загрузки информации о магазине:", error);
      setError("Не удалось загрузить информацию о магазине");
    }
  };

  const loadCategories = async () => {
    try {
      setIsLoading(true);

      // Загружаем категории напрямую с API
      try {
        // Получаем токен для авторизации
        let token = await AsyncStorage.getItem("token");
        if (!token) {
          token = await AsyncStorage.getItem("userToken");
        }

        // Запрашиваем все категории с сервера
        const response = await fetch(
          `http://192.168.0.117:8000/api/categories`,
          {
            headers: token
              ? {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                }
              : {
                  Accept: "application/json",
                },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`Загружено категорий с сервера:`, data.length);

          // Загружаем изображения категорий из AsyncStorage
          const enhancedCategories = await Promise.all(
            data.map(async (category: Category) => {
              // Привязываем категории к текущему магазину на фронте
              const categoryWithStore = {
                ...category,
                storeId: storeId as string,
              };

              // Проверка наличия image в категории с сервера
              if (category.image) {
                console.log(
                  `Категория ${category.id} имеет изображение с сервера: ${category.image}`
                );
                // Сохраним изображение с сервера в AsyncStorage для будущего использования
                await AsyncStorage.setItem(
                  getCategoryImageKey(storeId as string, parseInt(category.id)),
                  category.image
                );
                return { ...categoryWithStore, image: category.image };
              }

              return categoryWithStore;
            })
          );

          setCategories(enhancedCategories);

          // Загружаем продукты для каждой категории
          for (const category of data) {
            await loadProductsByCategory(parseInt(category.id));
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (apiError) {
        console.error(`Ошибка API при загрузке категорий:`, apiError);
        setError(
          "Не удалось загрузить категории. Проверьте подключение к серверу."
        );
        setCategories([]);
      }
    } catch (error) {
      console.error(`Ошибка загрузки категорий:`, error);
      setError("Не удалось загрузить категории");
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductsByCategory = async (categoryId: number) => {
    try {
      // Запрос к API для получения продуктов по категории
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      try {
        const response = await fetch(
          `http://192.168.0.117:8000/api/products?category_id=${categoryId}`,
          {
            headers: token
              ? {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                }
              : {
                  Accept: "application/json",
                },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.data && Array.isArray(data.data)) {
            const products = data.data;
            setProductsByCategory((prev) => ({
              ...prev,
              [categoryId]: products,
            }));
            return;
          }
        }
        throw new Error("Не удалось загрузить продукты с сервера");
      } catch (apiError) {
        console.error(
          `Ошибка загрузки продуктов с API для категории ${categoryId}:`,
          apiError
        );

        // В случае ошибки оставляем пустой массив продуктов
        setProductsByCategory((prev) => ({
          ...prev,
          [categoryId]: [],
        }));
      }
    } catch (error) {
      console.error(
        `Ошибка загрузки продуктов для категории ${categoryId}:`,
        error
      );
      // В случае ошибки оставляем пустой массив продуктов
      setProductsByCategory((prev) => ({
        ...prev,
        [categoryId]: [],
      }));
    }
  };

  const goBack = () => {
    router.back();
  };

  const navigateToCategory = (categoryId: number) => {
    router.push({
      pathname: "/(tabs)/delivery/products/ProductsPage",
      params: {
        storeId: storeId,
        categoryId: categoryId.toString(),
        fromScreen: "StoreDetailsPage",
      },
    });
  };

  const navigateToProduct = (productId: string) => {
    router.push({
      pathname: "/(tabs)/delivery/products/ProductDetail",
      params: {
        productId,
        fromScreen: "StoreDetailsPage",
      },
    });
  };

  const renderCategoryItem = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryItem
        item={item}
        onPress={() => navigateToCategory(parseInt(item.id))}
      />
    ),
    [navigateToCategory]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5D23" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Красный фон для заголовка */}
      <View style={styles.headerBackground}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Основная информация о магазине */}
      <View style={styles.storeInfoContainer}>
        <Text style={styles.storeName}>{store?.name}</Text>
        <View style={styles.storeDetailsRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="black" />
            <Text style={styles.ratingText}>{store?.rating}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={16} color="black" />
            <Text style={styles.timeText}>Opens at {store?.openHours}</Text>
          </View>
        </View>
        <View style={styles.minOrderContainer}>
          <Text style={styles.minOrderText}>
            Minimum order amount: {store?.minOrderAmount}
          </Text>
        </View>
      </View>

      {/* Заголовок раздела категорий */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
      </View>

      {/* Список категорий */}
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.categoriesList}
        columnWrapperStyle={styles.categoryRow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  headerBackground: {
    backgroundColor: "#FF3B30",
    height: 120,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  storeInfoContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: -50,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  storeName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  storeDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 14,
    marginLeft: 4,
  },
  minOrderContainer: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  minOrderText: {
    fontSize: 12,
    color: "#666",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  categoriesList: {
    padding: 8,
  },
  categoryRow: {
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  categoryItem: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    width: "48%",
    marginBottom: 16,
    overflow: "hidden",
  },
  categoryImageContainer: {
    height: 120,
    width: "100%",
  },
  categoryImageManager: {
    width: "100%",
    height: "100%",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "500",
    padding: 10,
    textAlign: "center",
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#4A5D23",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});
