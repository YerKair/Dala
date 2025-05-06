import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

export const ImagePickerComponent = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Создаем ключ для хранения аватара с привязкой к ID пользователя
  const getAvatarStorageKey = () => {
    return user?.id ? `userAvatar_${user.id}` : null;
  };

  // Load image from AsyncStorage on component mount
  useEffect(() => {
    const loadSavedAvatar = async () => {
      if (!user?.id) return;

      try {
        // Получаем ключ для текущего пользователя
        const storageKey = getAvatarStorageKey();

        if (!storageKey) return;

        // Try to load avatar from AsyncStorage
        const savedAvatar = await AsyncStorage.getItem(storageKey);
        if (savedAvatar) {
          setImage(savedAvatar);
        } else if (user?.avatar) {
          // Fallback to user avatar from auth context if available
          setImage(user.avatar);
          // Also save it to AsyncStorage for future use
          await AsyncStorage.setItem(storageKey, user.avatar);
        }
      } catch (error) {
        console.error("Error loading avatar from storage:", error);
      }
    };

    loadSavedAvatar();
  }, [user]);

  useEffect(() => {
    (async () => {
      // Request permissions on component mount
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("permissionRequired"), t("cameraRollPermissionRequired"));
      }
    })();
  }, [t]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        saveImageLocally(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("error"), t("failedToPickImage"));
    }
  };

  const saveImageLocally = async (uri: string) => {
    if (!user?.id) {
      Alert.alert(t("error"), t("userNotLoggedIn"));
      return;
    }

    setUploading(true);

    try {
      const storageKey = getAvatarStorageKey();

      if (!storageKey) {
        throw new Error("Cannot generate storage key for avatar");
      }

      console.log("Saving avatar with key:", storageKey);
      // Save the image URI to AsyncStorage с уникальным ключом для пользователя
      await AsyncStorage.setItem(storageKey, uri);

      // Update the image in the component state
      setImage(uri);

      // Update user data in AsyncStorage if needed
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          const updatedUserData = {
            ...parsedUserData,
            avatar: uri,
          };

          await AsyncStorage.setItem(
            "userData",
            JSON.stringify(updatedUserData)
          );

          // Обновляем пользовательские данные, чтобы другие компоненты могли получить доступ к обновленному аватару
          if (user) {
            user.avatar = uri;
          }
        }
      } catch (error) {
        console.error("Failed to update avatar in user data:", error);
      }

      // Устанавливаем флаг, что аватар был обновлен
      await AsyncStorage.setItem("avatarUpdated", new Date().toISOString());

      Alert.alert(t("success"), t("avatarUpdatedSuccessfully"));
    } catch (error) {
      console.error("Error saving image locally:", error);
      Alert.alert(t("error"), t("failedToSaveImage"));
    } finally {
      setUploading(false);
    }
  };

  // Get avatar source for Image component
  const getAvatarSource = () => {
    if (image) {
      return { uri: image };
    }

    // Return default avatar image
    return require("../../../assets/images/default-avatar.jpg");
  };

  return (
    <View style={styles.container}>
      {uploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          <Image
            source={getAvatarSource()}
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.changeButton}>
            <Text style={styles.changeButtonText}>{t("change")}</Text>
          </View>
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
  loadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#f0f0f0",
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#f0f0f0",
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#888",
  },
  changeButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  changeButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
