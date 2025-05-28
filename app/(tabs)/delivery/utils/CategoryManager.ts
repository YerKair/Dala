import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

// Keys for AsyncStorage
const CATEGORY_IMAGES_KEY = "category_images";

// Image types and limits
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
const SUPPORTED_FORMATS = ["jpeg", "png", "gif"];
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 800;

// API Base URL
const API_BASE_URL = "http://192.168.0.109:8000/api";

// Function to request permissions
export const requestPermissions = async () => {
  const libraryPermission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (libraryPermission.status !== "granted") {
    return false;
  }
  return true;
};

// Function to pick an image from gallery
export const pickImage = async (): Promise<string | null> => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      throw new Error("Permission to access media library was denied");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error("Error picking image:", error);
    return null;
  }
};

// Function to take a picture with camera
export const takePicture = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permission to access camera was denied");
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error("Error taking picture:", error);
    return null;
  }
};

// Get auth token from storage
export const getAuthToken = async (): Promise<string | null> => {
  try {
    let token = await AsyncStorage.getItem("token");
    if (!token) {
      token = await AsyncStorage.getItem("userToken");
    }
    return token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// Save image to storage for a category
export const saveCategoryImage = async (
  storeId: string,
  categoryId: string,
  imageUri: string
): Promise<boolean> => {
  try {
    // Get auth token
    const token = await getAuthToken();
    if (!token) {
      console.error("No auth token found");
      throw new Error("Не удалось получить токен авторизации");
    }

    // Upload image to server first (if API endpoint exists)
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: `category_${categoryId}.jpg`,
      } as any);

      const response = await fetch(
        `${API_BASE_URL}/categories/${categoryId}/image`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        console.warn(
          `Server upload failed: ${response.status}. Using local storage only.`
        );
      } else {
        console.log("Successfully uploaded image to server");
      }
    } catch (error) {
      console.warn(
        "Error uploading to server. Using local storage only:",
        error
      );
    }

    // Always save to local storage as fallback
    // Get existing images map
    const imagesJson = await AsyncStorage.getItem(CATEGORY_IMAGES_KEY);
    let imagesMap: Record<string, string> = {};

    if (imagesJson) {
      imagesMap = JSON.parse(imagesJson);
    }

    // Create a unique key for this category
    const categoryKey = `${storeId}_${categoryId}`;

    // Add or update image for this category
    imagesMap[categoryKey] = imageUri;

    // Save back to AsyncStorage
    await AsyncStorage.setItem(CATEGORY_IMAGES_KEY, JSON.stringify(imagesMap));

    // Also save individual key for backward compatibility
    const key = `category_image_${storeId}_${categoryId}`;
    await AsyncStorage.setItem(key, imageUri);

    return true;
  } catch (error) {
    console.error("Error saving category image:", error);
    throw error;
  }
};

// Get category image from storage
export const getCategoryImage = async (
  storeId: string,
  categoryId: string
): Promise<string | null> => {
  try {
    // First try to get image from local storage
    const categoryKey = `${storeId}_${categoryId}`;

    // Try from images map first
    const imagesJson = await AsyncStorage.getItem(CATEGORY_IMAGES_KEY);
    if (imagesJson) {
      const imagesMap: Record<string, string> = JSON.parse(imagesJson);
      if (imagesMap[categoryKey]) {
        return imagesMap[categoryKey];
      }
    }

    // Try individual key if not found in map
    const key = `category_image_${storeId}_${categoryId}`;
    const imageFromStorage = await AsyncStorage.getItem(key);
    if (imageFromStorage) {
      return imageFromStorage;
    }

    // If not in local storage, try to get from API
    try {
      const token = await getAuthToken();
      const headers: HeadersInit = {
        Accept: "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.image_url) {
          // Save to local storage for next time
          await saveCategoryImage(storeId, categoryId, data.image_url);
          return data.image_url;
        }
      }
    } catch (error) {
      console.warn("Error fetching category image from API:", error);
    }

    // Nothing found
    return null;
  } catch (error) {
    console.error("Error getting category image:", error);
    return null;
  }
};

// Delete image from storage for a category
export const deleteCategoryImage = async (
  storeId: string,
  categoryId: string
): Promise<boolean> => {
  try {
    // Remove from map
    const imagesJson = await AsyncStorage.getItem(CATEGORY_IMAGES_KEY);
    const categoryKey = `${storeId}_${categoryId}`;

    if (imagesJson) {
      const imagesMap: Record<string, string> = JSON.parse(imagesJson);
      if (imagesMap[categoryKey]) {
        delete imagesMap[categoryKey];
        await AsyncStorage.setItem(
          CATEGORY_IMAGES_KEY,
          JSON.stringify(imagesMap)
        );
      }
    }

    // Remove individual key
    const key = `category_image_${storeId}_${categoryId}`;
    await AsyncStorage.removeItem(key);

    return true;
  } catch (error) {
    console.error("Error deleting category image:", error);
    return false;
  }
};

// Get all category images for a store
export const getAllStoreCategoryImages = async (
  storeId: string
): Promise<Record<string, string>> => {
  try {
    const imagesJson = await AsyncStorage.getItem(CATEGORY_IMAGES_KEY);
    if (!imagesJson) return {};

    const allImages: Record<string, string> = JSON.parse(imagesJson);
    const storeImages: Record<string, string> = {};

    // Filter images for this store
    Object.entries(allImages).forEach(([key, value]) => {
      if (key.startsWith(`${storeId}_`)) {
        const categoryId = key.split("_")[1];
        storeImages[categoryId] = value;
      }
    });

    return storeImages;
  } catch (error) {
    console.error("Error getting all store category images:", error);
    return {};
  }
};

// Clear all category images (useful for testing or reset)
export const clearAllCategoryImages = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CATEGORY_IMAGES_KEY);

    // Get all keys for individual category images and clear them
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter((key) =>
      key.startsWith("category_image_")
    );

    if (imageKeys.length > 0) {
      await AsyncStorage.multiRemove(imageKeys);
    }
  } catch (error) {
    console.error("Error clearing all category images:", error);
  }
};
