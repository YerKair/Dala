import AsyncStorage from "@react-native-async-storage/async-storage";

// Простые ключи для хранения
const IMAGE_KEY_PREFIX = "product_image_";

// Сохранение изображения
export const saveImage = async (
  id: string,
  imageUri: string
): Promise<boolean> => {
  try {
    console.log(`[SIMPLE] Сохраняем изображение для ID: ${id}`);
    const key = `${IMAGE_KEY_PREFIX}${id}`;
    await AsyncStorage.setItem(key, imageUri);
    console.log(`[SIMPLE] Изображение сохранено с ключом: ${key}`);
    return true;
  } catch (error) {
    console.error(`[SIMPLE] Ошибка сохранения изображения:`, error);
    return false;
  }
};

// Получение изображения
export const getImage = async (id: string): Promise<string | null> => {
  try {
    console.log(`[SIMPLE] Получение изображения для ID: ${id}`);
    const key = `${IMAGE_KEY_PREFIX}${id}`;
    const imageUri = await AsyncStorage.getItem(key);
    console.log(
      `[SIMPLE] Результат получения: ${imageUri ? "Найдено" : "Не найдено"}`
    );
    return imageUri;
  } catch (error) {
    console.error(`[SIMPLE] Ошибка получения изображения:`, error);
    return null;
  }
};

// Удаление изображения
export const removeImage = async (id: string): Promise<boolean> => {
  try {
    console.log(`[SIMPLE] Удаление изображения для ID: ${id}`);
    const key = `${IMAGE_KEY_PREFIX}${id}`;
    await AsyncStorage.removeItem(key);
    console.log(`[SIMPLE] Изображение удалено для ключа: ${key}`);
    return true;
  } catch (error) {
    console.error(`[SIMPLE] Ошибка удаления изображения:`, error);
    return false;
  }
};
