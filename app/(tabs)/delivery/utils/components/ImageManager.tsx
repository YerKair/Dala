import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { saveImage, getImage, removeImage } from "../simpleImageStorage";

interface ImageManagerProps {
  entityId: string;
  entityType?: string; // 'product', 'category', etc.
  onImageSelected?: (imageUri: string) => void;
  onImageRemoved?: () => void;
  style?: any;
  size?: "small" | "medium" | "large";
  showRemoveButton?: boolean;
  imageUrl?: string; // URL изображения с сервера
}

const ImageManager: React.FC<ImageManagerProps> = ({
  entityId,
  entityType = "default",
  onImageSelected,
  onImageRemoved,
  style,
  size = "medium",
  showRemoveButton = true,
  imageUrl,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Generate a storage key based on entity type and ID
  const getStorageKey = () => {
    return entityType ? `${entityType}_${entityId}` : entityId;
  };

  // Load existing image on mount
  useEffect(() => {
    const loadImage = async () => {
      setLoading(true);
      try {
        const storageKey = getStorageKey();
        console.log(`Loading image for ${storageKey}`);

        // Сначала пробуем загрузить из AsyncStorage
        const savedImage = await getImage(storageKey);
        if (savedImage) {
          setImage(savedImage);
          console.log(`Image found in AsyncStorage for ${storageKey}`);
        }
        // Если нет в AsyncStorage, но есть URL, используем его
        else if (imageUrl) {
          setImage(imageUrl);
          console.log(`Using server image URL for ${storageKey}: ${imageUrl}`);

          // Сохраняем URL в AsyncStorage для будущего использования
          await saveImage(storageKey, imageUrl);
        } else {
          console.log(`No image found for ${storageKey}`);
        }
      } catch (error) {
        console.error("Error loading image:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [entityId, entityType, imageUrl]);

  // Handle image selection
  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Требуется разрешение",
          "Пожалуйста, разрешите доступ к галерее"
        );
        return;
      }

      setLoading(true);

      // Open gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        const imageUri = selectedImage.base64
          ? `data:image/jpeg;base64,${selectedImage.base64}`
          : selectedImage.uri;

        // Save image to AsyncStorage with appropriate key
        const storageKey = getStorageKey();
        console.log(`Saving image for ${storageKey}`);
        await saveImage(storageKey, imageUri);

        // Update state
        setImage(imageUri);

        // Call callback if provided
        if (onImageSelected) {
          onImageSelected(imageUri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Ошибка", "Не удалось выбрать изображение");
    } finally {
      setLoading(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = async () => {
    if (!image) return;

    Alert.alert(
      "Удалить изображение",
      "Вы уверены, что хотите удалить это изображение?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const storageKey = getStorageKey();
              await removeImage(storageKey);
              setImage(null);

              if (onImageRemoved) {
                onImageRemoved();
              }
            } catch (error) {
              console.error("Error removing image:", error);
              Alert.alert("Ошибка", "Не удалось удалить изображение");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Determine container size based on prop
  const getContainerSize = () => {
    switch (size) {
      case "small":
        return { width: 80, height: 80 };
      case "large":
        return { width: 160, height: 160 };
      case "medium":
      default:
        return { width: 120, height: 120 };
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.imageContainer, getContainerSize()]}
        onPress={handlePickImage}
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
            <Text style={styles.placeholderText}>Добавить фото</Text>
          </View>
        )}
      </TouchableOpacity>

      {image && showRemoveButton && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemoveImage}
        >
          <Text style={styles.removeButtonText}>Удалить</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
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
  removeButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#ffefef",
    borderWidth: 1,
    borderColor: "#ff5555",
    borderRadius: 6,
  },
  removeButtonText: {
    color: "#ff5555",
    fontSize: 12,
  },
});

export default ImageManager;
