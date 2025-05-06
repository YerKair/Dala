import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  pickImage,
  takePicture,
  saveProductGallery,
  getProductGallery,
} from "../imageHelper";

interface ImageGalleryProps {
  productId: string;
  maxImages?: number;
  onChange?: (images: string[]) => void;
  readonly?: boolean;
}

const { width } = Dimensions.get("window");
const imageSize = (width - 60) / 3;

const ImageGallery: React.FC<ImageGalleryProps> = ({
  productId,
  maxImages = 5,
  onChange,
  readonly = false,
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Загрузка существующих изображений при монтировании компонента
  useEffect(() => {
    loadImages();
  }, [productId]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const galleryImages = await getProductGallery(productId);
      setImages(galleryImages);
    } catch (error) {
      console.error("Error loading gallery images:", error);
    } finally {
      setLoading(false);
    }
  };

  // Добавление изображения из галереи
  const handleAddImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert(
        "Лимит",
        `Вы можете добавить максимум ${maxImages} изображений`
      );
      return;
    }

    setModalVisible(false);
    setLoading(true);

    try {
      const result = await pickImage();
      if (result) {
        const newImages = [...images, result];
        setImages(newImages);
        await saveProductGallery(productId, newImages);
        onChange?.(newImages);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Ошибка", "Не удалось выбрать изображение");
    } finally {
      setLoading(false);
    }
  };

  // Добавление изображения с камеры
  const handleTakePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert(
        "Лимит",
        `Вы можете добавить максимум ${maxImages} изображений`
      );
      return;
    }

    setModalVisible(false);
    setLoading(true);

    try {
      const result = await takePicture();
      if (result) {
        const newImages = [...images, result];
        setImages(newImages);
        await saveProductGallery(productId, newImages);
        onChange?.(newImages);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Ошибка", "Не удалось сделать фото");
    } finally {
      setLoading(false);
    }
  };

  // Удаление изображения
  const handleDeleteImage = async (index: number) => {
    try {
      const newImages = [...images];
      newImages.splice(index, 1);
      setImages(newImages);
      await saveProductGallery(productId, newImages);
      onChange?.(newImages);
      setSelectedImageIndex(null);
      setFullscreenVisible(false);
    } catch (error) {
      console.error("Error deleting image:", error);
      Alert.alert("Ошибка", "Не удалось удалить изображение");
    }
  };

  // Открытие изображения в полноэкранном режиме
  const openFullscreen = (index: number) => {
    setSelectedImageIndex(index);
    setFullscreenVisible(true);
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {images.map((imageUri, index) => (
              <TouchableOpacity
                key={`image_${index}`}
                style={styles.imageContainer}
                onPress={() => openFullscreen(index)}
              >
                <Image source={{ uri: imageUri }} style={styles.image} />
                {!readonly && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteImage(index)}
                  >
                    <MaterialIcons name="delete" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}

            {!readonly && images.length < maxImages && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add" size={32} color="#777" />
                <Text style={styles.addImageText}>Добавить</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Modal для выбора источника изображения */}
          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Добавить изображение</Text>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={handleAddImage}
                >
                  <Ionicons name="images-outline" size={24} color="#333" />
                  <Text style={styles.modalOptionText}>Выбрать из галереи</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera-outline" size={24} color="#333" />
                  <Text style={styles.modalOptionText}>Сделать фото</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Полноэкранный просмотр изображения */}
          <Modal
            visible={fullscreenVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setFullscreenVisible(false)}
          >
            <View style={styles.fullscreenContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFullscreenVisible(false)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>

              {selectedImageIndex !== null && (
                <Image
                  source={{ uri: images[selectedImageIndex] }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              )}

              {!readonly && selectedImageIndex !== null && (
                <TouchableOpacity
                  style={styles.fullscreenDeleteButton}
                  onPress={() => handleDeleteImage(selectedImageIndex)}
                >
                  <MaterialIcons name="delete" size={28} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </Modal>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    marginHorizontal: 5,
    borderRadius: 8,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  deleteButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageButton: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  addImageText: {
    marginTop: 5,
    fontSize: 12,
    color: "#777",
  },
  loadingContainer: {
    height: imageSize,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
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
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "80%",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullscreenDeleteButton: {
    position: "absolute",
    bottom: 40,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ImageGallery;
