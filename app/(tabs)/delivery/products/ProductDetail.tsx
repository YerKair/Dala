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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadImages();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      if (!isAuthenticated) {
        setError("Для просмотра деталей товара необходимо авторизоваться");
        setLoading(false);
        return;
      }

      const data = await api.getProduct(productId as string);
      setProduct(data);

      // If the product has a category_id but no category info, fetch the category
      if (data.category_id && !data.category) {
        try {
          const categoryResponse = await api.getCategories();
          const foundCategory = categoryResponse.find(
            (cat: any) => cat.id.toString() === data.category_id.toString()
          );

          if (foundCategory) {
            setProduct({ ...data, category: foundCategory });
          }
        } catch (categoryError) {
          console.error("Error loading category info:", categoryError);
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      if (error instanceof Error) {
        if (error.message === "Необходима авторизация") {
          setError("Для просмотра деталей товара необходимо авторизоваться");
          router.push("/auth/login");
        } else {
          setError(error.message);
        }
      } else {
        setError("Не удалось загрузить информацию о товаре");
      }
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

  const handleBack = () => {
    if (fromScreen === "cart") {
      router.push("/delivery/delivery/CartPage");
    } else {
      router.back();
    }
  };

  // Определяем список всех изображений для отображения
  const allImages = [
    ...(mainImage ? [mainImage] : []),
    ...galleryImages.filter((img) => img !== mainImage),
    ...(product?.images && typeof product.images === "string" && !mainImage
      ? [product.images]
      : []),
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Детали товара</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5D23" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Детали товара</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              loadProduct();
            }}
          >
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Детали товара</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Товар не найден</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              style={styles.editButton}
              onPress={() => {
                router.push({
                  pathname: "/delivery/products/ProductCreation",
                  params: { productId: product.id },
                });
              }}
            >
              <Feather name="edit" size={22} color="#4A5D23" />
            </TouchableOpacity>
          )}
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.imageContainer}>
          {allImages.length > 0 ? (
            <>
              <Image
                source={{ uri: allImages[currentImageIndex] }}
                style={styles.mainImage}
                resizeMode="cover"
              />
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
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Feather name="image" size={48} color="#999" />
              <Text style={styles.noImageText}>Нет изображения</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>{product.price} ₸</Text>
          <Text style={styles.description}>{product.description}</Text>

          {product.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryLabel}>Категория:</Text>
              <Text style={styles.categoryText}>{product.category.name}</Text>
            </View>
          )}

          {product.seller && (
            <View style={styles.sellerContainer}>
              <Text style={styles.sellerLabel}>Продавец:</Text>
              <Text style={styles.sellerText}>{product.seller.name}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#4A5D23",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "white",
  },
  backButton: {
    padding: 8,
  },
  editButton: {
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
    height: 300,
    backgroundColor: "#F7F7F7",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  noImageContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  noImageText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999",
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
    backgroundColor: "rgba(0,0,0,0.3)",
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: "#4A5D23",
    width: 10,
    height: 10,
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
  description: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 16,
    lineHeight: 24,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 16,
    color: "#666666",
    marginRight: 8,
  },
  categoryText: {
    fontSize: 16,
    color: "#333333",
    fontWeight: "500",
  },
  sellerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sellerLabel: {
    fontSize: 16,
    color: "#666666",
    marginRight: 8,
  },
  sellerText: {
    fontSize: 16,
    color: "#333333",
    fontWeight: "500",
  },
});
