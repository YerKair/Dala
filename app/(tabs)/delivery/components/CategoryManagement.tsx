import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, router } from "expo-router";

interface Category {
  id: number;
  name: string;
  image?: string | null;
  storeId?: string;
}

interface CategoryManagementProps {
  onCategorySelect?: (category: Category) => void;
  showHeader?: boolean;
  storeId?: string;
}

const API_BASE_URL = "http://192.168.0.117:8000/api";

// Ключи для AsyncStorage с учетом storeId
const getCategoriesKey = (storeId: string) => `stored_categories_${storeId}`;
const getCategoryImageKey = (storeId: string, categoryId: number) =>
  `category_image_${storeId}_${categoryId}`;

const CategoryManagement: React.FC<CategoryManagementProps> = ({
  onCategorySelect,
  showHeader = true,
  storeId: propStoreId,
}) => {
  const params = useLocalSearchParams();
  // Use storeId from props or from URL params
  const storeId = propStoreId || (params.storeId as string);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryImage, setCategoryImage] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (storeId) {
      loadCategories();
    } else {
      setError("Не указан ID ресторана");
    }
  }, [storeId]);

  const loadCategories = async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      setError(null);

      // Загружаем категории напрямую с сервера
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      console.log(`Загружаем категории с сервера...`);
      const response = await fetch(`${API_BASE_URL}/categories`, {
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
      console.log(`Загружено категорий с сервера:`, data.length);

      // Загружаем изображения для каждой категории из AsyncStorage
      const categoriesWithImages = await Promise.all(
        data.map(async (category: Category) => {
          const imageUri = await AsyncStorage.getItem(
            getCategoryImageKey(storeId, category.id)
          );
          return { ...category, image: imageUri || undefined, storeId };
        })
      );

      setCategories(categoriesWithImages);
    } catch (error) {
      console.error(`Ошибка загрузки категорий:`, error);
      setError("Не удалось загрузить категории с сервера");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, введите название категории");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", newCategoryName.trim());
      formData.append("store_id", storeId);

      if (categoryImage) {
        formData.append("image", {
          uri: categoryImage,
          type: "image/jpeg",
          name: "category.jpg",
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Category created successfully:", data);

      // Save image to local storage if exists
      if (categoryImage) {
        await AsyncStorage.setItem(
          getCategoryImageKey(storeId, data.id),
          categoryImage
        );
      }

      setModalVisible(false);
      setNewCategoryName("");
      setCategoryImage(null);

      // Navigate back with force refresh
      router.push({
        pathname: "/delivery/products/ProductsPage",
        params: {
          storeId: storeId,
          refresh: Date.now(),
          forceRefresh: "true",
        },
      });
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Ошибка", "Не удалось создать категорию");
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, введите название категории");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", newCategoryName.trim());
      formData.append("store_id", storeId);

      if (categoryImage) {
        formData.append("image", {
          uri: categoryImage,
          type: "image/jpeg",
          name: "category.jpg",
        } as any);
      }

      const response = await fetch(
        `${API_BASE_URL}/categories/${editingCategory.id}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Category updated successfully:", data);

      // Save image to local storage if exists
      if (categoryImage) {
        await AsyncStorage.setItem(
          getCategoryImageKey(storeId, data.id),
          categoryImage
        );
      }

      setModalVisible(false);
      setEditingCategory(null);
      setNewCategoryName("");
      setCategoryImage(null);

      // Navigate back with force refresh
      router.push({
        pathname: "/delivery/products/ProductsPage",
        params: {
          storeId: storeId,
          refresh: Date.now(),
          forceRefresh: "true",
        },
      });
    } catch (error) {
      console.error("Error updating category:", error);
      Alert.alert("Ошибка", "Не удалось обновить категорию");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: number) => {
    if (!storeId) {
      Alert.alert("Ошибка", "Не указан ID ресторана");
      return;
    }

    Alert.alert(
      "Подтверждение",
      "Вы уверены, что хотите удалить эту категорию?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              let token = await AsyncStorage.getItem("token");
              if (!token) {
                token = await AsyncStorage.getItem("userToken");
              }

              if (!token) {
                Alert.alert("Ошибка", "Вы не авторизованы");
                return;
              }

              // Пытаемся удалить категорию через API
              try {
                const response = await fetch(
                  `${API_BASE_URL}/categories/${categoryId}`,
                  {
                    method: "DELETE",
                    headers: {
                      Accept: "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                if (!response.ok) {
                  throw new Error("Не удалось удалить категорию");
                }
              } catch (apiError) {
                console.error("Ошибка API при удалении категории:", apiError);
                // Продолжаем с локальным удалением даже при ошибке API
              }

              // Удаляем изображение из AsyncStorage
              await AsyncStorage.removeItem(
                getCategoryImageKey(storeId, categoryId)
              );

              // Удаляем категорию из списка
              const updatedCategories = categories.filter(
                (cat) => cat.id !== categoryId
              );

              // Обновляем список в AsyncStorage
              await AsyncStorage.setItem(
                getCategoriesKey(storeId),
                JSON.stringify(updatedCategories)
              );

              // Обновляем состояние
              setCategories(updatedCategories);
              Alert.alert("Успех", "Категория удалена успешно");
            } catch (error) {
              console.error("Ошибка удаления категории:", error);
              Alert.alert("Ошибка", "Не удалось удалить категорию");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setCategoryImage(category.image || null);
    setModalVisible(true);
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setCategoryImage(null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Ошибка", "Необходимо разрешение на доступ к галерее");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      console.log("Выбрано изображение:", imageUri);
      setCategoryImage(imageUri);

      // Проверка, что изображение доступно
      try {
        const test = await Image.prefetch(imageUri);
        console.log("Предзагрузка изображения:", test ? "успешно" : "ошибка");
      } catch (e) {
        console.error("Ошибка проверки изображения:", e);
      }
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.categoryImagePlaceholder}>
            <Feather name="image" size={24} color="#CCC" />
          </View>
        )}
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Feather name="edit" size={18} color="#4A5D23" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteCategory(item.id)}
        >
          <Feather name="trash-2" size={18} color="#FF3B30" />
        </TouchableOpacity>
        {onCategorySelect && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onCategorySelect(item)}
          >
            <Feather name="check" size={18} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Управление категориями</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadCategories}
          >
            <Text style={styles.refreshButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={openCreateModal}
              disabled={loading}
            >
              <Feather name="plus" size={20} color="white" />
              <Text style={styles.addButtonText}>Добавить категорию</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#4A5D23"
              style={styles.loader}
            />
          ) : (
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Нет категорий</Text>
                  <Text style={styles.emptySubtext}>
                    Нажмите кнопку + чтобы добавить новую категорию
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Модальное окно для создания/редактирования категории */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategory ? "Редактировать категорию" : "Новая категория"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Название категории"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />

            {/* Добавляем компонент для выбора изображения */}
            <View style={styles.imagePickerContainer}>
              {categoryImage ? (
                <View style={styles.selectedImageContainer}>
                  <Image
                    source={{ uri: categoryImage }}
                    style={styles.selectedImage}
                  />
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={pickImage}
                  >
                    <Text style={styles.changeImageText}>Изменить</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={pickImage}
                >
                  <Feather name="image" size={24} color="#4A5D23" />
                  <Text style={styles.imagePickerText}>
                    Выбрать изображение
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingCategory ? updateCategory : createCategory}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingCategory ? "Обновить" : "Создать"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  actionsContainer: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  addButton: {
    backgroundColor: "#4A5D23",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 8,
  },
  loader: {
    marginTop: 20,
  },
  list: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  categoryName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  categoryActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#999",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#4A5D23",
    marginLeft: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEEEE",
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: "#FF3B30",
    marginLeft: 8,
  },
  refreshButton: {
    backgroundColor: "#2E86C1",
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
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
    marginBottom: 16,
  },
  selectedImage: {
    width: "100%",
    height: 150,
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
});

export default CategoryManagement;
