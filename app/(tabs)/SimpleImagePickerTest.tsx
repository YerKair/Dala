import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  saveImage,
  getImage,
  removeImage,
} from "./delivery/utils/simpleImageStorage";

export default function SimpleImagePickerTest() {
  const [image, setImage] = useState<string | null>(null);
  const [productId, setProductId] = useState("1");
  const [loading, setLoading] = useState(false);

  // Загрузка изображения при монтировании или изменении productId
  useEffect(() => {
    loadImage();
  }, [productId]);

  const loadImage = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      // Получаем изображение по ID
      const savedImage = await getImage(productId);
      if (savedImage) {
        setImage(savedImage);
        console.log("Изображение найдено и загружено");
      } else {
        setImage(null);
        console.log("Изображение не найдено");
      }
    } catch (error) {
      console.error("Ошибка загрузки изображения:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (!productId) {
      alert("Введите ID продукта");
      return;
    }

    try {
      // Запрашиваем разрешения
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Для работы необходимы разрешения на доступ к галерее");
        return;
      }

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
        setImage(imageUri);
        await saveImage(productId, imageUri);
        alert("Изображение сохранено");
      }
    } catch (error) {
      console.error("Ошибка выбора изображения:", error);
      alert("Не удалось выбрать изображение");
    }
  };

  const deleteImage = async () => {
    if (!productId) {
      alert("Введите ID продукта");
      return;
    }

    try {
      await removeImage(productId);
      setImage(null);
      alert("Изображение удалено");
    } catch (error) {
      console.error("Ошибка удаления изображения:", error);
      alert("Не удалось удалить изображение");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Простой выбор изображений</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>ID продукта:</Text>
        <TextInput
          style={styles.input}
          value={productId}
          onChangeText={setProductId}
          keyboardType="numeric"
          placeholder="Введите ID продукта"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Выбрать изображение" onPress={pickImage} />

        <Button title="Удалить изображение" onPress={deleteImage} color="red" />
      </View>

      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>Изображение:</Text>
        {loading ? (
          <Text>Загрузка...</Text>
        ) : image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.noImage}>
            <Text>Нет изображения</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  imageSection: {
    flex: 1,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    resizeMode: "contain",
  },
  noImage: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
});
