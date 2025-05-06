// /(tabs)/marketplace/AdminPage.tsx
import React, { useState, useEffect } from "react";
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
import { router } from "expo-router";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pickImage, saveStoreImage, getStoreImage } from "./utils/imageHelper";
import { useAuth } from "../../auth/AuthContext"; // Import the auth context

// Store interface
interface Store {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  isPopular: boolean;
  isRecommended: boolean;
  latitude?: string;
  longitude?: string;
  image_path?: string;
}

// Define props interface for StoreItem
interface StoreItemProps {
  item: Store;
  onEdit: (store: Store) => void;
  onDelete: (id: string) => void;
}

// Extract StoreItem as a separate component
const StoreItem = ({ item, onEdit, onDelete }: StoreItemProps) => {
  const [itemImage, setItemImage] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        console.log(`[DEBUG] Загрузка изображения для ресторана ${item.id}`);
        // Сначала пробуем загрузить из локального хранилища
        const localImage = await getStoreImage(item.id);

        if (localImage) {
          console.log(`[DEBUG] Найдено локальное изображение для ${item.id}`);
          setItemImage(localImage);
          return;
        }

        // Если нет в локальном хранилище, пробуем использовать путь с сервера
        if (item.image_path) {
          console.log(
            `[DEBUG] Используем серверное изображение для ${item.id}: ${item.image_path}`
          );

          // Проверяем, полный ли это URL или относительный путь
          const imageUrl = item.image_path.startsWith("http")
            ? item.image_path
            : `http://192.168.0.117:8000${item.image_path}`; // Добавляем домен, если путь относительный

          setItemImage(imageUrl);

          // Сохраняем URL в локальное хранилище для будущего использования
          saveStoreImage(item.id, imageUrl).then(() => {
            console.log(
              `[DEBUG] Серверное изображение сохранено локально для ${item.id}`
            );
          });
        } else {
          console.log(
            `[DEBUG] Изображение не найдено для ресторана ${item.id}`
          );
        }
      } catch (error) {
        console.error(
          `[DEBUG] Ошибка при загрузке изображения для ${item.id}:`,
          error
        );
      }
    };

    loadImage();
  }, [item.id, item.image_path]);

  return (
    <View style={styles.storeItem}>
      {itemImage ? (
        <Image
          source={{ uri: itemImage }}
          style={styles.storeItemImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.storeItemImagePlaceholder}>
          <Feather name="image" size={24} color="#CCC" />
        </View>
      )}
      <View style={styles.storeInfo}>
        <Text style={styles.storeName}>{item.name}</Text>
        <Text style={styles.storeDescription}>{item.description}</Text>
        <Text style={styles.storeCategory}>Category: {item.category}</Text>
        {item.address && (
          <Text style={styles.storeAddress}>Address: {item.address}</Text>
        )}
        <View style={styles.tagContainer}>
          {item.isPopular && (
            <View style={styles.popularTag}>
              <Text style={styles.tagText}>Popular</Text>
            </View>
          )}
          {item.isRecommended && (
            <View style={styles.recommendedTag}>
              <Text style={styles.tagText}>Recommended</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.storeActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(item)}
        >
          <Feather name="edit" size={18} color="#4A5D23" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <Feather name="trash-2" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function AdminPage() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth(); // Use the auth context to get the user
  const [stores, setStores] = useState<Store[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Courier delivery");
  const [address, setAddress] = useState("");
  const [isPopular, setIsPopular] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [latitude, setLatitude] = useState("55.7558"); // Default latitude
  const [longitude, setLongitude] = useState("37.6173"); // Default longitude

  // Categories
  const categories = [
    "Courier delivery",
    "Supermarkets",
    "Flowers",
    "Pharmacy",
  ];

  // Load stores from storage on component mount
  useEffect(() => {
    loadStores();
  }, []);

  // Load stores from storage and API
  const loadStores = async () => {
    try {
      setIsSubmitting(true);

      // First load from local storage for immediate display
      const storedStores = await AsyncStorage.getItem("deliveryStores");
      if (storedStores) {
        setStores(JSON.parse(storedStores));
      }

      // Then try to fetch from API
      // Get token from AsyncStorage - check both possible keys
      let token = await AsyncStorage.getItem("token");

      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        console.log("No authentication token found, skipping API fetch");
        return;
      }

      console.log("Fetching stores from API...");

      const response = await fetch(
        "http://192.168.0.117:8000/api/restaurants",
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        const responseText = await response.text();
        console.log("Fetch response error:", responseText);
        return; // Continue with local data if API fails
      }

      const data = await response.json();
      console.log("Fetched stores:", data);

      // Transform API data to match our component's format
      if (Array.isArray(data)) {
        const apiStores = data.map((item) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description,
          category: item.category || "Courier delivery",
          address: item.address || "",
          isPopular: item.isPopular || false,
          isRecommended: item.isRecommended || false,
          latitude: item.latitude || "55.7558",
          longitude: item.longitude || "37.6173",
          image_path: item.image_path,
        }));

        setStores(apiStores);
        // Also update local storage
        await saveStores(apiStores);
      }
    } catch (error) {
      console.error("Failed to load stores:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save stores to AsyncStorage
  const saveStores = async (updatedStores: Store[]) => {
    try {
      await AsyncStorage.setItem(
        "deliveryStores",
        JSON.stringify(updatedStores)
      );
    } catch (error) {
      console.error("Failed to save stores:", error);
      Alert.alert("Error", "Failed to save stores");
    }
  };

  // Go back to delivery page
  const goBack = () => {
    router.push("/(tabs)/delivery/DeliverPage");
  };

  // Handle image picking
  const handlePickImage = async () => {
    const imageUri = await pickImage();
    if (imageUri) {
      setStoreImage(imageUri);
    }
  };

  // Open modal to add new store
  const openAddStoreModal = () => {
    setEditingStore(null);
    setName("");
    setDescription("");
    setCategory("Courier delivery");
    setAddress("");
    setIsPopular(false);
    setIsRecommended(false);
    setStoreImage(null);
    setLatitude("55.7558");
    setLongitude("37.6173");
    setModalVisible(true);
  };

  // Open modal to edit existing store
  const openEditStoreModal = async (store: Store) => {
    setEditingStore(store);
    setName(store.name);
    setDescription(store.description);
    setCategory(store.category);
    setAddress(store.address);
    setIsPopular(store.isPopular);
    setIsRecommended(store.isRecommended);
    setLatitude(store.latitude || "55.7558");
    setLongitude(store.longitude || "37.6173");

    // Load the store image
    const imageUri = await getStoreImage(store.id);
    setStoreImage(imageUri);

    setModalVisible(true);
  };

  // Save store (add new or update existing)
  const saveStore = async () => {
    if (!name || !description || !category) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все обязательные поля");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get token from AsyncStorage - check both possible keys
      let token = await AsyncStorage.getItem("token");

      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        Alert.alert(
          "Ошибка авторизации",
          "Токен авторизации не найден. Пожалуйста, войдите в систему снова.",
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

      console.log("Using token:", token.substring(0, 10) + "...");

      let imagePath = null;
      if (storeImage) {
        // Check if this is already a server URL and not a local image
        if (
          storeImage.startsWith("http") &&
          storeImage.includes("192.168.0.117:8000")
        ) {
          console.log(
            "[DEBUG] Используем существующий URL сервера:",
            storeImage
          );
          // Extract the path from the URL
          imagePath = storeImage.replace("http://192.168.0.117:8000", "");
        } else {
          // Try to upload the image to server
          try {
            const formData = new FormData();
            const filename = storeImage.split("/").pop();
            const match = /\.(\w+)$/.exec(filename || "");
            const type = match ? `image/${match[1]}` : "image";

            formData.append("image", {
              uri: storeImage,
              name: filename,
              type,
            } as any);

            console.log(
              "Uploading image with token:",
              token.substring(0, 10) + "..."
            );

            const imageResponse = await fetch(
              "http://192.168.0.117:8000/api/upload-image",
              {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              }
            );

            console.log("Image upload response status:", imageResponse.status);

            if (imageResponse.ok) {
              const imageResult = await imageResponse.json();
              imagePath = imageResult.path;
              console.log("Image uploaded successfully:", imagePath);
            } else {
              const errorText = await imageResponse.text();
              console.log("Image upload failed:", errorText);

              // Если ошибка авторизации, предложим пользователю войти снова
              if (
                imageResponse.status === 401 ||
                imageResponse.status === 403
              ) {
                Alert.alert(
                  "Ошибка авторизации",
                  "Срок действия вашей сессии истек. Пожалуйста, войдите снова.",
                  [
                    {
                      text: "Войти",
                      onPress: () => router.push("/auth/login"),
                    },
                    {
                      text: "Продолжить без изображения",
                      onPress: () => console.log("Continuing without image"),
                    },
                  ]
                );
              }

              console.log("Continuing with local storage only");
            }
          } catch (imageError) {
            console.error("Error uploading image:", imageError);
            // Continue with store save even if image upload fails
          }
        }
      }

      // Prepare data for API
      const storeData = {
        name,
        description,
        category,
        address,
        latitude,
        longitude,
        isPopular,
        isRecommended,
        user_id: user?.id || 2, // Use authenticated user ID or default to 2
        image_path: imagePath, // Add image path to the data
      };

      console.log(
        "Sending data to server:",
        JSON.stringify(storeData, null, 2)
      );

      // Different logic for create vs update
      let apiUrl = "http://192.168.0.117:8000/api/restaurants";
      let method = "POST";

      if (editingStore) {
        apiUrl = `http://192.168.0.117:8000/api/restaurants/${editingStore.id}`;
        method = "PUT";
      }

      // Send to API
      const response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(storeData),
      });

      console.log("Response status:", response.status);

      const responseText = await response.text();
      console.log("Response body:", responseText);

      if (!response.ok) {
        // Проверяем код ошибки
        if (response.status === 401 || response.status === 403) {
          // Токен недействителен или истек срок действия
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("userToken");

          Alert.alert(
            "Ошибка авторизации",
            "Ваша сессия истекла. Пожалуйста, войдите в систему снова.",
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
          throw new Error("Сессия истекла");
        }

        let errorMessage = "Failed to save store";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If parsing fails, use the response text
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log("API response:", result);
      } catch (e) {
        console.log("Response is not JSON, using text response");
        result = { message: responseText };
      }

      // Local handling
      let updatedStores: Store[];
      let storeId: string;

      if (editingStore) {
        // Update existing store locally
        storeId = editingStore.id;
        updatedStores = stores.map((store) =>
          store.id === editingStore.id
            ? {
                ...store,
                name,
                description,
                category,
                address,
                isPopular,
                isRecommended,
                latitude,
                longitude,
                image_path: imagePath || store.image_path,
              }
            : store
        );
      } else {
        // Add new store locally with ID from API response
        storeId = result.id ? result.id.toString() : Date.now().toString();
        const newStore: Store = {
          id: storeId,
          name,
          description,
          category,
          address,
          isPopular,
          isRecommended,
          latitude,
          longitude,
          image_path: imagePath,
        };
        updatedStores = [...stores, newStore];
      }

      // Update local state
      setStores(updatedStores);
      await saveStores(updatedStores);

      // Save the image if one was selected
      if (storeImage) {
        await saveStoreImage(storeId, storeImage);
      }

      setModalVisible(false);

      // Show success message
      Alert.alert(
        "Success",
        editingStore
          ? "Store updated successfully"
          : "Store added successfully",
        [
          {
            text: "OK",
          },
        ]
      );
    } catch (error: any) {
      console.error("Error saving store:", error);
      const errorMessage = error.message || "Unknown error occurred";
      Alert.alert("Error", `Failed to save store: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete store
  const deleteStore = (id: string) => {
    Alert.alert("Delete Store", "Are you sure you want to delete this store?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSubmitting(true);

            // Get token from AsyncStorage - check both possible keys
            let token = await AsyncStorage.getItem("token");

            if (!token) {
              token = await AsyncStorage.getItem("userToken");
            }

            if (!token) {
              throw new Error("Authentication token not found");
            }

            console.log(`Deleting store with ID: ${id}`);

            // Call API to delete
            const response = await fetch(
              `http://192.168.0.117:8000/api/restaurants/${id}`,
              {
                method: "DELETE",
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            console.log("Delete response status:", response.status);

            const responseText = await response.text();
            console.log("Delete response body:", responseText);

            if (!response.ok) {
              let errorMessage = "Failed to delete store";
              try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorMessage;
              } catch (e) {
                // If parsing fails, use the response text
                errorMessage = responseText || errorMessage;
              }
              throw new Error(errorMessage);
            }

            // Update local state
            const updatedStores = stores.filter((store) => store.id !== id);
            setStores(updatedStores);
            saveStores(updatedStores);

            Alert.alert("Success", "Store deleted successfully");
          } catch (error: any) {
            console.error("Error deleting store:", error);
            const errorMessage = error.message || "Unknown error occurred";
            Alert.alert("Error", `Failed to delete store: ${errorMessage}`);
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.adminHeader}>
          <Text style={styles.adminTitle}>Manage Delivery Stores</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddStoreModal}
            disabled={isSubmitting}
          >
            <Feather name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {isSubmitting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4A5D23" />
          </View>
        )}

        {stores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="store" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>No stores added yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first store
            </Text>
          </View>
        ) : (
          <FlatList
            data={stores}
            renderItem={({ item }) => (
              <StoreItem
                item={item}
                onEdit={openEditStoreModal}
                onDelete={deleteStore}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.storeList}
          />
        )}
      </View>

      {/* Add/Edit Store Modal */}
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
                {editingStore ? "Edit Store" : "Add New Store"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                disabled={isSubmitting}
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.inputLabel}>Store Name *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter store name"
                editable={!isSubmitting}
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter store description"
                multiline
                numberOfLines={4}
                editable={!isSubmitting}
              />

              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.categoryButtonSelected,
                    ]}
                    onPress={() => setCategory(cat)}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Address (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter store address"
                editable={!isSubmitting}
              />

              <View style={styles.locationContainer}>
                <View style={styles.locationField}>
                  <Text style={styles.inputLabel}>Latitude</Text>
                  <TextInput
                    style={styles.textInput}
                    value={latitude}
                    onChangeText={setLatitude}
                    placeholder="Latitude"
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
                <View style={styles.locationField}>
                  <Text style={styles.inputLabel}>Longitude</Text>
                  <TextInput
                    style={styles.textInput}
                    value={longitude}
                    onChangeText={setLongitude}
                    placeholder="Longitude"
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Store Image</Text>
              <View style={styles.imagePickerContainer}>
                {storeImage ? (
                  <View style={styles.selectedImageContainer}>
                    <Image
                      source={{ uri: storeImage }}
                      style={styles.selectedImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={handlePickImage}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.changeImageText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePicker}
                    onPress={handlePickImage}
                    disabled={isSubmitting}
                  >
                    <Feather name="image" size={24} color="#4A5D23" />
                    <Text style={styles.imagePickerText}>Pick an image</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setIsPopular(!isPopular)}
                  disabled={isSubmitting}
                >
                  <View
                    style={[
                      styles.checkboxSquare,
                      isPopular && styles.checkboxSquareSelected,
                    ]}
                  >
                    {isPopular && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Mark as Popular</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setIsRecommended(!isRecommended)}
                  disabled={isSubmitting}
                >
                  <View
                    style={[
                      styles.checkboxSquare,
                      isRecommended && styles.checkboxSquareSelected,
                    ]}
                  >
                    {isRecommended && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Mark as Recommended</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSubmitting && styles.disabledButton,
                ]}
                onPress={saveStore}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingStore ? "Update Store" : "Add Store"}
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

const styles = StyleSheet.create({
  disabledButton: {
    opacity: 0.7,
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  locationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  locationField: {
    width: "48%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontWeight: "600",
    fontSize: 22,
    color: "#000000",
  },
  headerRight: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  adminHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  adminTitle: {
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
  storeList: {
    paddingBottom: 20,
  },
  storeItem: {
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
  storeItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  storeItemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  storeDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  storeCategory: {
    fontSize: 14,
    color: "#4A5D23",
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  popularTag: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  recommendedTag: {
    backgroundColor: "#4A5D23",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  storeActions: {
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
  textInput: {
    backgroundColor: "#F5F5F5",
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
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkboxSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSquareSelected: {
    backgroundColor: "#4A5D23",
    borderColor: "#4A5D23",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#444",
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
});
