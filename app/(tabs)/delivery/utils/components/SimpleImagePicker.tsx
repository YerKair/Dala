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
import { saveImage, getImage } from "../simpleImageStorage";

interface SimpleImagePickerProps {
  productId: string;
  onImageSelected?: (imageUri: string) => void;
  style?: any;
}

const SimpleImagePicker: React.FC<SimpleImagePickerProps> = ({
  productId,
  onImageSelected,
  style,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Загрузка существующего изображения при монтировании
  useEffect(() => {
    const loadImage = async () => {
      setLoading(true);
      try {
        const savedImage = await getImage(productId);
        if (savedImage) {
          setImage(savedImage);
        }
      } catch (error) {
        console.error("Ошибка загрузки изображения:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [productId]);

  // Функция выбора изображения
  const handlePickImage = async () => {
    try {
      // Запрашиваем разрешения
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Требуется разрешение на доступ к галерее");
        return;
      }

      setLoading(true);

      // Открываем галерею
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
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

        // Сохраняем изображение
        await saveImage(productId, imageUri);

        // Обновляем состояние
        setImage(imageUri);

        // Вызываем колбэк, если он задан
        if (onImageSelected) {
          onImageSelected(imageUri);
        }
      }
    } catch (error) {
      console.error("Ошибка выбора изображения:", error);
      Alert.alert("Ошибка", "Не удалось выбрать изображение");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.imageContainer}
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
});

export default SimpleImagePicker;
