import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useApi } from "../utils/apiService";
import { useAuth } from "../../../auth/AuthContext";
import SimpleImagePicker from "../utils/components/SimpleImagePicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getProductImage,
  getProductGallery,
  saveProductImage,
} from "../utils/helpers";

// Определим интерфейс для категории
interface Category {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export default function ProductCreation() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const seller_id = params.storeId
    ? String(params.storeId)
    : params.seller_id
    ? String(params.seller_id)
    : undefined;
  const initialCategoryId = params.categoryId
    ? String(params.categoryId)
    : undefined;
  const productId = params.productId ? String(params.productId) : undefined;
  const api = useApi();
  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId || "1");
  const [status, setStatus] = useState("active");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
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
            onPress: () => router.back(),
            style: "cancel",
          },
        ]
      );
    } else {
      loadCategories();
      loadSellerInfo();
      if (productId) {
        loadProductDetails();
      }
    }
  }, [isAuthenticated, seller_id, productId]);

  const loadSellerInfo = async () => {
    if (!seller_id) return;

    try {
      const response = await fetch(
        `http://192.168.0.109:8000/api/users/${seller_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setSellerName(data.name);
      }
    } catch (error) {
      console.error("Ошибка загрузки информации о продавце:", error);
    }
  };

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);

      // Получаем токен для авторизации
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      // Запрашиваем категории из API
      const response = await fetch("http://192.168.0.109:8000/api/categories", {
        headers: token
          ? {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            }
          : {
              Accept: "application/json",
            },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Загружено категорий:", data.length);
      setCategories(data);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
      // Используем демо-данные если API недоступен
      setCategories([
        { id: 1, name: "Электроника" },
        { id: 2, name: "Одежда" },
        { id: 3, name: "Мебель" },
        { id: 4, name: "Транспорт" },
        { id: 5, name: "Недвижимость" },
      ]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadProductDetails = async () => {
    try {
      setIsLoading(true);
      const productData = await api.getProduct(productId as string);

      if (productData) {
        setTitle(productData.title || "");
        setDescription(productData.description || "");
        setPrice(productData.price?.toString() || "");
        setCategoryId(productData.category_id?.toString() || "1");
        setStatus(productData.status || "active");
        setIsEditing(true);

        // Load product image
        const imageUri = await getProductImage(productId as string);
        if (imageUri) {
          setProductImage(imageUri);
        } else if (productData.images) {
          setProductImage(productData.images);
        }
      }
    } catch (error) {
      console.error("Error loading product details:", error);
      Alert.alert("Ошибка", "Не удалось загрузить данные продукта");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelected = async (imageUri: string) => {
    try {
      console.log(
        "[DEBUG] Получено изображение:",
        imageUri.substring(0, 50) + "..."
      );

      // Validate image URI
      if (
        !imageUri.startsWith("data:image") &&
        !imageUri.startsWith("file://") &&
        !imageUri.startsWith("http")
      ) {
        throw new Error("Неверный формат изображения");
      }

      // Save temporary image
      await saveProductImage(productId || "temp", imageUri);
      setProductImage(imageUri);
    } catch (error) {
      console.error("Error handling selected image:", error);
      Alert.alert("Ошибка", "Не удалось обработать выбранное изображение");
    }
  };

  const createProduct = async () => {
    if (!seller_id) {
      Alert.alert("Ошибка", "Не указан ID продавца");
      return;
    }

    if (!title || !price || !categoryId) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все обязательные поля");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("category_id", categoryId);
      formData.append("status", status);
      formData.append("seller_id", seller_id);

      if (productImage) {
        // Validate image URI
        if (
          !productImage.startsWith("data:image") &&
          !productImage.startsWith("file://") &&
          !productImage.startsWith("http")
        ) {
          throw new Error("Invalid image format");
        }

        // Handle base64 images
        if (productImage.startsWith("data:image")) {
          const base64Data = productImage.split(",")[1];
          formData.append("image", {
            uri: `data:image/jpeg;base64,${base64Data}`,
            type: "image/jpeg",
            name: "product.jpg",
          } as any);
        }
        // Handle file:// and http(s):// images
        else {
          formData.append("image", {
            uri: productImage,
            type: "image/jpeg",
            name: "product.jpg",
          } as any);
        }
      }

      // Get authentication token
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        throw new Error("Не найден токен авторизации");
      }

      const url = isEditing
        ? `http://192.168.0.109:8000/api/products/${productId}`
        : "http://192.168.0.109:8000/api/products";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Product created/updated successfully:", data);

      // Save image to local storage if exists
      const savedProductId = isEditing
        ? productId
        : data.id || data.product?.id;
      if (productImage && savedProductId) {
        try {
          await saveProductImage(savedProductId, productImage);
          console.log("Product image saved to local storage");
        } catch (saveError) {
          console.error("Error saving image to local storage:", saveError);
        }
      }

      // Show success message and navigate back
      Alert.alert(
        "Успех",
        isEditing ? "Продукт успешно обновлен" : "Продукт успешно создан",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error creating/updating product:", error);
      Alert.alert(
        "Ошибка",
        error instanceof Error ? error.message : "Не удалось сохранить продукт"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    router.push({
      pathname: "/delivery/products/ProductsPage",
      params: { storeId: seller_id },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Редактирование продукта" : "Создание продукта"}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {sellerName && (
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerInfoText}>
            Продавец: <Text style={styles.sellerName}>{sellerName}</Text>
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView style={styles.formContainer}>
          <Text style={styles.inputLabel}>Название продукта *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Введите название продукта"
          />

          <Text style={styles.inputLabel}>Описание *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Введите описание продукта"
            multiline
            numberOfLines={4}
          />

          <Text style={styles.inputLabel}>Цена *</Text>
          <TextInput
            style={styles.textInput}
            value={price}
            onChangeText={setPrice}
            placeholder="Введите цену"
            keyboardType="decimal-pad"
          />

          <Text style={styles.inputLabel}>Категория</Text>
          {isLoadingCategories ? (
            <ActivityIndicator size="small" color="#4A5D23" />
          ) : (
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    categoryId === cat.id.toString() &&
                      styles.categoryButtonSelected,
                  ]}
                  onPress={() => setCategoryId(cat.id.toString())}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      categoryId === cat.id.toString() &&
                        styles.categoryButtonTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.inputLabel}>Изображение продукта</Text>
          <View style={styles.imageSection}>
            <View style={styles.imagePicker}>
              <SimpleImagePicker
                productId={productId || "temp"}
                onImageSelected={handleImageSelected}
                style={styles.imagePickerContainer}
              />
            </View>
          </View>

          <View style={styles.debugSection}>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                console.log("[DEBUG] Тестовая кнопка нажата");

                // Проверяем, есть ли изображение
                console.log(
                  "[DEBUG] Текущее изображение:",
                  productImage ? "Есть" : "Нет"
                );

                if (productImage) {
                  try {
                    // Пробуем сохранить изображение напрямую в AsyncStorage
                    console.log(
                      "[DEBUG] Сохраняем изображение напрямую в AsyncStorage"
                    );
                    const testKey = "test_image_" + Date.now();
                    await AsyncStorage.setItem(testKey, productImage);

                    // Пробуем прочитать изображение
                    console.log("[DEBUG] Читаем изображение из AsyncStorage");
                    const loadedImage = await AsyncStorage.getItem(testKey);

                    // Проверяем результат
                    if (loadedImage && loadedImage === productImage) {
                      console.log(
                        "[DEBUG] Изображение успешно сохранено и извлечено"
                      );
                      Alert.alert("Успех", "Тест AsyncStorage пройден успешно");
                    } else {
                      console.log("[DEBUG] Ошибка проверки изображения");
                      Alert.alert(
                        "Ошибка",
                        "Тест не пройден. Проверьте консоль для подробностей."
                      );
                    }

                    // Удаляем тестовый ключ
                    await AsyncStorage.removeItem(testKey);
                  } catch (error: any) {
                    console.error("[DEBUG] Ошибка теста:", error);
                    Alert.alert(
                      "Ошибка",
                      "Произошла ошибка при тестировании: " +
                        (error.message || String(error))
                    );
                  }
                } else {
                  Alert.alert(
                    "Предупреждение",
                    "Добавьте изображение перед тестированием"
                  );
                }
              }}
            >
              <Text style={styles.debugButtonText}>
                Проверить работу с изображением
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Статус</Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "active" && styles.statusButtonSelected,
              ]}
              onPress={() => setStatus("active")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "active" && styles.statusButtonTextSelected,
                ]}
              >
                Активный
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "inactive" && styles.statusButtonSelected,
              ]}
              onPress={() => setStatus("inactive")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "inactive" && styles.statusButtonTextSelected,
                ]}
              >
                Неактивный
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "featured" && styles.statusButtonSelected,
              ]}
              onPress={() => setStatus("featured")}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === "featured" && styles.statusButtonTextSelected,
                ]}
              >
                Рекомендуемый
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={createProduct}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Создать продукт</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  restaurantInfo: {
    backgroundColor: "#F0F5E8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  restaurantInfoText: {
    fontSize: 14,
    color: "#666",
  },
  restaurantName: {
    fontWeight: "600",
    color: "#4A5D23",
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#444",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  categoryButton: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryButtonSelected: {
    backgroundColor: "#4A5D23",
    borderColor: "#4A5D23",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#666",
  },
  categoryButtonTextSelected: {
    color: "white",
    fontWeight: "600",
  },
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  statusButton: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statusButtonSelected: {
    backgroundColor: "#4A5D23",
    borderColor: "#4A5D23",
  },
  statusButtonText: {
    fontSize: 14,
    color: "#666",
  },
  statusButtonTextSelected: {
    color: "white",
    fontWeight: "600",
  },
  imageSection: {
    marginBottom: 24,
  },
  imagePicker: {
    marginTop: 12,
    alignItems: "center",
  },
  imagePickerContainer: {
    marginBottom: 20,
  },
  gallerySection: {
    marginBottom: 24,
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
  saveButton: {
    backgroundColor: "#4A5D23",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  sellerInfo: {
    backgroundColor: "#F0F5E8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  sellerInfoText: {
    fontSize: 14,
    color: "#666",
  },
  sellerName: {
    fontWeight: "600",
    color: "#4A5D23",
  },
  debugSection: {
    marginVertical: 16,
    marginHorizontal: 8,
  },
  debugButton: {
    backgroundColor: "#FF6B00",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  debugButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
