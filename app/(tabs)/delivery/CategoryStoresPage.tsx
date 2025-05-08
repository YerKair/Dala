import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { getStoreImage } from "./utils/helpers";
import { useApi } from "./utils/apiService";

// Интерфейс для магазина
interface Store {
  id: string;
  name: string;
  description: string;
  category?: string;
  address?: string;
  isPopular?: boolean;
  isRecommended?: boolean;
}

// Компонент карточки магазина с поддержкой изображений
const StoreCard = ({
  store,
  onPress,
}: {
  store: Store;
  onPress: () => void;
}) => {
  const [storeImage, setStoreImage] = useState<string | null>(null);

  useEffect(() => {
    const loadStoreImage = async () => {
      try {
        const image = await getStoreImage(store.id);
        if (image) {
          setStoreImage(image);
        }
      } catch (error) {
        console.error("Error loading store image:", error);
      }
    };

    loadStoreImage();
  }, [store.id]);

  return (
    <TouchableOpacity style={styles.storeCard} onPress={onPress}>
      <View style={styles.storeImageContainer}>
        {storeImage ? (
          <Image source={{ uri: storeImage }} style={styles.storeImage} />
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="storefront-outline" size={30} color="#999" />
          </View>
        )}
      </View>
      <Text style={styles.storeName}>{store.name}</Text>
      <Text style={styles.storeCategory}>{store.category}</Text>
    </TouchableOpacity>
  );
};

export default function CategoryStoresPage() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const params = useLocalSearchParams();
  const { category } = params;
  const api = useApi();

  useEffect(() => {
    loadStores();
  }, []);

  // Filter stores based on search query
  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load stores from API
  const loadStores = async () => {
    setLoading(true);
    try {
      // Fetch restaurants from API
      const response = await api.getRestaurants();
      console.log("API response:", response);

      let storesList: Store[] = [];

      if (Array.isArray(response)) {
        // Map the API response to our Store interface
        storesList = response.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description || "No description available",
          category: item.category?.name || (category as string) || "General",
          address: item.address || "No address available",
          isPopular: item.is_popular || false,
          isRecommended: item.is_recommended || false,
        }));
      } else if (response.data && Array.isArray(response.data)) {
        // For paginated responses
        storesList = response.data.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description || "No description available",
          category: item.category?.name || (category as string) || "General",
          address: item.address || "No address available",
          isPopular: item.is_popular || false,
          isRecommended: item.is_recommended || false,
        }));
      }

      // If category is specified, filter stores by category
      if (category) {
        storesList = storesList.filter(
          (store) =>
            store.category?.toLowerCase() === category.toString().toLowerCase()
        );
      }

      setStores(storesList);
    } catch (error) {
      console.error("Error loading stores:", error);
      Alert.alert(
        "Error",
        "Failed to load stores. Check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  const goToStore = (storeId: string) => {
    router.push({
      pathname: "/(tabs)/delivery/products/ProductsPage",
      params: {
        storeId,
        fromScreen: "CategoryStoresPage",
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {category ? category : "Все магазины"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Feather
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск магазинов..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#4A5D23" />
          </View>
        ) : filteredStores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Магазины не найдены. Попробуйте изменить запрос поиска.
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.storesList}
            data={filteredStores}
            renderItem={({ item }) => (
              <StoreCard store={item} onPress={() => goToStore(item.id)} />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingLeft: 8,
  },
  storesList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
  },
  storeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  storeImage: {
    width: "100%",
    height: "100%",
  },
  noImageContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  storeName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  storeCategory: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
