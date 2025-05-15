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
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { useApi } from "./utils/apiService";
import {
  getCategoryImage,
  saveCategoryImage,
  pickImage,
  takePicture,
} from "./utils/CategoryManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStoreImage } from "./utils/helpers";
import CategoryImageManager from "./components/CategoryImageManager";

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
  category_id: string;
  images?: string;
  seller_id?: string;
}

export default function StoreDetailsPage() {
  const params = useLocalSearchParams();
  const { storeId } = params;
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const { user } = useAuth();
  const api = useApi();

  // State for category creation modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add these states for image preview modal
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageURI, setPreviewImageURI] = useState<string | null>(null);

  useEffect(() => {
    loadStoreDetails();
  }, [storeId]);

  const loadStoreDetails = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Fetch store information
      const storeResponse = await api.getStore(storeId as string);
      setStoreInfo(storeResponse);

      // Load store image from local storage
      const storeImageUri = await getStoreImage(storeId as string);
      setStoreImage(storeImageUri);

      // Fetch categories
      const categoriesResponse = await api.getCategories();
      const storeCategories = categoriesResponse.map((category: any) => ({
        ...category,
        store_id: storeId as string,
        id: category.id.toString(), // Convert number to string if needed
      }));

      // Load category images from CategoryManager
      const enhancedCategories = await Promise.all(
        storeCategories.map(async (category: any) => {
          const image = await getCategoryImage(storeId as string, category.id);
          return {
            ...category,
            image: image || undefined,
          };
        })
      );

      setCategories(enhancedCategories);

      // Fetch products for this store
      const actualStoreId =
        typeof storeId === "string"
          ? storeId
          : Array.isArray(storeId)
          ? storeId[0]
          : "";
      const productsResponse = await api.getProducts(1, "", actualStoreId);
      setProducts(productsResponse.data || []);

      // Set first category as selected by default
      if (enhancedCategories.length > 0) {
        setSelectedCategory(enhancedCategories[0].id);
      }
    } catch (error) {
      console.error("Error loading store details:", error);
      setErrorMessage(
        "Error getting product image: TypeError: product images cannot be null"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: "/(tabs)/delivery/products/ProductDetail",
      params: { productId: product.id },
    });
  };

  const handleCategoryImageUpdate = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    // Показываем диалог выбора опций
    Alert.alert(
      "Управление изображением категории",
      "Выберите действие",
      [
        {
          text: "Просмотреть изображение",
          onPress: () => {
            if (category.image) {
              setPreviewImageURI(category.image);
              setImagePreviewVisible(true);
            } else {
              Alert.alert("Информация", "У категории отсутствует изображение");
            }
          },
        },
        {
          text: "Загрузить новое изображение",
          onPress: async () => {
            try {
              const image = await pickImage();
              if (image) {
                await saveCategoryImage(storeId as string, categoryId, image);

                // Обновляем категорию с новым изображением
                const updatedCategories = categories.map((c) =>
                  c.id === categoryId ? { ...c, image } : c
                );
                setCategories(updatedCategories);

                Alert.alert("Успех", "Изображение категории обновлено");
              }
            } catch (error) {
              console.error("Error updating category image:", error);
              Alert.alert("Ошибка", "Не удалось обновить изображение");
            }
          },
        },
        {
          text: "Отмена",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const navigateToCategoryManagement = () => {
    router.push({
      pathname: "/(tabs)/delivery/categories/CategoryManagement",
      params: { storeId: storeId as string },
    });
  };

  const handleAddProduct = () => {
    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category first");
      return;
    }

    router.push({
      pathname: "/(tabs)/delivery/products/ProductCreation",
      params: {
        storeId: storeId as string,
        categoryId: selectedCategory,
      },
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    setCreatingCategory(true);
    try {
      // Create FormData for multipart request
      const formData = new FormData();
      formData.append("name", newCategoryName.trim());
      formData.append("store_id", storeId as string);

      // Add image if selected
      if (newCategoryImage) {
        formData.append("image", {
          uri: newCategoryImage,
          type: "image/jpeg",
          name: "category.jpg",
        } as any);
      }

      // Get auth token
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      // Send request to create category
      const response = await fetch(`http://192.168.0.113:8000/api/categories`, {
        method: "POST",
        headers: token
          ? {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            }
          : {
              Accept: "application/json",
            },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to create category: ${response.status}`);
      }

      const data = await response.json();

      // Save image locally for faster loading
      if (newCategoryImage) {
        await saveCategoryImage(
          storeId as string,
          data.id.toString(),
          newCategoryImage
        );
      }

      // Reset form and close modal
      setModalVisible(false);
      setNewCategoryName("");
      setNewCategoryImage(null);

      // Reload data
      loadStoreDetails();
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Error", "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handlePickCategoryImage = async () => {
    try {
      const image = await pickImage();
      if (image) {
        setNewCategoryImage(image);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleViewAllProducts = () => {
    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category first");
      return;
    }

    router.push({
      pathname: "/(tabs)/delivery/products/ProductsPage",
      params: {
        storeId: storeId as string,
        categoryId: selectedCategory,
      },
    });
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);

    // Navigate to products page for this category
    router.push({
      pathname: "/(tabs)/delivery/products/ProductsPage",
      params: {
        storeId: storeId as string,
        categoryId: categoryId,
      },
    });
  };

  // Filter products by selected category
  const filteredProducts = products.filter(
    (product) => product.category_id === selectedCategory
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Red header banner with store name */}
      <View style={styles.redBanner}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.bannerTitle}>
          {storeInfo ? storeInfo.name : "Пиццерия Mario"}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Main content */}
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A5D23" />
          </View>
        ) : (
          <View style={styles.content}>
            {/* Store image banner */}
            {storeImage && (
              <View style={styles.storeBannerContainer}>
                <Image
                  source={{ uri: storeImage }}
                  style={styles.storeBannerImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Store info section */}
            <View style={styles.storeInfoContainer}>
              <View style={styles.storeInfoRow}>
                <Ionicons name="star" size={22} color="black" />
                <Text style={styles.storeInfoText}>
                  {storeInfo?.rating || "8.8"}
                </Text>
                <View style={styles.storeInfoSeparator} />
                <Ionicons name="time-outline" size={22} color="black" />
                <Text style={styles.storeInfoText}>
                  Opens at {storeInfo?.opening_hours || "09:00"}
                </Text>
              </View>
              <View style={styles.minOrderContainer}>
                <Text style={styles.minOrderText}>
                  Minimum order amount: {storeInfo?.minimum_order || "2,500 ₸"}
                </Text>
              </View>

              {/* CategoryManagement Link */}
              {user && user.role === "admin" && (
                <TouchableOpacity
                  style={styles.manageCategoriesButton}
                  onPress={navigateToCategoryManagement}
                >
                  <Ionicons name="grid-outline" size={20} color="#4A5D23" />
                  <Text style={styles.manageCategoriesText}>
                    Manage Categories
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Categories header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              {user && user.role === "admin" && (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color="#4A5D23"
                    />
                    <Text style={styles.addButtonText}>Add Category</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Categories grid */}
            <FlatList
              data={categories}
              numColumns={2}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryCard,
                    selectedCategory === item.id && styles.selectedCategory,
                  ]}
                  onPress={() => handleCategoryPress(item.id)}
                >
                  <View style={styles.categoryImageContainer}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.categoryImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.categoryImagePlaceholder}>
                        <Ionicons name="image-outline" size={30} color="#999" />
                      </View>
                    )}

                    {/* Кнопка редактирования изображения */}
                    {user && user.role === "admin" && (
                      <TouchableOpacity
                        style={styles.imageEditOverlay}
                        onPress={() => handleCategoryImageUpdate(item.id)}
                      >
                        <Ionicons name="camera" size={22} color="white" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.categoryName,
                      selectedCategory === item.id &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.categoriesGrid}
              ListFooterComponent={
                <View style={styles.productsList}>
                  <View style={styles.productsSectionHeader}>
                    <Text style={styles.productsSectionTitle}>Products</Text>
                    <View style={styles.productsHeaderActions}>
                      {user && user.role === "admin" && selectedCategory && (
                        <TouchableOpacity
                          style={[styles.addButton, { marginRight: 16 }]}
                          onPress={handleAddProduct}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color="#4A5D23"
                          />
                          <Text style={styles.addButtonText}>Add Product</Text>
                        </TouchableOpacity>
                      )}
                      {selectedCategory && filteredProducts.length > 0 && (
                        <TouchableOpacity onPress={handleViewAllProducts}>
                          <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {filteredProducts.length === 0 ? (
                    <Text style={styles.noProductsText}>
                      No products in this category
                    </Text>
                  ) : (
                    filteredProducts
                      .slice(0, 4) // Show only first 4 products
                      .map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.productItem}
                          onPress={() => handleProductPress(item)}
                        >
                          {item.images ? (
                            <Image
                              source={{ uri: item.images }}
                              style={styles.productImage}
                            />
                          ) : (
                            <View style={styles.productImagePlaceholder}>
                              <Ionicons
                                name="image-outline"
                                size={24}
                                color="#999"
                              />
                            </View>
                          )}
                          <View style={styles.productInfo}>
                            <Text style={styles.productName}>{item.title}</Text>
                            <Text style={styles.productPrice}>
                              {item.price} ₸
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                  )}

                  {filteredProducts.length > 4 && (
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={handleViewAllProducts}
                    >
                      <Text style={styles.viewMoreButtonText}>
                        View More Products
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#4A5D23"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* Error Message */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={24} color="white" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Category Creation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Category</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Category Name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />

            <TouchableOpacity
              style={styles.imagePicker}
              onPress={handlePickCategoryImage}
            >
              {newCategoryImage ? (
                <Image
                  source={{ uri: newCategoryImage }}
                  style={styles.pickedImage}
                />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#999" />
                  <Text style={styles.imagePickerText}>Choose Image</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateCategory}
              disabled={creatingCategory}
            >
              {creatingCategory ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Category</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imagePreviewVisible}
        onRequestClose={() => setImagePreviewVisible(false)}
      >
        <View style={styles.imagePreviewOverlay}>
          <View style={styles.imagePreviewContainer}>
            {previewImageURI && (
              <Image
                source={{ uri: previewImageURI }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closePreviewButton}
              onPress={() => setImagePreviewVisible(false)}
            >
              <Ionicons name="close-circle" size={36} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  redBanner: {
    backgroundColor: "red",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Store banner image
  storeBannerContainer: {
    width: "100%",
    height: 180,
    marginBottom: 0,
  },
  storeBannerImage: {
    width: "100%",
    height: "100%",
  },
  storeInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  storeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeInfoText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  storeInfoSeparator: {
    width: 1,
    height: 16,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 12,
  },
  minOrderContainer: {
    backgroundColor: "#EEEEEE",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  minOrderText: {
    fontSize: 14,
    color: "#333",
  },
  manageCategoriesButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 8,
    alignSelf: "flex-start",
  },
  manageCategoriesText: {
    color: "#4A5D23",
    fontWeight: "600",
    marginLeft: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  actionButtonsContainer: {
    flexDirection: "row",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButtonText: {
    color: "#4A5D23",
    marginLeft: 4,
    fontWeight: "500",
  },
  categoriesGrid: {
    padding: 8,
  },
  categoryCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "white",
    height: 170, // Fixed height to match design
  },
  categoryImageContainer: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  imageEditOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBottomSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryName: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
  selectedCategory: {
    borderColor: "#4A5D23",
    backgroundColor: "rgba(74, 93, 35, 0.1)",
  },
  selectedCategoryText: {
    color: "#4A5D23",
  },
  productsList: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  productsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  productsSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  productsHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    color: "#4A5D23",
    fontWeight: "500",
  },
  noProductsText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    padding: 20,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    marginBottom: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 10,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 4,
    backgroundColor: "#F5F5F5",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: "#666",
  },
  viewMoreButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  viewMoreButtonText: {
    color: "#4A5D23",
    fontWeight: "500",
    marginRight: 4,
  },
  errorBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#333333",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
  },
  errorText: {
    color: "white",
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  imagePicker: {
    width: "100%",
    height: 150,
    marginBottom: 20,
    borderRadius: 8,
    overflow: "hidden",
  },
  imagePickerPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  imagePickerText: {
    marginTop: 8,
    color: "#666",
  },
  pickedImage: {
    width: "100%",
    height: "100%",
  },
  submitButton: {
    backgroundColor: "#4A5D23",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  // Image Preview Modal styles
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewContainer: {
    width: "100%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "90%",
    height: "90%",
    borderRadius: 12,
  },
  closePreviewButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
});
