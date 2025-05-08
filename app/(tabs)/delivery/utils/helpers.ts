// utils/helpers.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

// Format currency
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Get product image by ID
export const getProductImage = async (
  productId: string
): Promise<string | null> => {
  try {
    // First try to get image from AsyncStorage
    const key = `product_image_${productId}`;
    const savedImage = await AsyncStorage.getItem(key);
    if (savedImage) {
      return savedImage;
    }

    // If no saved image, try to fetch from API
    try {
      const response = await fetch(
        `http://192.168.0.117:8000/api/products/${productId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.images) {
          // If the product has an image URL, save it to AsyncStorage and return
          const imageUrl = data.images.startsWith("http")
            ? data.images
            : `http://192.168.0.117:8000${data.images}`;

          await saveProductImage(productId, imageUrl);
          return imageUrl;
        }
      }
    } catch (apiError) {
      console.error("API error getting product image:", apiError);
    }

    // If API fails or no image from API, use placeholder
    const placeholders = [
      "https://via.placeholder.com/300/4A5D23/FFFFFF?text=Product+Image",
      "https://via.placeholder.com/300/6A7D43/FFFFFF?text=Fresh+Produce",
      "https://via.placeholder.com/300/8A9D63/FFFFFF?text=Grocery+Item",
    ];

    // Determine which placeholder to use based on product ID
    const index =
      parseInt(productId.replace(/[^0-9]/g, "")) % placeholders.length;
    return placeholders[index || 0];
  } catch (error) {
    console.error("Error getting product image:", error);
    return null;
  }
};

// Save product image to AsyncStorage
export const saveProductImage = async (
  productId: string,
  imageUri: string
): Promise<boolean> => {
  try {
    const key = `product_image_${productId}`;
    await AsyncStorage.setItem(key, imageUri);
    return true;
  } catch (error) {
    console.error("Error saving product image:", error);
    return false;
  }
};

// Get store image by ID
export const getStoreImage = async (
  storeId: string
): Promise<string | null> => {
  try {
    // First try to get image from AsyncStorage
    const key = `store_image_${storeId}`;
    const savedImage = await AsyncStorage.getItem(key);
    if (savedImage) {
      return savedImage;
    }

    // If no saved image, try to fetch from API
    try {
      const response = await fetch(
        `http://192.168.0.117:8000/api/restaurants/${storeId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.image_path) {
          // If the store has an image URL, save it to AsyncStorage and return
          const imageUrl = data.image_path.startsWith("http")
            ? data.image_path
            : `http://192.168.0.117:8000${data.image_path}`;

          await saveStoreImage(storeId, imageUrl);
          return imageUrl;
        }
      }
    } catch (apiError) {
      console.error("API error getting store image:", apiError);
    }

    // If API fails or no image from API, use placeholder
    const placeholders = [
      "https://via.placeholder.com/300/4A5D23/FFFFFF?text=Store+Image",
      "https://via.placeholder.com/300/6A7D43/FFFFFF?text=Restaurant",
      "https://via.placeholder.com/300/8A9D63/FFFFFF?text=Grocery+Store",
    ];

    // Determine which placeholder to use based on store ID
    const index =
      parseInt(storeId.replace(/[^0-9]/g, "")) % placeholders.length;
    return placeholders[index || 0];
  } catch (error) {
    console.error("Error getting store image:", error);
    return null;
  }
};

// Save store image to AsyncStorage
export const saveStoreImage = async (
  storeId: string,
  imageUri: string
): Promise<boolean> => {
  try {
    const key = `store_image_${storeId}`;
    await AsyncStorage.setItem(key, imageUri);
    return true;
  } catch (error) {
    console.error("Error saving store image:", error);
    return false;
  }
};

// Pick image from gallery
export const pickImage = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      console.log("Permission to access media library was denied");
      return null;
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

// Get product gallery images
export const getProductGallery = async (
  productId: string
): Promise<string[]> => {
  try {
    // Try to get gallery from AsyncStorage
    const key = `product_gallery_${productId}`;
    const savedGallery = await AsyncStorage.getItem(key);
    if (savedGallery) {
      return JSON.parse(savedGallery);
    }

    // Return empty array if no saved gallery
    return [];
  } catch (error) {
    console.error("Error getting product gallery:", error);
    return [];
  }
};

// Calculate distance between two coordinates in km
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

// Convert degrees to radians
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Calculate estimated delivery time based on distance
export const calculateEstimatedDeliveryTime = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string => {
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);

  // Assume average delivery speed of 20 km/h
  const timeInMinutes = Math.ceil((distance / 20) * 60);

  if (timeInMinutes < 15) {
    return "10-15 min";
  } else if (timeInMinutes < 30) {
    return "15-30 min";
  } else if (timeInMinutes < 45) {
    return "30-45 min";
  } else if (timeInMinutes < 60) {
    return "45-60 min";
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    return `${hours}-${hours + 1} hours`;
  }
};
