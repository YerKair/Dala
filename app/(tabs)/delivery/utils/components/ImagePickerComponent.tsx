import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  pickImage,
  takePicture,
  saveStoreImage,
  saveProductImage,
  getStoreImage,
  getProductImage,
  deleteStoreImage,
  deleteProductImage,
} from "../imageHelper";

interface ImagePickerComponentProps {
  entityId: string;
  entityType: "store" | "product";
  onImageSelected?: (imageUri: string) => void;
  onImageRemoved?: () => void;
  defaultImage?: string | null;
  allowMultiple?: boolean;
  style?: any;
}

const ImagePickerComponent: React.FC<ImagePickerComponentProps> = ({
  entityId,
  entityType,
  onImageSelected,
  onImageRemoved,
  defaultImage,
  allowMultiple = false,
  style,
}) => {
  const [image, setImage] = useState<string | null>(defaultImage || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Load existing image on component mount
  useEffect(() => {
    const loadImage = async () => {
      setLoading(true);
      try {
        // Get image based on entity type
        const savedImage =
          entityType === "store"
            ? await getStoreImage(entityId)
            : await getProductImage(entityId);

        if (savedImage) {
          setImage(savedImage);
        } else if (defaultImage) {
          setImage(defaultImage);
        }
      } catch (error) {
        console.error(`Error loading ${entityType} image:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [entityId, entityType, defaultImage]);

  // Handle picking image from gallery
  const handlePickImage = async () => {
    console.log("[DEBUG] Нажата кнопка выбора изображения из галереи");
    setModalVisible(false);
    setLoading(true);
    try {
      console.log("[DEBUG] Вызываем функцию pickImage()");
      const result = await pickImage();
      console.log(
        "[DEBUG] Результат pickImage:",
        result ? "Получено изображение" : "Нет изображения"
      );

      if (result) {
        setImage(result);
        console.log("[DEBUG] Изображение установлено в состояние компонента");

        // Save image based on entity type
        console.log(
          "[DEBUG] Сохраняем изображение для",
          entityType,
          "с ID:",
          entityId
        );
        try {
          if (entityType === "store") {
            await saveStoreImage(entityId, result);
          } else {
            await saveProductImage(entityId, result);
          }
          console.log("[DEBUG] Изображение успешно сохранено");
        } catch (saveError) {
          console.error("[DEBUG] Ошибка сохранения изображения:", saveError);
        }

        console.log("[DEBUG] Вызываем обратный вызов onImageSelected");
        if (onImageSelected) {
          onImageSelected(result);
          console.log("[DEBUG] Обратный вызов onImageSelected выполнен");
        } else {
          console.log("[DEBUG] onImageSelected не определен");
        }
      } else {
        console.log("[DEBUG] pickImage вернул null");
      }
    } catch (error) {
      console.error("[DEBUG] Ошибка выбора изображения:", error);
      Alert.alert("Ошибка", "Не удалось выбрать изображение");
    } finally {
      setLoading(false);
    }
  };

  // Handle taking a photo with camera
  const handleTakePicture = async () => {
    console.log("[DEBUG] Нажата кнопка создания фото");
    setModalVisible(false);
    setLoading(true);
    try {
      console.log("[DEBUG] Вызываем функцию takePicture()");
      const result = await takePicture();
      console.log(
        "[DEBUG] Результат takePicture:",
        result ? "Получено фото" : "Нет фото"
      );

      if (result) {
        setImage(result);
        console.log("[DEBUG] Фото установлено в состояние компонента");

        // Save image based on entity type
        console.log(
          "[DEBUG] Сохраняем фото для",
          entityType,
          "с ID:",
          entityId
        );
        try {
          if (entityType === "store") {
            await saveStoreImage(entityId, result);
          } else {
            await saveProductImage(entityId, result);
          }
          console.log("[DEBUG] Фото успешно сохранено");
        } catch (saveError) {
          console.error("[DEBUG] Ошибка сохранения фото:", saveError);
        }

        // Notify parent component
        console.log("[DEBUG] Вызываем обратный вызов onImageSelected");
        if (onImageSelected) {
          onImageSelected(result);
          console.log("[DEBUG] Обратный вызов onImageSelected выполнен");
        } else {
          console.log("[DEBUG] onImageSelected не определен");
        }
      } else {
        console.log("[DEBUG] takePicture вернул null");
      }
    } catch (error) {
      console.error("[DEBUG] Ошибка создания фото:", error);
      Alert.alert("Ошибка", "Не удалось сделать фото");
    } finally {
      setLoading(false);
    }
  };

  // Handle removing image
  const handleRemoveImage = async () => {
    setModalVisible(false);
    try {
      // Delete image based on entity type
      if (entityType === "store") {
        await deleteStoreImage(entityId);
      } else {
        await deleteProductImage(entityId);
      }
      setImage(null);
      // Notify parent component
      onImageRemoved?.();
    } catch (error) {
      console.error("Error removing image:", error);
      Alert.alert("Ошибка", "Не удалось удалить изображение");
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => setModalVisible(true)}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : image ? (
          <>
            <Image
              source={{ uri: image }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.editIconContainer}>
              <Ionicons name="pencil" size={20} color="#fff" />
            </View>
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="image-outline" size={40} color="#666" />
            <Text style={styles.placeholderText}>
              {entityType === "store" ? "Добавить логотип" : "Добавить фото"}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите действие</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handlePickImage}
            >
              <Ionicons name="images-outline" size={24} color="#333" />
              <Text style={styles.modalOptionText}>Выбрать из галереи</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleTakePicture}
            >
              <Ionicons name="camera-outline" size={24} color="#333" />
              <Text style={styles.modalOptionText}>Сделать фото</Text>
            </TouchableOpacity>

            {image && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleRemoveImage}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={24}
                  color="#FF3B30"
                />
                <Text style={[styles.modalOptionText, { color: "#FF3B30" }]}>
                  Удалить изображение
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 30,
    height: 30,
    borderTopLeftRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 15,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
});

export default ImagePickerComponent;
