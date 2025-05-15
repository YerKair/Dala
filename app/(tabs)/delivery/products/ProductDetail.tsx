import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useApi } from "../utils/apiService";
import { getProductImage, getProductGallery } from "../utils/helpers";
import { useAuth } from "../../../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function ProductDetail() {
  const params = useLocalSearchParams();
  const { productId, fromScreen } = params;
  const api = useApi();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadImages();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      const data = await api.getProduct(productId as string);
      setProduct(data);

      // If the product has a category_id but no category info, fetch the category
      if (data.category_id && !data.category) {
        try {
          // Fetch category info
          const categoryResponse = await api.getCategories();

          // Find the category from the response
          const foundCategory = categoryResponse.find(
            (cat: any) => cat.id.toString() === data.category_id.toString()
          );

          if (foundCategory) {
            // Update product with category info
            setProduct({ ...data, category: foundCategory });
          }
        } catch (categoryError) {
          console.error("Error loading category info:", categoryError);
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      Alert.alert("Ошибка", "Не удалось загрузить информацию о товаре");
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
    try {
      // Загружаем основное изображение
      const mainImg = await getProductImage(productId as string);
      if (mainImg) {
        setMainImage(mainImg);
      }

      // Загружаем галерею
      const gallery = await getProductGallery(productId as string);
      setGalleryImages(gallery);
    } catch (error) {
      console.error("Error loading images:", error);
    }
  };

  const handleAddToCart = async () => {
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
      setLoading(true);

      // Get token from AsyncStorage
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        throw new Error("Токен авторизации не найден");
      }

      console.log("Adding product to cart, ID:", productId);

      // Сохраним изображение продукта в AsyncStorage для его отображения в корзине
      try {
        if (allImages && allImages.length > 0) {
          // Убедимся, что изображение доступно и корректное
          const imageUri = allImages[0];
          console.log(
            `Сохраняю изображение для продукта ${productId}: ${imageUri.substring(
              0,
              30
            )}...`
          );

          // Сохраняем изображение в AsyncStorage с правильным ключом
          const key = `product_image_${productId}`;
          await AsyncStorage.setItem(key, imageUri);
          console.log("Изображение продукта сохранено в AsyncStorage");

          // Подтверждаем что сохранение прошло успешно
          const savedImage = await AsyncStorage.getItem(key);
          if (savedImage) {
            console.log("Подтверждено: изображение сохранено в AsyncStorage");
          }
        } else {
          console.log("Нет доступных изображений для сохранения");
        }
      } catch (imageError) {
        console.error("Ошибка при сохранении изображения:", imageError);
      }

      // Make API call to add product to cart
      const response = await fetch(
        `http://192.168.0.113:8000/api/cart/${productId}`,
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
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (fromScreen) {
      // If we know which screen we came from, navigate directly to it
      if (fromScreen === "ProductsPage") {
        router.push({
          pathname: "/(tabs)/delivery/products/ProductsPage",
          params: {
            storeId: product?.seller?.id || "",
            categoryId: product?.category_id || "",
          },
        });
      } else {
        // Default back navigation
        router.back();
      }
    } else {
      // If no fromScreen specified, use the router.back() for history-based navigation
      router.back();
    }
  };

  const handleDeleteProduct = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Не авторизован",
        "Необходимо войти в систему для удаления товаров.",
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
      "Вы уверены, что хотите удалить этот товар? Это действие нельзя отменить.",
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
              setLoading(true);
              await api.deleteProduct(productId as string);
              Alert.alert("Успех", "Товар успешно удален");
              router.push("/(tabs)/delivery/products/ProductsPage");
            } catch (error) {
              console.error("Ошибка при удалении товара:", error);
              Alert.alert(
                "Ошибка",
                "Не удалось удалить товар. Пожалуйста, попробуйте позже."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  // Определяем список всех изображений для отображения
  const allImages = [
    ...(mainImage ? [mainImage] : []),
    ...galleryImages.filter((img) => img !== mainImage),
    // Если у товара есть изображение с сервера, добавляем его
    ...(product?.images && typeof product.images === "string" && !mainImage
      ? [product.images]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Детали товара</Text>
        {isAuthenticated &&
          product?.seller &&
          user?.id === product.seller.id && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteProduct}
            >
              <Feather name="trash-2" size={22} color="#FF3B30" />
            </TouchableOpacity>
          )}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Изображение товара */}
        <View style={styles.imageContainer}>
          {allImages.length > 0 ? (
            <>
              <Image
                source={{ uri: allImages[currentImageIndex] }}
                style={styles.mainImage}
                resizeMode="cover"
              />

              {/* Индикаторы для нескольких изображений */}
              {allImages.length > 1 && (
                <View style={styles.indicatorsContainer}>
                  {allImages.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        currentImageIndex === index && styles.indicatorActive,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Если несколько изображений, показываем миниатюры */}
              {allImages.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.thumbnailScroll}
                >
                  {allImages.map((image, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.thumbnailContainer,
                        currentImageIndex === index && styles.thumbnailActive,
                      ]}
                      onPress={() => setCurrentImageIndex(index)}
                    >
                      <Image
                        source={{ uri: image }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={80} color="#ddd" />
              <Text style={styles.noImageText}>Нет изображения</Text>
            </View>
          )}
        </View>

        {/* Информация о товаре */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{product?.title}</Text>
          <Text style={styles.price}>{product?.price} ₸</Text>

          {product?.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryLabel}>Категория:</Text>
              <Text style={styles.categoryValue}>
                {typeof product.category === "object" && product.category
                  ? product.category.name
                  : product.category_id
                  ? `Категория #${product.category_id}`
                  : "Без категории"}
              </Text>
            </View>
          )}

          <Text style={styles.descriptionLabel}>Описание:</Text>
          <Text style={styles.description}>{product?.description}</Text>

          {/* Информация о продавце */}
          {product?.seller && (
            <View style={styles.sellerContainer}>
              <Text style={styles.sellerLabel}>Продавец:</Text>
              <Text style={styles.sellerName}>{product.seller.name}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Кнопка добавления в корзину */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
        >
          <Feather
            name="shopping-cart"
            size={20}
            color="#FFFFFF"
            style={styles.cartIcon}
          />
          <Text style={styles.addToCartText}>Добавить в корзину</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "white",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: "100%",
    backgroundColor: "#F7F7F7",
  },
  mainImage: {
    width: "100%",
    height: 300,
  },
  indicatorsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 16,
    width: "100%",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: "#FFFFFF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  thumbnailScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    marginHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
  },
  thumbnailActive: {
    borderColor: "#4A5D23",
    borderWidth: 2,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  noImageContainer: {
    width: "100%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  noImageText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999",
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4A5D23",
    marginBottom: 16,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 16,
    color: "#666666",
    marginRight: 8,
  },
  categoryValue: {
    fontSize: 16,
    color: "#333333",
    fontWeight: "500",
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#555555",
    lineHeight: 24,
    marginBottom: 16,
  },
  sellerContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
  },
  sellerLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  addToCartButton: {
    backgroundColor: "#4A5D23",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  cartIcon: {
    marginRight: 8,
  },
  addToCartText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 10,
  },
});
