// app/components/ImagePickerComponent.tsx
import React, { useState } from "react";
import { View, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../app/auth/AuthContext";

interface ImagePickerComponentProps {
  onImageSelected?: (imageUri: string) => void;
}

export const ImagePickerComponent: React.FC<ImagePickerComponentProps> = ({
  onImageSelected,
}) => {
  const { user, token } = useAuth();
  const [image, setImage] = useState<string | null>(user?.avatar || null);

  const pickImage = async () => {
    // Request permission to access the media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }

    // Launch image picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0].uri;
      setImage(selectedImage);

      // Upload image to server
      await uploadImage(selectedImage);
    }
  };

  const uploadImage = async (imageUri: string) => {
    // Create form data
    const formData = new FormData();
    formData.append("avatar", {
      uri: imageUri,
      type: "image/jpeg",
      name: "avatar.jpg",
    } as any);

    try {
      const response = await fetch(
        "http://192.168.0.113:8000/api/profile/upload-avatar",
        {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const responseData = await response.json();

      if (response.ok) {
        // Update user context with new avatar URL
        onImageSelected?.(responseData.avatar);
        Alert.alert("Success", "Avatar updated successfully");
      } else {
        Alert.alert("Error", responseData.message || "Failed to upload avatar");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      Alert.alert("Error", "Network error. Please try again.");
    }
  };

  return (
    <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <View style={styles.placeholderContainer}>
          <Image
            source={require("../assets/images/default-avatar.jpg")}
            style={styles.image}
          />
        </View>
      )}
      <View style={styles.editOverlay}>
        <Image
          source={require("../assets/images/camera-icon.jpg")}
          style={styles.cameraIcon}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  editOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cameraIcon: {
    width: 24,
    height: 24,
  },
});
