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
import * as ImageManipulator from "expo-image-manipulator";
import { saveProductImage, getProductImage } from "../helpers";

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedImage();
  }, [productId]);

  const loadSavedImage = async () => {
    try {
      if (productId) {
        const savedImage = await getProductImage(productId);
        if (savedImage) {
          setImage(savedImage);
        }
      }
    } catch (error) {
      console.error("Error loading saved image:", error);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Требуется разрешение",
          "Для выбора изображения необходим доступ к галерее"
        );
        return;
      }

      setLoading(true);

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];

        // Process the image to reduce size and ensure compatibility
        const processedResult = await ImageManipulator.manipulateAsync(
          selectedAsset.uri,
          [{ resize: { width: 800, height: 800 } }],
          {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        const imageUri = processedResult.uri;

        try {
          // Save image to local storage
          await saveProductImage(productId, imageUri);

          // Update state and notify parent
          setImage(imageUri);
          if (onImageSelected) {
            onImageSelected(imageUri);
          }
        } catch (saveError) {
          console.error("Error saving image:", saveError);
          Alert.alert("Ошибка", "Не удалось сохранить изображение");
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Ошибка", "Не удалось выбрать изображение");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5D23" />
        </View>
      ) : image ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
            <Ionicons name="camera-outline" size={24} color="#4A5D23" />
            <Text style={styles.changeButtonText}>Изменить</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.placeholder} onPress={pickImage}>
          <Ionicons name="image-outline" size={40} color="#4A5D23" />
          <Text style={styles.placeholderText}>Выбрать изображение</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    flex: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#4A5D23",
    borderStyle: "dashed",
    borderRadius: 8,
  },
  placeholderText: {
    marginTop: 8,
    color: "#4A5D23",
    fontSize: 16,
  },
  changeButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  changeButtonText: {
    color: "#4A5D23",
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
  },
});

export default SimpleImagePicker;
