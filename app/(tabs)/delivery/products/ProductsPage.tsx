import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { getProductImage } from "../utils/helpers";
import { useApi } from "../utils/apiService";
import { useAuth } from "../../../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

// Product interface
interface Product {
  id: string;
  category_id: string;
  title: string;
  description: string;
  price: string;
  images: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  seller?: {
    id: number;
    name: string;
  };
  category?: {
    id: number;
    name: string;
  };
}

// Category interface
interface Category {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

// Store interface
interface Store {
  id: string;
  name: string;
  category: string;
}

interface ProductItemProps {
  item: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddToCart: (product: Product) => void;
}

// Separate component for product item
const ProductItem = ({
  item,
  onEdit,
  onDelete,
  onAddToCart,
}: ProductItemProps) => {
  const [itemImage, setItemImage] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Приоритет: сначала локальное изображение, затем серверное
        const localImage = await getProductImage(item.id);
        if (localImage) {
          setItemImage(localImage);
          return;
        }

        // Если нет локального, проверяем серверное
        if (item.images && typeof item.images === "string") {
          if (item.images.startsWith("http")) {
            setItemImage(item.images);
          } else if (item.images.startsWith("data:image")) {
            setItemImage(item.images);
          }
        }
      } catch (error) {
        console.error("Error loading product image:", error);
      }
    };

    loadImage();
  }, [item.id, item.images]);

  const handleProductPress = () => {
    router.push({
      pathname: "/delivery/products/ProductDetail",
      params: { productId: item.id },
    });
  };

  return (
    <TouchableOpacity
      style={styles.productContainer}
      onPress={handleProductPress}
    >
      <View style={styles.productImageContainer}>
        {itemImage ? (
          <Image
            source={{ uri: itemImage }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={30} color="#ddd" />
          </View>
        )}
      </View>

      <View style={styles.productContent}>
        <View style={styles.productTextContainer}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>{item.price} ₸</Text>
        </View>

        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
          >
            <Feather name="edit-2" size={16} color="#4A5D23" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <Feather name="trash-2" size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.addToCartButton}
        onPress={(e) => {
          e.stopPropagation();
          onAddToCart(item);
        }}
      >
        <Feather name="shopping-cart" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// Компонент для отображения элемента категории
const CategoryItem = ({
  category,
  isSelected,
  onPress,
}: {
  category: Category | null;
  isSelected: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.categoryFilterItem,
        isSelected && styles.categoryFilterItemActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.categoryFilterText,
          isSelected && styles.categoryFilterTextActive,
        ]}
      >
        {category ? category.name : "Все"}
      </Text>
    </TouchableOpacity>
  );
};

export default function ProductsPage() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const storeId = params.storeId ? String(params.storeId) : undefined;
  const refresh = params.refresh ? String(params.refresh) : undefined;
  const initialCategoryId = params.categoryId
    ? String(params.categoryId)
    : undefined;
  const api = useApi();
  const { isAuthenticated } = useAuth();
  const isAuthenticating = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("active");
  const [categoryId, setCategoryId] = useState<string>(
    initialCategoryId || "1"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    params.categoryId ? String(params.categoryId) : null
  );
  const [categoryName, setCategoryName] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    title: "",
    description: "",
    price: "",
    category_id: "1",
    status: "active",
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "1",
    status: "active",
  });

  // Add a ref to track if we need to force refresh
  const forceRefreshRef = useRef(false);

  useEffect(() => {
    if (storeId) {
      // Логируем параметры для отладки
      console.log("URL params:", {
        storeId,
        categoryId: params.categoryId,
        refresh,
        fromScreen: params.fromScreen,
      });

      // Если мы заходим на страницу без указания категории, сбрасываем выбранную категорию
      if (!params.categoryId) {
        console.log("No category specified in params, resetting to All");
        setSelectedCategory(null);
        setCategoryName("");
      } else {
        console.log(`Category specified in params: ${params.categoryId}`);

        // Устанавливаем ID категории при первой загрузке
        setSelectedCategory(params.categoryId as string);

        // Попробуем найти название категории в уже загруженных категориях
        if (categories.length > 0) {
          const category = categories.find(
            (cat) => cat.id.toString() === params.categoryId
          );
          if (category) {
            console.log(`Found category name on init: ${category.name}`);
            setCategoryName(category.name);
          }
        }
      }

      initPage();
    }
  }, [storeId, refresh, params.categoryId]);

  // Добавляем эффект для обновления названия категории при изменении списка категорий
  useEffect(() => {
    if (categories.length > 0 && selectedCategory) {
      const category = categories.find(
        (cat: Category) => cat.id.toString() === selectedCategory
      );
      if (category) {
        console.log(`Updating category name to: ${category.name}`);
        setCategoryName(category.name);
      }
    } else if (categories.length > 0 && !selectedCategory) {
      setCategoryName("");
    }
  }, [categories, selectedCategory]);

  // Загрузка продуктов при изменении страницы
  useEffect(() => {
    if (storeId && !forceRefreshRef.current) {
      console.log(`Page changed to: ${currentPage}, loading products...`);
      // Используем текущую выбранную категорию
      loadProductsWithCategory(selectedCategory);
    }
  }, [currentPage]);

  // Также добавим эффект для реагирования на изменение selectedCategory
  useEffect(() => {
    if (storeId && selectedCategory !== undefined) {
      console.log(
        `Selected category changed to: ${selectedCategory}, reloading products...`
      );

      // При изменении выбранной категории обновляем отображаемое имя категории
      if (selectedCategory) {
        const category = categories.find(
          (cat) => cat.id.toString() === selectedCategory
        );
        if (category) {
          console.log(
            `Updating category name in category change effect: ${category.name}`
          );
          setCategoryName(category.name);
        }
      } else {
        setCategoryName("");
      }

      loadProductsWithCategory(selectedCategory);
    }
  }, [selectedCategory, storeId]);

  const initPage = async () => {
    if (!storeId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Загружаем магазины сразу
      try {
        const response = await fetch(
          `http://192.168.0.104:8000/api/users/${storeId}`
        );
        if (response.ok) {
          const data = await response.json();
          setStores([
            {
              id: data.id.toString(),
              name: data.name,
              category: "Seller",
            },
          ]);
        }
      } catch (error) {
        console.error("Error loading store:", error);
      }

      // Сначала загружаем категории
      await loadCategories(true);

      // Затем загружаем продукты с текущей категорией
      await loadProductsWithCategory(selectedCategory);
    } catch (error) {
      console.error("Error initializing page:", error);
      setError("Не удалось загрузить данные");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async (force = false) => {
    try {
      setIsLoadingCategories(true);
      setError(null);

      // Используем ApiService вместо прямых fetch запросов
      try {
        console.log("Using ApiService to load categories");
        const categoriesData = await api.getCategories();

        if (Array.isArray(categoriesData) && categoriesData.length > 0) {
          console.log(
            "Categories loaded via ApiService:",
            categoriesData.length
          );

          // Загружаем изображения для каждой категории из AsyncStorage
          const categoriesWithImages = await Promise.all(
            categoriesData.map(async (category: Category) => {
              try {
                const imageUri = await AsyncStorage.getItem(
                  `category_image_${storeId}_${category.id}`
                );
                return { ...category, image: imageUri || undefined };
              } catch (e) {
                console.error("Error loading category image:", e);
                return category;
              }
            })
          );

          setCategories(categoriesWithImages);

          // Обновляем название текущей категории, если она выбрана
          if (selectedCategory) {
            const category = categoriesWithImages.find(
              (cat: Category) => cat.id.toString() === selectedCategory
            );
            if (category) {
              setCategoryName(category.name);
            }
          }
          return;
        } else {
          console.warn("ApiService returned empty categories array");
        }
      } catch (apiError) {
        console.error("Error using ApiService for categories:", apiError);
      }

      // Fallback: Используем прямой fetch если ApiService не сработал
      console.log("Falling back to direct fetch for categories");

      // Get token for authorization
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        console.log("No auth token found for categories request");
      } else {
        console.log("Using auth token:", token.substring(0, 10) + "...");
      }

      // Add timestamp to URL to prevent caching
      const timestamp = force ? `?_t=${Date.now()}` : "";
      const url = `http://192.168.0.104:8000/api/categories${timestamp}`;
      console.log("Loading categories from URL:", url);

      const response = await fetch(url, {
        headers: token
          ? {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            }
          : {
              Accept: "application/json",
            },
      });

      console.log("Categories response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! status: ${response.status}, response:`,
          errorText
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Categories loaded successfully:", data.length);
      setCategories(data);

      // Обновляем название текущей категории, если она выбрана
      if (selectedCategory) {
        const category = data.find(
          (cat: Category) => cat.id.toString() === selectedCategory
        );
        if (category) {
          setCategoryName(category.name);
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      // Fallback to mock data
      console.log("Using fallback category data");
      setCategories([
        { id: 1, name: "Электроника" },
        { id: 2, name: "Одежда" },
        { id: 3, name: "Мебель" },
        { id: 4, name: "Транспорт" },
        { id: 5, name: "Недвижимость" },
      ]);
      setError("Не удалось загрузить категории с сервера");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Add category filter handler
  const handleCategoryChange = (categoryId: string) => {
    // Преобразуем пустую строку в null для категории "Все"
    const newCategoryValue = categoryId === "" ? null : categoryId;

    console.log(
      `Changing category from ${selectedCategory} to ${newCategoryValue}`
    );

    // Немедленно обновляем название категории
    if (categoryId) {
      const category = categories.find(
        (cat) => cat.id.toString() === categoryId
      );
      if (category) {
        console.log(`Updating category name to: ${category.name}`);
        setCategoryName(category.name);
      } else {
        console.log(`Category with ID ${categoryId} not found`);
        setCategoryName("");
      }
    } else {
      console.log("Setting category name to empty (All categories)");
      setCategoryName("");
    }

    // Показываем индикатор загрузки
    setIsLoading(true);

    // Сбрасываем страницу и обновляем категорию
    setCurrentPage(1);
    setSelectedCategory(newCategoryValue);

    // Немедленно загружаем продукты с новой категорией
    // Используем непосредственно значение newCategoryValue вместо selectedCategory,
    // так как setState работает асинхронно
    loadProductsWithCategory(newCategoryValue);
  };

  // Функция для загрузки продуктов с конкретной категорией
  const loadProductsWithCategory = async (categoryValue: string | null) => {
    if (!storeId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Обновляем имя категории
      if (categoryValue) {
        const category = categories.find(
          (cat) => cat.id.toString() === categoryValue
        );
        if (category) {
          console.log(
            `Updating category name in loadProductsWithCategory: ${category.name}`
          );
          setCategoryName(category.name);
        }
      } else {
        setCategoryName("");
      }

      // Get token from AsyncStorage
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      // Добавляем timestamp для предотвращения кэширования
      const timestamp = Date.now();

      // Build the API URL with category filter if selected
      let apiUrl = `http://192.168.0.104:8000/api/products?store_id=${storeId}&page=${currentPage}&_t=${timestamp}`;
      if (categoryValue) {
        apiUrl += `&category_id=${categoryValue}`;
      }

      console.log(
        `Loading products with URL: ${apiUrl}, Category: ${categoryValue}`
      );

      const response = await fetch(apiUrl, {
        headers: token
          ? {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            }
          : {
              Accept: "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched products:", data);

      // Transform API data to match our component's format
      if (Array.isArray(data.data)) {
        let apiProducts = data.data.map((item: any) => ({
          id: item.id.toString(),
          category_id: item.category_id.toString(),
          title: item.title,
          description: item.description,
          price: item.price,
          images: item.images,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
          seller: item.seller,
          category: item.category,
        }));

        // Фильтрация продуктов по категории на клиенте только если API не поддерживает фильтрацию
        if (categoryValue) {
          const filteredCount = apiProducts.filter(
            (product: Product) => product.category_id === categoryValue
          ).length;

          console.log(
            `Products matching category ${categoryValue}: ${filteredCount} out of ${apiProducts.length}`
          );

          // Если API не отфильтровал корректно, делаем это на клиенте
          if (filteredCount !== apiProducts.length) {
            apiProducts = apiProducts.filter(
              (product: Product) => product.category_id === categoryValue
            );
            console.log(`Filtered products client-side: ${apiProducts.length}`);
          }
        }

        setProducts(apiProducts);
        setTotalPages(data.last_page || 1);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
      setError("Failed to load products. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Обновляем существующую функцию loadProducts для использования loadProductsWithCategory
  const loadProducts = async (force = false) => {
    await loadProductsWithCategory(selectedCategory);
  };

  // Add category filter UI
  const renderCategoryFilter = () => {
    if (isLoadingCategories) {
      return (
        <View style={styles.categoryFilterContainer}>
          <ActivityIndicator size="small" color="#4A5D23" />
          <Text style={styles.loadingText}>Загрузка категорий...</Text>
        </View>
      );
    }

    return (
      <View style={styles.categoryFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          <TouchableOpacity
            style={[
              styles.categoryFilterItem,
              selectedCategory === null && styles.categoryFilterItemActive,
            ]}
            onPress={() => handleCategoryChange("")}
          >
            <Text
              style={[
                styles.categoryFilterText,
                selectedCategory === null && styles.categoryFilterTextActive,
              ]}
            >
              Все категории
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryFilterItem,
                selectedCategory === category.id.toString() &&
                  styles.categoryFilterItemActive,
              ]}
              onPress={() => handleCategoryChange(category.id.toString())}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  selectedCategory === category.id.toString() &&
                    styles.categoryFilterTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Функция для получения текущего имени категории
  const getCurrentCategoryName = () => {
    if (!selectedCategory) return "Все категории";

    // Находим категорию в списке по ID
    const category = categories.find(
      (cat) => cat.id.toString() === selectedCategory
    );

    // Возвращаем имя, если нашли, или текущее значение categoryName
    return category ? category.name : categoryName || "Загрузка...";
  };

  // Add a function to force refresh data
  const forceRefreshData = () => {
    forceRefreshRef.current = true;
    initPage();
  };

  // Helper function to pick images
  const pickImage = async (): Promise<string | null> => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Требуется разрешение",
          "Нужен доступ к галерее для выбора изображения"
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Ошибка", "Не удалось загрузить изображение");
      return null;
    }
  };

  // Helper function to save product image to async storage
  const saveProductImage = async (
    productId: string,
    imageUri: string
  ): Promise<boolean> => {
    try {
      const key = `product_image_${productId}`;
      await AsyncStorage.setItem(key, imageUri);
      return true;
    } catch (error) {
      console.error("Error saving product image:", error);
      return false;
    }
  };

  // Функция для выбора изображения
  const handlePickImage = async () => {
    try {
      const imageUri = await pickImage();
      if (imageUri) {
        setProductImage(imageUri);
      }
    } catch (error) {
      console.error("Ошибка выбора изображения:", error);
      Alert.alert("Ошибка", "Произошла ошибка при выборе изображения");
    }
  };

  // Add product to cart
  const addToCart = async (product: Product) => {
    if (!isAuthenticated) {
      Alert.alert(
        "Не авторизован",
        "Пожалуйста, войдите, чтобы добавить товары в корзину",
        [
          {
            text: "Войти",
            onPress: () => router.push("/auth/login"),
          },
          {
            text: "Отмена",
            style: "cancel",
          },
        ]
      );
      return;
    }

    try {
      setAddingToCart(product.id);

      // Get token from AsyncStorage
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        throw new Error("Токен авторизации не найден");
      }

      console.log("Adding product to cart, ID:", product.id);

      // Сохраним изображение продукта в AsyncStorage для его отображения в корзине
      try {
        const productImage = await getProductImage(product.id);
        if (productImage) {
          console.log("Продукт уже имеет изображение в хранилище");
        } else if (product.images && typeof product.images === "string") {
          // Сохраняем изображение в AsyncStorage
          const key = `product_image_${product.id}`;
          await AsyncStorage.setItem(key, product.images);
          console.log("Изображение продукта сохранено в AsyncStorage");
        }
      } catch (imageError) {
        console.error("Ошибка при сохранении изображения:", imageError);
      }

      // Make API call to add product to cart using the correct endpoint
      const response = await fetch(
        `http://192.168.0.104:8000/api/cart/${product.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            quantity: 1,
          }),
        }
      );

      console.log("Add to cart response status:", response.status);

      if (!response.ok) {
        const responseText = await response.text();
        console.error("Error response:", responseText);
        throw new Error(`Не удалось добавить в корзину: ${response.status}`);
      }

      Alert.alert("Успешно", "Товар добавлен в корзину");
    } catch (error) {
      console.error("Ошибка добавления в корзину:", error);
      Alert.alert(
        "Ошибка",
        `Не удалось добавить товар в корзину: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
    } finally {
      setAddingToCart(null);
    }
  };

  // Create product
  const createProduct = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Не авторизован",
        "Необходимо войти в систему для создания продуктов.",
        [
          {
            text: "Войти",
            onPress: () => router.push("/auth/login"),
          },
          {
            text: "Отмена",
            style: "cancel",
          },
        ]
      );
      return;
    }

    if (!formData.name || !formData.description || !formData.price) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все обязательные поля");
      return;
    }

    if (!formData.categoryId) {
      Alert.alert("Ошибка", "Пожалуйста, выберите категорию");
      return;
    }

    try {
      setIsLoading(true);

      // Получаем токен
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        Alert.alert("Ошибка", "Вы не авторизованы");
        return;
      }

      // Создаем FormData для отправки изображения
      const form = new FormData();
      form.append("title", formData.name);
      form.append("description", formData.description);
      form.append("price", formData.price);
      form.append("category_id", formData.categoryId);
      form.append("status", formData.status);

      if (productImage) {
        if (productImage.startsWith("data:image")) {
          const blob = await (await fetch(productImage)).blob();
          form.append("image", blob, "product.jpg");
        } else {
          form.append("image", {
            uri: productImage,
            name: "product.jpg",
            type: "image/jpeg",
          } as any);
        }
      }

      // Отправляем запрос
      try {
        const response = await fetch("http://192.168.0.104:8000/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: form,
        });

        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.message || "Не удалось создать продукт");
        }

        // Сохраняем изображение локально, если оно было выбрано и есть id
        const productId = responseData.id || responseData.product?.id;
        if (productImage && productId) {
          try {
            const key = `product_image_${productId}`;
            await AsyncStorage.setItem(key, productImage);
            console.log(`Изображение продукта сохранено с ключом ${key}`);
          } catch (storageError) {
            console.error("Ошибка сохранения изображения:", storageError);
          }
        }

        // Обновляем список продуктов
        loadProducts();
        setModalVisible(false);
        setFormData({
          name: "",
          description: "",
          price: "",
          categoryId: "1",
          status: "active",
        });
        setProductImage(null);
        Alert.alert("Успешно", "Продукт успешно создан");
      } catch (apiError) {
        console.error("Ошибка создания продукта:", apiError);
        Alert.alert(
          "Ошибка",
          `Не удалось создать продукт: ${
            apiError instanceof Error ? apiError.message : "Неизвестная ошибка"
          }`
        );
      }
    } catch (error) {
      console.error("Ошибка:", error);
      Alert.alert("Ошибка", "Произошла ошибка при создании продукта");
    } finally {
      setIsLoading(false);
    }
  };

  // Open modal to edit existing product
  const openEditProductModal = async (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.title,
      description: product.description,
      price: product.price,
      categoryId: product.category_id,
      status: product.status,
    });

    // Load the product image
    if (product.images) {
      if (
        typeof product.images === "string" &&
        product.images.startsWith("http")
      ) {
        setProductImage(product.images);
      } else {
        const imageUri = await getProductImage(product.id);
        setProductImage(imageUri);
      }
    } else {
      setProductImage(null);
    }

    setModalVisible(true);
  };

  // Update product
  const updateProduct = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Не авторизован",
        "Необходимо войти в систему для обновления продуктов.",
        [
          {
            text: "Войти",
            onPress: () => router.push("/auth/login"),
          },
          {
            text: "Отмена",
            style: "cancel",
          },
        ]
      );
      return;
    }

    if (!formData.name || !formData.description || !formData.price) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все обязательные поля");
      return;
    }

    if (!selectedProduct) return;

    try {
      setIsLoading(true);

      // Получаем токен
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        Alert.alert("Ошибка", "Вы не авторизованы");
        return;
      }

      // Создаем данные для обновления продукта
      const productData = {
        title: formData.name,
        description: formData.description,
        price: formData.price,
        category_id: formData.categoryId,
        status: formData.status,
      };

      // Обновляем продукт через API
      try {
        const response = await fetch(
          `http://192.168.0.104:8000/api/products/${selectedProduct.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(productData),
          }
        );

        if (!response.ok) {
          throw new Error("Не удалось обновить продукт");
        }
      } catch (apiError) {
        console.error("Ошибка API при обновлении продукта:", apiError);
        // Продолжаем с локальным обновлением изображения даже при ошибке API
      }

      // Если изображение изменилось, сохраняем его в AsyncStorage
      if (productImage) {
        try {
          const key = `product_image_${selectedProduct.id}`;
          await AsyncStorage.setItem(key, productImage);
          console.log(
            `Изображение продукта сохранено в AsyncStorage с ключом ${key}`
          );
        } catch (storageError) {
          console.error("Ошибка сохранения изображения:", storageError);
        }
      }

      // Обновляем локальный список продуктов
      const updatedProducts = products.map((product) => {
        if (product.id === selectedProduct.id) {
          return {
            ...product,
            title: formData.name,
            description: formData.description,
            price: formData.price,
            category_id: formData.categoryId,
            status: formData.status,
            images: productImage || product.images,
          };
        }
        return product;
      });

      setProducts(updatedProducts);
      setModalVisible(false);
      setProductImage(null);
      Alert.alert("Успешно", "Продукт успешно обновлен");

      // Reload products to ensure UI is up to date
      loadProducts();
    } catch (error) {
      console.error("Ошибка при обновлении продукта:", error);
      Alert.alert("Ошибка", "Не удалось обновить продукт");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product
  const deleteProduct = (id: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        "Не авторизован",
        "Необходимо войти в систему для удаления продуктов.",
        [
          {
            text: "Войти",
            onPress: () => router.push("/auth/login"),
          },
          {
            text: "Отмена",
            style: "cancel",
          },
        ]
      );
      return;
    }

    Alert.alert(
      "Подтверждение удаления",
      "Вы уверены, что хотите удалить этот продукт?",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);

              // Используем метод из apiService вместо прямого axios запроса
              await api.deleteProduct(id);

              // Обновляем список продуктов после удаления
              setProducts((prevProducts) =>
                prevProducts.filter((product) => product.id !== id)
              );

              Alert.alert("Успех", "Продукт успешно удален");
            } catch (error) {
              console.error("Ошибка при удалении продукта:", error);
              Alert.alert(
                "Ошибка",
                "Не удалось удалить продукт. Пожалуйста, попробуйте позже."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Go back
  const goBack = () => {
    // Check if we came from a specific screen
    const previousScreenParam = params.fromScreen;

    if (previousScreenParam === "StoreDetailsPage") {
      router.push({
        pathname: "/(tabs)/delivery/StoreDetailsPage",
        params: { storeId: storeId },
      });
    } else if (previousScreenParam === "DeliverPage") {
      router.push("/(tabs)/delivery/DeliverPage");
    } else if (storeId && selectedCategory) {
      // If we have a storeId and selectedCategory, assume we came from StoreDetailsPage
      router.push({
        pathname: "/(tabs)/delivery/StoreDetailsPage",
        params: { storeId: storeId },
      });
    } else if (storeId) {
      // If we only have storeId, use it to navigate back
      router.push({
        pathname: "/(tabs)/delivery/StoreDetailsPage",
        params: { storeId: storeId },
      });
    } else {
      // Default to the main delivery page
      router.push("/(tabs)/delivery/DeliverPage");
    }
  };

  // Навигация к управлению категориями
  const navigateToCategories = () => {
    router.push({
      pathname: "/delivery/categories/CategoryManagement",
      params: { storeId: storeId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {stores.length > 0 ? stores[0].name : "Управление продуктами"}
        </Text>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={navigateToCategories}
        >
          <Feather name="tag" size={20} color="#4A5D23" />
        </TouchableOpacity>
      </View>

      {/* Отображение текущей категории */}
      <View style={styles.currentCategoryContainer}>
        <Text style={styles.currentCategoryText} key={selectedCategory}>
          Текущая категория:{" "}
          <Text
            style={[
              styles.categoryNameText,
              { fontWeight: "bold", color: "#4A5D23" },
            ]}
          >
            {getCurrentCategoryName()}
          </Text>
        </Text>
      </View>

      <View style={styles.contentContainer}>
        {/* Добавляем фильтр категорий здесь, перед заголовком продуктов */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Категории:</Text>
          {renderCategoryFilter()}
        </View>

        <View style={styles.productsHeader}>
          <Text style={styles.productsTitle}>Список продуктов</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              router.push({
                pathname: "/delivery/products/ProductCreation",
                params: {
                  storeId: storeId,
                  categoryId: selectedCategory,
                },
              });
            }}
          >
            <Feather name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A5D23" />
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="shopping-basket" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>Продукты не найдены</Text>
            <Text style={styles.emptySubtext}>
              Нажмите кнопку + чтобы добавить новый продукт
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={products}
              renderItem={({ item }) => (
                <ProductItem
                  item={item}
                  onEdit={openEditProductModal}
                  onDelete={deleteProduct}
                  onAddToCart={addToCart}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.productList}
            />

            {/* Pagination controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === 1 && styles.paginationButtonDisabled,
                  ]}
                  onPress={() =>
                    currentPage > 1 && setCurrentPage(currentPage - 1)
                  }
                  disabled={currentPage === 1}
                >
                  <Feather
                    name="chevron-left"
                    size={20}
                    color={currentPage === 1 ? "#CCCCCC" : "#4A5D23"}
                  />
                </TouchableOpacity>

                <Text style={styles.paginationText}>
                  Страница {currentPage} из {totalPages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === totalPages &&
                      styles.paginationButtonDisabled,
                  ]}
                  onPress={() =>
                    currentPage < totalPages && setCurrentPage(currentPage + 1)
                  }
                  disabled={currentPage === totalPages}
                >
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={currentPage === totalPages ? "#CCCCCC" : "#4A5D23"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProduct
                  ? "Редактирование продукта"
                  : "Создание продукта"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Название</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Введите название продукта"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Описание</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Введите описание продукта"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Цена</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price}
                  onChangeText={(text) =>
                    setFormData({ ...formData, price: text })
                  }
                  placeholder="Введите цену"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Категория</Text>
                {selectedProduct && (
                  <Text style={styles.categoryHint}>
                    Категория не может быть изменена после создания продукта
                  </Text>
                )}
                <View style={styles.categorySelector}>
                  {selectedProduct ? (
                    // Если редактируем продукт, показываем только его категорию
                    <View
                      style={[
                        styles.categoryOption,
                        styles.selectedCategoryOption,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          styles.selectedCategoryOptionText,
                        ]}
                      >
                        {categories.find(
                          (cat: Category) =>
                            cat.id.toString() === formData.categoryId
                        )?.name || "Категория"}
                      </Text>
                    </View>
                  ) : (
                    // Если создаем новый продукт, показываем все категории
                    categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryOption,
                          formData.categoryId === category.id.toString() &&
                            styles.selectedCategoryOption,
                        ]}
                        onPress={() =>
                          setFormData({
                            ...formData,
                            categoryId: category.id.toString(),
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            formData.categoryId === category.id.toString() &&
                              styles.selectedCategoryOptionText,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Статус</Text>
                <View style={styles.statusSelector}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      formData.status === "active" &&
                        styles.selectedStatusOption,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, status: "active" })
                    }
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        formData.status === "active" &&
                          styles.selectedStatusOptionText,
                      ]}
                    >
                      Активный
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      formData.status === "inactive" &&
                        styles.selectedStatusOption,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, status: "inactive" })
                    }
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        formData.status === "inactive" &&
                          styles.selectedStatusOptionText,
                      ]}
                    >
                      Неактивный
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.imagePickerContainer}>
                <Text style={styles.inputLabel}>Изображение продукта</Text>
                {productImage ? (
                  <View style={styles.selectedImageContainer}>
                    <Image
                      source={{ uri: productImage }}
                      style={styles.selectedImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={() => {
                        handlePickImage();
                      }}
                    >
                      <Text style={styles.changeImageText}>Изменить</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePicker}
                    onPress={() => {
                      handlePickImage();
                    }}
                  >
                    <Feather name="image" size={24} color="#4A5D23" />
                    <Text style={styles.imagePickerText}>
                      Выбрать изображение
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={selectedProduct ? updateProduct : createProduct}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {selectedProduct ? "Обновить продукт" : "Создать продукт"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Styles (from the previous document)
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
    paddingVertical: 10,
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
    backgroundColor: "#F0F0F0",
  },
  headerTitle: {
    fontWeight: "600",
    fontSize: 20,
    color: "#000000",
  },
  headerRight: {
    width: 40,
  },
  storeInfoContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  storeName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  storeCategory: {
    fontSize: 14,
    color: "#4A5D23",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  productsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  productsTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4A5D23",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#888",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
  productList: {
    paddingBottom: 20,
  },
  productItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  productItemImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4A5D23",
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  productCategory: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  tagContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  featuredTag: {
    backgroundColor: "#4A5D23",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeTag: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  productActions: {
    justifyContent: "space-around",
    alignItems: "center",
    paddingLeft: 16,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5F1E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFEEEE",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  productCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  productImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  noImageContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eeeeee",
  },
  addToCartButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#4A5D23",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  productDetails: {
    padding: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  productPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  featuredBadge: {
    backgroundColor: "#4A5D23",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#333",
  },
  paginationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 8,
  },
  paginationButtonDisabled: {
    backgroundColor: "#EBEBEB",
  },
  paginationText: {
    fontSize: 14,
    color: "#666",
    marginHorizontal: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#444",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  selectedCategoryOption: {
    backgroundColor: "#4A5D23",
  },
  categoryOptionText: {
    color: "#333",
    fontSize: 14,
  },
  selectedCategoryOptionText: {
    color: "#fff",
  },
  statusSelector: {
    flexDirection: "row",
    gap: 8,
  },
  statusOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  selectedStatusOption: {
    backgroundColor: "#4A5D23",
  },
  statusOptionText: {
    color: "#333",
    fontSize: 14,
  },
  selectedStatusOptionText: {
    color: "#fff",
  },
  imagePickerContainer: {
    marginBottom: 16,
  },
  imagePicker: {
    height: 120,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },
  imagePickerText: {
    marginTop: 8,
    color: "#4A5D23",
    fontSize: 14,
  },
  selectedImageContainer: {
    position: "relative",
  },
  selectedImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  changeImageButton: {
    position: "absolute",
    right: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeImageText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  productContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  productContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  productTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  actionButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F0",
  },
  saveButton: {
    backgroundColor: "#4A5D23",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  categoryFilterContainer: {
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  categoryFilterItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minWidth: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  categoryFilterItemActive: {
    backgroundColor: "#4A5D23",
    borderColor: "#3A4D13",
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  categoryFilterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  currentCategoryContainer: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  currentCategoryText: {
    fontSize: 14,
    color: "#4A5D23",
  },
  categoryHint: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#444",
  },
  filterScrollView: {
    paddingHorizontal: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  categorySection: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  categoryNameText: {
    fontWeight: "600",
  },
});
