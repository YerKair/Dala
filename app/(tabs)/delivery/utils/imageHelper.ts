import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { Alert } from "react-native";

// Keys for AsyncStorage
const STORE_IMAGES_KEY = "store_images";
const PRODUCT_IMAGES_KEY = "product_images";

// Image types and limits
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
const SUPPORTED_FORMATS = ["image/jpeg", "image/png"];
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 1200;

// Function to request permissions
export const requestPermissions = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return false;
  }
  return true;
};

// Function to pick image from gallery
export const pickImage = async (): Promise<string | null> => {
  console.log("[DEBUG] Начинаем выбор изображения");
  try {
    const hasPermission = await requestPermissions();

    if (!hasPermission) {
      console.log("[DEBUG] Разрешения не получены");
      alert("Sorry, we need camera roll permissions to make this work!");
      return null;
    }

    console.log("[DEBUG] Разрешения получены, запускаем галерею");

    // Используем блок try/catch для отлова ошибок при запуске галереи
    try {
      console.log("[DEBUG] Вызываем метод launchImageLibraryAsync");
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      console.log("[DEBUG] Галерея закрыта, получен результат");
      console.log(
        "[DEBUG] Результат выбора изображения:",
        result.canceled ? "Отменено" : "Изображение выбрано"
      );

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log(
          "[DEBUG] Получен asset:",
          JSON.stringify(asset).substring(0, 100) + "..."
        );

        if (asset.base64) {
          console.log(
            "[DEBUG] Получено base64 изображение, длина:",
            asset.base64.length
          );
          // Compress the image before returning
          const compressedImage = await compressImage(
            `data:image/jpeg;base64,${asset.base64}`
          );
          console.log(
            "[DEBUG] Изображение сжато:",
            compressedImage ? "Успешно" : "Ошибка"
          );
          return compressedImage || `data:image/jpeg;base64,${asset.base64}`;
        } else if (asset.uri) {
          console.log("[DEBUG] Base64 не получен, используем URI изображения");
          return asset.uri;
        } else {
          console.log("[DEBUG] Ни base64, ни URI не получены в ответе");
        }
      } else {
        console.log("[DEBUG] Выбор изображения отменен или нет assets");
      }
    } catch (galleryError) {
      console.error("[DEBUG] Ошибка при работе с галереей:", galleryError);
      Alert.alert(
        "Ошибка",
        "Произошла ошибка при попытке открыть галерею. Пожалуйста, попробуйте еще раз."
      );
    }
  } catch (error) {
    console.error("[DEBUG] Критическая ошибка в pickImage:", error);
    Alert.alert(
      "Ошибка",
      "Произошла неизвестная ошибка при работе с изображениями"
    );
  }

  return null;
};

// Save image to storage for a store
export const saveStoreImage = async (storeId: string, imageUri: string) => {
  try {
    // Get existing images map
    const imagesJson = await AsyncStorage.getItem(STORE_IMAGES_KEY);
    let imagesMap: Record<string, string> = {};

    if (imagesJson) {
      imagesMap = JSON.parse(imagesJson);
    }

    // Add or update image for this store
    imagesMap[storeId] = imageUri;

    // Save back to AsyncStorage
    await AsyncStorage.setItem(STORE_IMAGES_KEY, JSON.stringify(imagesMap));

    // Also save individual key for backward compatibility
    const key = `store_image_${storeId}`;
    await AsyncStorage.setItem(key, imageUri);

    return true;
  } catch (error: any) {
    console.error("Error saving store image:", error);
    return false;
  }
};

// Get image from storage for a store
export const getStoreImage = async (
  storeId: string
): Promise<string | null> => {
  try {
    console.log(`[DEBUG] Получение изображения для ресторана ID: ${storeId}`);

    // First try to get from the map
    const imagesJson = await AsyncStorage.getItem(STORE_IMAGES_KEY);

    let localImage = null;
    if (imagesJson) {
      const imagesMap: Record<string, string> = JSON.parse(imagesJson);
      if (imagesMap[storeId]) {
        localImage = imagesMap[storeId];
        console.log("[DEBUG] Найдено изображение в map хранилище");
      }
    }

    // Try individual key as fallback
    if (!localImage) {
      const key = `store_image_${storeId}`;
      localImage = await AsyncStorage.getItem(key);
      if (localImage) {
        console.log("[DEBUG] Найдено изображение по отдельному ключу");
      }
    }

    // Return local image if found
    if (localImage) {
      return localImage;
    }

    // If no local image, try to get from server
    // Здесь можно добавить проверку серверного пути, если он доступен
    console.log("[DEBUG] Локальное изображение для ресторана не найдено");

    return null;
  } catch (error: any) {
    console.error("Error getting store image:", error);
    return null;
  }
};

// Save image to storage for a product
export const saveProductImage = async (productId: string, imageUri: string) => {
  console.log("[DEBUG] Сохранение изображения для продукта:", productId);
  console.log("[DEBUG] URI изображения:", imageUri.substring(0, 50) + "...");

  try {
    // Get existing images map
    const imagesJson = await AsyncStorage.getItem(PRODUCT_IMAGES_KEY);
    let imagesMap: Record<string, string> = {};

    if (imagesJson) {
      console.log("[DEBUG] Существующая карта изображений найдена");
      imagesMap = JSON.parse(imagesJson);
    } else {
      console.log("[DEBUG] Создаем новую карту изображений");
    }

    // Add or update image for this product
    imagesMap[productId] = imageUri;

    // Save back to AsyncStorage
    console.log("[DEBUG] Сохраняем карту изображений в AsyncStorage");
    await AsyncStorage.setItem(PRODUCT_IMAGES_KEY, JSON.stringify(imagesMap));
    console.log("[DEBUG] Карта изображений сохранена");

    // Also save individual key for backward compatibility
    const key = `product_image_${productId}`;
    console.log("[DEBUG] Сохраняем отдельный ключ:", key);
    await AsyncStorage.setItem(key, imageUri);
    console.log("[DEBUG] Изображение успешно сохранено");

    return true;
  } catch (error: any) {
    console.error("[DEBUG] Ошибка сохранения изображения:", error);
    return false;
  }
};

// Get image from storage for a product
export const getProductImage = async (
  productId: string
): Promise<string | null> => {
  console.log("[DEBUG] Получение изображения для продукта:", productId);

  try {
    // First try to get from the map
    const imagesJson = await AsyncStorage.getItem(PRODUCT_IMAGES_KEY);

    if (imagesJson) {
      console.log("[DEBUG] Найдена карта изображений");
      const imagesMap: Record<string, string> = JSON.parse(imagesJson);
      if (imagesMap[productId]) {
        console.log("[DEBUG] Изображение найдено в карте");
        return imagesMap[productId];
      } else {
        console.log("[DEBUG] Изображение не найдено в карте");
      }
    } else {
      console.log("[DEBUG] Карта изображений не найдена");
    }

    // Try individual key as fallback
    const key = `product_image_${productId}`;
    console.log("[DEBUG] Пробуем получить по отдельному ключу:", key);
    const image = await AsyncStorage.getItem(key);
    console.log(
      "[DEBUG] Результат получения изображения:",
      image ? "Найдено" : "Не найдено"
    );
    return image;
  } catch (error: any) {
    console.error("[DEBUG] Ошибка получения изображения:", error);
    return null;
  }
};

// Save multiple images for a product
export const saveProductGallery = async (
  productId: string,
  imageUris: string[]
) => {
  try {
    const key = `product_gallery_${productId}`;
    await AsyncStorage.setItem(key, JSON.stringify(imageUris));
    return true;
  } catch (error: any) {
    console.error("Error saving product gallery:", error);
    return false;
  }
};

// Get multiple images for a product
export const getProductGallery = async (
  productId: string
): Promise<string[]> => {
  try {
    const key = `product_gallery_${productId}`;
    const gallery = await AsyncStorage.getItem(key);
    return gallery ? JSON.parse(gallery) : [];
  } catch (error: any) {
    console.error("Error getting product gallery:", error);
    return [];
  }
};

// Delete image from storage for a store
export const deleteStoreImage = async (storeId: string): Promise<boolean> => {
  try {
    // Remove from map
    const imagesJson = await AsyncStorage.getItem(STORE_IMAGES_KEY);

    if (imagesJson) {
      const imagesMap: Record<string, string> = JSON.parse(imagesJson);
      if (imagesMap[storeId]) {
        delete imagesMap[storeId];
        await AsyncStorage.setItem(STORE_IMAGES_KEY, JSON.stringify(imagesMap));
      }
    }

    // Remove individual key
    const key = `store_image_${storeId}`;
    await AsyncStorage.removeItem(key);

    return true;
  } catch (error: any) {
    console.error("Error deleting store image:", error);
    return false;
  }
};

// Delete image from storage for a product
export const deleteProductImage = async (
  productId: string
): Promise<boolean> => {
  try {
    // Remove from map
    const imagesJson = await AsyncStorage.getItem(PRODUCT_IMAGES_KEY);

    if (imagesJson) {
      const imagesMap: Record<string, string> = JSON.parse(imagesJson);
      if (imagesMap[productId]) {
        delete imagesMap[productId];
        await AsyncStorage.setItem(
          PRODUCT_IMAGES_KEY,
          JSON.stringify(imagesMap)
        );
      }
    }

    // Remove individual key
    const key = `product_image_${productId}`;
    await AsyncStorage.removeItem(key);

    // Remove gallery if exists
    await AsyncStorage.removeItem(`product_gallery_${productId}`);

    return true;
  } catch (error: any) {
    console.error("Error deleting product image:", error);
    return false;
  }
};

// Take a picture with the camera
export const takePicture = async (): Promise<string | null> => {
  try {
    console.log("[DEBUG] Запрашиваем разрешения камеры");
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      console.log("[DEBUG] Разрешение на использование камеры не получено");
      alert("Sorry, we need camera permissions to make this work!");
      return null;
    }

    console.log("[DEBUG] Разрешения камеры получены, запускаем камеру");
    try {
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      console.log("[DEBUG] Камера закрыта, получен результат");
      console.log(
        "[DEBUG] Результат фото:",
        result.canceled ? "Отменено" : "Фото сделано"
      );

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log(
          "[DEBUG] Получен asset камеры:",
          JSON.stringify(asset).substring(0, 100) + "..."
        );

        if (asset.base64) {
          console.log(
            "[DEBUG] Получены base64 данные фото, длина:",
            asset.base64.length
          );
          // Compress the image before returning
          const compressedImage = await compressImage(
            `data:image/jpeg;base64,${asset.base64}`
          );
          return compressedImage || `data:image/jpeg;base64,${asset.base64}`;
        } else if (asset.uri) {
          console.log("[DEBUG] Base64 не получен, используем URI фото");
          return asset.uri;
        } else {
          console.log(
            "[DEBUG] Ни base64, ни URI не получены в ответе от камеры"
          );
        }
      } else {
        console.log("[DEBUG] Фотографирование отменено или нет assets");
      }
    } catch (cameraError) {
      console.error("[DEBUG] Ошибка при работе с камерой:", cameraError);
      Alert.alert(
        "Ошибка",
        "Произошла ошибка при попытке сделать фото. Пожалуйста, попробуйте еще раз."
      );
    }
  } catch (error) {
    console.error("[DEBUG] Критическая ошибка в takePicture:", error);
    Alert.alert("Ошибка", "Произошла неизвестная ошибка при работе с камерой");
  }

  return null;
};

// Compress image (reduce quality and resize)
export const compressImage = async (
  imageUri: string,
  quality = 0.6
): Promise<string | null> => {
  console.log(
    "[DEBUG] Сжатие изображения, URI:",
    imageUri.substring(0, 50) + "..."
  );

  try {
    // If it's a base64 image
    if (imageUri.startsWith("data:image")) {
      console.log("[DEBUG] Это base64 изображение");
      // Для base64 изображений пока просто возвращаем как есть
      // В реальном приложении здесь можно добавить логику для сжатия base64 строки
      return imageUri;
    }
    // If it's a file URI
    else {
      console.log(
        "[DEBUG] Это файловое изображение, применяем ImageManipulator"
      );
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_HEIGHT } }],
          { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );

        console.log(
          "[DEBUG] Изображение успешно сжато, новый URI:",
          manipResult.uri.substring(0, 50) + "..."
        );
        return manipResult.uri;
      } catch (manipError) {
        console.error(
          "[DEBUG] Ошибка при использовании ImageManipulator:",
          manipError
        );
        // Если не удалось обработать через ImageManipulator, вернем оригинальное изображение
        return imageUri;
      }
    }
  } catch (error: any) {
    console.error("[DEBUG] Ошибка сжатия изображения:", error);
    // Возвращаем оригинальное изображение в случае ошибки
    return imageUri;
  }
};

// Get all store images
export const getAllStoreImages = async (): Promise<Record<string, string>> => {
  try {
    const imagesJson = await AsyncStorage.getItem(STORE_IMAGES_KEY);
    return imagesJson ? JSON.parse(imagesJson) : {};
  } catch (error) {
    console.error("Error getting all store images:", error);
    return {};
  }
};

// Get all product images
export const getAllProductImages = async (): Promise<
  Record<string, string>
> => {
  try {
    const imagesJson = await AsyncStorage.getItem(PRODUCT_IMAGES_KEY);
    return imagesJson ? JSON.parse(imagesJson) : {};
  } catch (error) {
    console.error("Error getting all product images:", error);
    return {};
  }
};

// Create a FormData object for sending to server (if needed in future)
export const createImageFormData = (
  uri: string,
  fieldName = "image",
  fileName = "image.jpg"
): FormData => {
  const formData = new FormData();

  if (uri.startsWith("data:image")) {
    // Handle base64 images if needed
    const base64Data = uri.split("base64,")[1];
    const blob = base64ToBlob(base64Data, "image/jpeg");
    formData.append(fieldName, blob, fileName);
  } else {
    // Handle file URIs
    formData.append(fieldName, {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      name: fileName,
      type: "image/jpeg",
    } as any);
  }

  return formData;
};

// Helper function to convert base64 to blob
function base64ToBlob(base64: string, contentType = "image/jpeg") {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

// Clear all images from storage (useful for testing or reset)
export const clearAllImages = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORE_IMAGES_KEY);
    await AsyncStorage.removeItem(PRODUCT_IMAGES_KEY);

    // Get all keys for individual images and clear them
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter(
      (key) =>
        key.startsWith("store_image_") ||
        key.startsWith("product_image_") ||
        key.startsWith("product_gallery_")
    );

    if (imageKeys.length > 0) {
      await AsyncStorage.multiRemove(imageKeys);
    }
  } catch (error) {
    console.error("Error clearing all images:", error);
  }
};

// Функция для тестирования AsyncStorage
export const testAsyncStorage = async (): Promise<boolean> => {
  const TEST_KEY = "test_async_storage_key";
  const TEST_VALUE = "test_value_" + Date.now();

  console.log("[DEBUG] Тестирование AsyncStorage");

  try {
    // Проверяем работу setItem
    console.log("[DEBUG] Попытка записи в AsyncStorage");
    await AsyncStorage.setItem(TEST_KEY, TEST_VALUE);
    console.log("[DEBUG] Запись в AsyncStorage успешна");

    // Проверяем работу getItem
    console.log("[DEBUG] Попытка чтения из AsyncStorage");
    const value = await AsyncStorage.getItem(TEST_KEY);
    console.log("[DEBUG] Чтение из AsyncStorage:", value);

    // Проверяем работу removeItem
    console.log("[DEBUG] Попытка удаления из AsyncStorage");
    await AsyncStorage.removeItem(TEST_KEY);
    console.log("[DEBUG] Удаление из AsyncStorage успешно");

    // Проверяем, действительно ли запись удалена
    const checkValue = await AsyncStorage.getItem(TEST_KEY);
    console.log(
      "[DEBUG] Проверка удаления:",
      checkValue === null ? "Успешно" : "Ошибка"
    );

    return value === TEST_VALUE;
  } catch (error) {
    console.error("[DEBUG] Ошибка при тестировании AsyncStorage:", error);
    return false;
  }
};
