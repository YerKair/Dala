import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AlertButton,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  pickImage,
  saveCategoryImage,
  getCategoryImage,
} from "../utils/CategoryManager";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CategoryImageManagerProps {
  storeId: string;
  categoryId: string;
  onImageUpdated?: () => void;
}

const CategoryImageManager: React.FC<CategoryImageManagerProps> = ({
  storeId,
  categoryId,
  onImageUpdated,
}) => {
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Load the image when showing the preview
  const showCategoryImage = async () => {
    try {
      setLoading(true);
      const uri = await getCategoryImage(storeId, categoryId);
      setImageUri(uri);
      setPreviewVisible(true);
    } catch (error) {
      console.error("Error loading image for preview:", error);
      Alert.alert("Ошибка", "Не удалось загрузить изображение");
    } finally {
      setLoading(false);
    }
  };

  // Pick and save a new image
  const pickCategoryImageAndSave = async () => {
    try {
      setLoading(true);
      const uri = await pickImage();

      if (uri) {
        // Save the image to AsyncStorage and server
        await saveCategoryImage(storeId, categoryId, uri);
        setImageUri(uri);

        if (onImageUpdated) {
          onImageUpdated();
        }

        Alert.alert("Успех", "Изображение категории обновлено");
      }
    } catch (error: any) {
      console.error("Error picking/saving image:", error);
      Alert.alert(
        "Ошибка",
        error.message || "Не удалось обновить изображение категории"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle the category image update
  const handleCategoryImageUpdate = () => {
    Alert.alert("Изображение категории", "Выберите действие:", [
      { text: "Отмена", style: "cancel" },
      { text: "Просмотреть", onPress: showCategoryImage },
      { text: "Загрузить новое", onPress: pickCategoryImageAndSave },
    ]);
  };

  return (
    <>
      {/* Image Management Button */}
      <TouchableOpacity
        style={styles.imageButton}
        onPress={handleCategoryImageUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="image" size={16} color="#fff" />
        )}
      </TouchableOpacity>

      {/* Image Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPreviewVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <Ionicons name="image-outline" size={60} color="#ccc" />
                <Text style={styles.noImageText}>Нет изображения</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.updateButton}
              onPress={pickCategoryImageAndSave}
            >
              <Text style={styles.updateButtonText}>Обновить изображение</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  imageButton: {
    width: 24,
    height: 24,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 5,
    top: 5,
    zIndex: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    height: "70%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  previewImage: {
    width: "100%",
    height: "80%",
    marginVertical: 20,
    borderRadius: 5,
  },
  noImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  updateButton: {
    backgroundColor: "#e41e3f",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default CategoryImageManager;
