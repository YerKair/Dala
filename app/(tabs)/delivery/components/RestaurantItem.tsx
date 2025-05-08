import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getStoreImage, saveStoreImage } from "../utils/helpers";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  category?: string;
  image_path?: string;
  isPopular?: boolean;
  isRecommended?: boolean;
  rating?: number;
}

interface RestaurantItemProps {
  restaurant: Restaurant;
  onPress: (restaurant: Restaurant) => void;
}

const RestaurantItem: React.FC<RestaurantItemProps> = ({
  restaurant,
  onPress,
}) => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        console.log(
          `[DEBUG] Загрузка изображения для ресторана ${restaurant.id}`
        );
        // Сначала пробуем загрузить из локального хранилища
        const localImage = await getStoreImage(restaurant.id);

        if (localImage) {
          console.log(
            `[DEBUG] Найдено локальное изображение для ${restaurant.id}`
          );
          setImage(localImage);
          return;
        }

        // Если нет в локальном хранилище, пробуем использовать путь с сервера
        if (restaurant.image_path) {
          console.log(
            `[DEBUG] Используем серверное изображение для ${restaurant.id}: ${restaurant.image_path}`
          );

          // Проверяем, полный ли это URL или относительный путь
          const imageUrl = restaurant.image_path.startsWith("http")
            ? restaurant.image_path
            : `http://192.168.0.117:8000${restaurant.image_path}`; // Добавляем домен, если путь относительный

          setImage(imageUrl);

          // Сохраняем URL в локальное хранилище для будущего использования
          saveStoreImage(restaurant.id, imageUrl).then(() => {
            console.log(
              `[DEBUG] Серверное изображение сохранено локально для ${restaurant.id}`
            );
          });
        } else {
          console.log(
            `[DEBUG] Изображение не найдено для ресторана ${restaurant.id}`
          );
        }
      } catch (error) {
        console.error(
          `[DEBUG] Ошибка при загрузке изображения для ${restaurant.id}:`,
          error
        );
      }
    };

    loadImage();
  }, [restaurant.id, restaurant.image_path]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(restaurant)}
    >
      <View style={styles.imageContainer}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={24} color="#CCC" />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {restaurant.description}
        </Text>
        {restaurant.category && (
          <Text style={styles.category}>{restaurant.category}</Text>
        )}

        <View style={styles.tagsContainer}>
          {restaurant.isPopular && (
            <View style={[styles.tag, styles.popularTag]}>
              <Text style={styles.tagText}>Popular</Text>
            </View>
          )}
          {restaurant.isRecommended && (
            <View style={[styles.tag, styles.recommendedTag]}>
              <Text style={styles.tagText}>Recommended</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  imageContainer: {
    width: 100,
    height: 100,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  infoContainer: {
    flex: 1,
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#333333",
  },
  description: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: "#4A5D23",
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  popularTag: {
    backgroundColor: "#FFD700",
  },
  recommendedTag: {
    backgroundColor: "#4A5D23",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default RestaurantItem;
