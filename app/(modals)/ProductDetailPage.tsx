import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  Linking,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";

// Back Button Component
const BackButton = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth={1.5}
  >
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

// Phone Icon Component
const PhoneIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFFFFF"
    strokeWidth={1.5}
  >
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </Svg>
);

// Message Icon Component
const MessageIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFFFFF"
    strokeWidth={1.5}
  >
    <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </Svg>
);

// Next Image Button Component
const NextButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.imageNavButton} onPress={onPress}>
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={1.5}
    >
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  </TouchableOpacity>
);

// Previous Image Button Component
const PrevButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.imageNavButton, styles.prevButton]}
    onPress={onPress}
  >
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={1.5}
    >
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  </TouchableOpacity>
);

// Interface for product type
interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  imageUri?: string | null;
  additionalImageUris?: Array<string | null>;
  contact?: {
    name: string;
    phone: string;
  };
  dateCreated?: string;
}

export default function ProductDetailPage() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для создания тестового продукта (используется только для отладки)
  const createTestProduct = () => {
    const testProduct: Product = {
      id: productId || "test-id",
      title: "Test Product",
      description:
        "This is a test product description to debug loading issues.",
      price: "9999 ₸",
      category: "Test Category",
      condition: "New",
      contact: {
        name: "Test Seller",
        phone: "+7 777 777 7777",
      },
      dateCreated: new Date().toISOString(),
    };

    return testProduct;
  };

  // Use effect to fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching product with id:", productId);

        const productsJSON = await AsyncStorage.getItem("marketplace_products");

        if (!productsJSON) {
          console.log("No products found in storage");
          setError("No products available in storage");

          // Используем тестовый продукт для отладки
          const testProduct = createTestProduct();
          setProduct(testProduct);
          setIsLoading(false);
          return;
        }

        console.log("Products JSON retrieved, parsing...");
        const products = JSON.parse(productsJSON) as Product[];
        console.log("Total products found:", products.length);

        const foundProduct = products.find((p) => p.id === productId);

        if (!foundProduct) {
          console.log("Product not found with id:", productId);
          setError("Product not found with the specified ID");

          // Используем тестовый продукт для отладки
          const testProduct = createTestProduct();
          setProduct(testProduct);
          setIsLoading(false);
          return;
        }

        console.log("Product found:", foundProduct.title);
        setProduct(foundProduct);

        // Combine main image and additional images
        // Filter out null values before assigning to state
        const images: string[] = [];

        if (foundProduct.imageUri) {
          console.log("Adding main image:", foundProduct.imageUri);
          images.push(foundProduct.imageUri);
        }

        if (
          foundProduct.additionalImageUris &&
          foundProduct.additionalImageUris.length > 0
        ) {
          console.log(
            "Processing additional images:",
            foundProduct.additionalImageUris.length
          );
          foundProduct.additionalImageUris.forEach((uri) => {
            if (uri) {
              console.log("Adding additional image:", uri);
              images.push(uri);
            }
          });
        }

        console.log("Total images to display:", images.length);
        setAllImages(images);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching product:", error);
        setError(
          "Failed to load product details: " +
            (error instanceof Error ? error.message : "Unknown error")
        );

        // Используем тестовый продукт для отладки
        const testProduct = createTestProduct();
        setProduct(testProduct);
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Navigate to next image
  const nextImage = () => {
    if (currentImageIndex < allImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else {
      setCurrentImageIndex(0);
    }
  };

  // Navigate to previous image
  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else {
      setCurrentImageIndex(allImages.length - 1);
    }
  };

  // Function to navigate back to the specific category
  const goBack = () => {
    if (product && product.category) {
      // Navigate back to the specific category page
      router.push({
        pathname: "/(tabs)/marketplacer/CategoryPage",
        params: { category: product.category },
      });
    } else {
      // Fallback to generic marketplace if no category found
      router.push("/(tabs)/marketplacer/MarketplaceScreen");
    }
  };

  // Function to call the seller
  const callSeller = () => {
    if (product?.contact?.phone) {
      Linking.openURL(`tel:${product.contact.phone}`);
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  };

  // Function to message the seller
  const messageSeller = () => {
    if (product?.contact?.phone) {
      Linking.openURL(`sms:${product.contact.phone}`);
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  };

  // Format date string
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Function to retry loading
  const retryLoading = () => {
    setProduct(null);
    setAllImages([]);
    setIsLoading(true);
    setError(null);
  };

  // If loading or error, show appropriate screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.push("/(tabs)/marketplacer/MarketplaceScreen")
            }
          >
            <BackButton />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !product) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)/marketplacer/CategoryPage")}
          >
            <BackButton />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No product, something went wrong
  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.push("/(tabs)/marketplacer/MarketplaceScreen")
            }
          >
            <BackButton />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load product. Please try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <BackButton />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 80 + insets.bottom },
        ]}
      >
        {/* Product Images Carousel */}
        <View style={styles.imageContainer}>
          {allImages.length > 0 ? (
            <>
              <Image
                source={{ uri: allImages[currentImageIndex] }}
                style={styles.productImage}
                resizeMode="cover"
              />
              {allImages.length > 1 && (
                <>
                  <PrevButton onPress={prevImage} />
                  <NextButton onPress={nextImage} />
                  <View style={styles.imageIndicators}>
                    {allImages.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.imageIndicator,
                          index === currentImageIndex &&
                            styles.activeImageIndicator,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={[styles.productImage, styles.noImage]}>
              <Text>No Image Available</Text>
            </View>
          )}
        </View>

        {/* Product Information */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.productPrice}>{product.price}</Text>

          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{product.category}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{product.condition}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            <Text style={styles.sellerName}>
              {product.contact?.name || "Anonymous"}
            </Text>
            <Text style={styles.dateText}>
              Posted on: {formatDate(product.dateCreated)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Contact Actions */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.callButton} onPress={callSeller}>
          <PhoneIcon />
          <Text style={styles.buttonText}>Call Seller</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.messageButton} onPress={messageSeller}>
          <MessageIcon />
          <Text style={styles.buttonText}>Message</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  headerTitle: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  errorIcon: {
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#4C6A2E",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "500",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: width * 0.75, // Maintain aspect ratio
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  noImage: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  imageNavButton: {
    position: "absolute",
    top: "50%",
    right: 10,
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  prevButton: {
    left: 10,
    right: "auto",
  },
  imageIndicators: {
    position: "absolute",
    bottom: 15,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginHorizontal: 3,
  },
  activeImageIndicator: {
    backgroundColor: "#FFFFFF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  productInfo: {
    padding: 16,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4C6A2E",
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  badge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  actionContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  callButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#4C6A2E",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  messageButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FF9800",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 8,
  },
});
