import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Используем захардкоженный URL с IP-адресом
const SERVER_URL = "http://192.168.0.117:8000";
console.log(`Используется SERVER_URL: ${SERVER_URL}`);

export const ImagePickerComponent = (): JSX.Element => {
  const { user, token } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    // Set initial avatar if user has one
    if (user?.avatar) {
      // Преобразуем URL, если он относительный
      if (user.avatar.startsWith("/")) {
        setImage(`${SERVER_URL}${user.avatar}`);
      } else {
        setImage(user.avatar);
      }
    }
  }, [user]);

  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return false;
    }
    return true;
  };

  const pickImage = async (): Promise<void> => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      // Просто используем строку вместо enums, чтобы избежать предупреждений
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        uploadImage(selectedAsset.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image from gallery.");
    }
  };

  const uploadImage = async (uri: string): Promise<void> => {
    setUploading(true);

    try {
      console.log("\n\n==== НАЧАЛО ЗАГРУЗКИ АВАТАРА ====");
      console.log("URI изображения:", uri);

      // Создаем FormData для изображения
      const formData = new FormData();
      const filename = uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      // Добавляем изображение в формат с правильным именем поля
      formData.append("avatar", {
        uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
        name: filename,
        type,
      } as any);

      console.log(`Отправляем запрос на: ${SERVER_URL}/api/upload-avatar`);
      console.log(
        `С токеном: ${
          token ? "Bearer token присутствует" : "Токен отсутствует"
        }`
      );

      try {
        // Выполняем запрос загрузки
        const response = await fetch(`${SERVER_URL}/api/upload-avatar`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        console.log(`Статус ответа: ${response.status}`);

        // Отладка заголовков
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value: string, key: string) => {
          responseHeaders[key] = value;
        });

        // Получаем текст ответа для диагностики
        const responseText = await response.text();
        console.log(`Длина текста ответа: ${responseText.length} символов`);

        if (responseText.length > 0) {
          console.log(
            "Начало ответа:",
            responseText.substring(0, Math.min(100, responseText.length))
          );
        }

        // Проверяем наличие HTML в ответе
        const isHtml =
          responseText.includes("<!DOCTYPE") ||
          responseText.includes("<html") ||
          responseText.includes("<body");

        if (isHtml) {
          console.error("Сервер вернул HTML вместо JSON");
          Alert.alert(
            "Ошибка",
            "Сервер вернул HTML-страницу вместо JSON. Убедитесь, что ваш сервер настроен правильно."
          );
          setUploading(false);
          return;
        }

        try {
          // Пробуем парсить ответ как JSON
          const responseData = JSON.parse(responseText);
          console.log("Успешно спарсили JSON:", responseData);

          if (response.ok && responseData) {
            if (responseData.avatar) {
              const avatarUrl = responseData.avatar.startsWith("/")
                ? `${SERVER_URL}${responseData.avatar}`
                : responseData.avatar;

              setImage(avatarUrl);

              // Обновляем данные пользователя
              if (user) {
                const updatedUser = {
                  ...user,
                  avatar: responseData.avatar,
                };
                await AsyncStorage.setItem(
                  "userData",
                  JSON.stringify(updatedUser)
                );
              }

              Alert.alert("Успех", "Аватар успешно обновлен");
            } else {
              Alert.alert(
                "Информация",
                "Профиль обновлен, но путь к аватару не был возвращен."
              );
            }
          } else if (responseData && responseData.message) {
            Alert.alert("Ошибка", responseData.message);
          } else {
            Alert.alert(
              "Ошибка",
              "Не удалось обновить аватар. Неожиданный ответ от сервера."
            );
          }
        } catch (jsonError) {
          console.error("Ошибка парсинга JSON:", jsonError);

          if (response.ok) {
            Alert.alert(
              "Предупреждение",
              "Запрос выполнен успешно, но ответ сервера не удалось обработать."
            );
          } else {
            Alert.alert("Ошибка", `Загрузка не удалась (${response.status})`);
          }
        }
      } catch (fetchError) {
        console.error("Ошибка сети:", fetchError);
        Alert.alert(
          "Ошибка сети",
          "Не удалось подключиться к серверу. Пожалуйста, проверьте, что ваш сервер запущен и доступен."
        );
      }
    } catch (error) {
      console.error("Ошибка загрузки аватара:", error);
      Alert.alert(
        "Ошибка",
        "Произошла неожиданная ошибка при загрузке аватара."
      );
    } finally {
      console.log("==== ЗАВЕРШЕНИЕ ЗАГРУЗКИ АВАТАРА ====\n\n");
      setUploading(false);
    }
  };

  const getImageSource = () => {
    if (image) {
      return { uri: image };
    }

    // Используем placeholder вместо локального файла
    return { uri: "https://via.placeholder.com/120" };
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} disabled={uploading}>
        <View style={styles.avatarContainer}>
          {uploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : (
            <Image source={getImageSource()} style={styles.avatar} />
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editText}>Edit</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  loadingContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 60,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#000",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
