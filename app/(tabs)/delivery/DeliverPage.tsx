import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import {
  Ionicons,
  Feather,
  MaterialIcons,
  FontAwesome,
  AntDesign,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;

// Store interface
interface Store {
  id: number;
  user_id: number;
  name: string;
  description: string;
  address: string;
  category: string;
  latitude: string;
  longitude: string;
  image_path: string;
  created_at: string;
  updated_at: string;
  isPopular?: boolean;
  isRecommended?: boolean;
  products?: any[];
}

// Category interface
interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Add demo data at the top of the file, after imports
const demoStores: Store[] = [
  {
    id: 1,
    user_id: 1,
    name: "Fresh Market",
    description: "Fresh groceries and daily products",
    address: "123 Main St",
    category: "Supermarkets",
    latitude: "43.238949",
    longitude: "76.889709",
    image_path: "/images/stores/market.jpg",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isPopular: true,
    isRecommended: true,
  },
  {
    id: 2,
    user_id: 2,
    name: "Green Grocery",
    description: "Organic and healthy products",
    address: "456 Oak St",
    category: "Supermarkets",
    latitude: "43.238949",
    longitude: "76.889709",
    image_path: "/images/stores/grocery.jpg",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isPopular: true,
    isRecommended: false,
  },
];

// Category component
const CategoryItem = ({
  item,
  selected,
  onSelect,
}: {
  item: Category;
  selected: boolean;
  onSelect: () => void;
}) => (
  <TouchableOpacity
    style={[styles.categoryItem, selected && styles.categoryItemSelected]}
    onPress={onSelect}
    activeOpacity={0.7}
  >
    <View style={styles.categoryIconContainer}>{item.icon}</View>
    <Text
      style={[styles.categoryText, selected && styles.categoryTextSelected]}
    >
      {item.name}
    </Text>
  </TouchableOpacity>
);

// Store Card Component
const StoreCard = ({
  store,
  onPress,
  style,
}: {
  store: Store;
  onPress: () => void;
  style?: any;
}) => {
  const { t } = useTranslation();
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        if (!store.id) {
          console.log("[DEBUG] Store has no ID, cannot load image");
          return;
        }

        // First, try to load from local storage
        const localImage = await AsyncStorage.getItem(
          `store_image_${store.id}`
        );

        if (localImage) {
          console.log(`[DEBUG] Found local image for store ${store.id}`);
          setStoreImage(localImage);
          return;
        }

        // If not in local storage and we have an image path, process it
        if (store.image_path) {
          console.log(`[DEBUG] Processing image path for store ${store.id}`);

          // Check if it's a full URL or a relative path
          const imageUrl = store.image_path.startsWith("http")
            ? store.image_path
            : `http://192.168.0.109:8000${store.image_path}`;

          setStoreImage(imageUrl);

          // Save URL to local storage for future use
          try {
            await AsyncStorage.setItem(`store_image_${store.id}`, imageUrl);
            console.log(`[DEBUG] Saved image URL for store ${store.id}`);
          } catch (saveError) {
            console.error(
              `[DEBUG] Failed to save image URL for store ${store.id}:`,
              saveError
            );
          }
        } else {
          console.log(`[DEBUG] No image path for store ${store.id}`);
          setImageError(true);
        }
      } catch (error) {
        console.error(
          `[DEBUG] Error loading image for store ${store.id}:`,
          error
        );
        setImageError(true);
      }
    };

    loadImage();
  }, [store.id, store.image_path]);

  const handleImageError = () => {
    console.log(
      `[DEBUG] Image load failed for store ${store.id}, using placeholder`
    );
    setImageError(true);
  };

  return (
    <TouchableOpacity
      style={[styles.storeCard, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.storeImageContainer}>
        {!imageError && storeImage ? (
          <Image
            source={{ uri: storeImage }}
            style={styles.storeImage}
            resizeMode="cover"
            onError={handleImageError}
          />
        ) : (
          <View style={styles.storeImagePlaceholder}>
            <MaterialIcons name="store" size={40} color="#E0E0E0" />
          </View>
        )}
        {store.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.badgeText}>{t("popular")}</Text>
          </View>
        )}
      </View>
      <View style={styles.storeDetails}>
        <Text style={styles.storeName} numberOfLines={1}>
          {store.name}
        </Text>
        <Text style={styles.storeCategory}>{store.category || t("store")}</Text>
        <View style={styles.ratingContainer}>
          <AntDesign name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>4.8</Text>
          <Text style={styles.ratingCount}>(120+)</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Section Header Component
const SectionHeader = ({
  title,
  onViewAll,
}: {
  title: string;
  onViewAll: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
        <Text style={styles.viewAllText}>{t("seeAll")}</Text>
        <AntDesign name="arrowright" size={16} color="#4A5D23" />
      </TouchableOpacity>
    </View>
  );
};

// Promotion Banner Component
const PromotionBanner = () => (
  <Image
    source={require("../../../assets/images/delivery-banner.png")}
    style={styles.promotionBanner}
    resizeMode="cover"
  />
);

export default function DeliveryPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [popularStores, setPopularStores] = useState<Store[]>([]);
  const [recommendedStores, setRecommendedStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilteringLoading, setIsFilteringLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categoryKey, setCategoryKey] = useState<number>(0); // Ключ для перерендера категорий

  // Define categories
  const categories: Category[] = [
    {
      id: "all",
      name: t("all"),
      icon: <MaterialIcons name="apps" size={24} color="#4A5D23" />,
    },
    {
      id: "Courier delivery",
      name: t("courier"),
      icon: <MaterialIcons name="local-shipping" size={24} color="#4A5D23" />,
    },
    {
      id: "Supermarkets",
      name: t("supermarkets"),
      icon: <MaterialIcons name="shopping-cart" size={24} color="#4A5D23" />,
    },
    {
      id: "Flowers",
      name: t("flowers"),
      icon: <MaterialIcons name="local-florist" size={24} color="#4A5D23" />,
    },
    {
      id: "Pharmacy",
      name: t("pharmacy"),
      icon: <MaterialIcons name="local-hospital" size={24} color="#4A5D23" />,
    },
  ];

  // Fetch stores data
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let token = await AsyncStorage.getItem("token");
        if (!token) {
          token = await AsyncStorage.getItem("userToken");
        }

        console.log(
          "Attempting to fetch stores from:",
          "http://192.168.0.109:8000/api/restaurants"
        );

        const response = await fetch(
          "http://192.168.0.109:8000/api/restaurants",
          {
            headers: {
              Accept: "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        console.log("Response status:", response.status);
        const responseText = await response.text();
        console.log("Response body:", responseText);

        if (response.status === 401) {
          console.log("User is not authorized, using demo data");
          // Use demo data for unauthorized users
          const processedDemoData = demoStores.map((store) => ({
            ...store,
            isPopular: store.isPopular || Math.random() > 0.7,
            isRecommended: store.isRecommended || Math.random() > 0.7,
          }));

          setStores(processedDemoData);
          setFilteredStores(processedDemoData);
          setPopularStores(
            processedDemoData.filter((store) => store.isPopular)
          );
          setRecommendedStores(
            processedDemoData.filter((store) => store.isRecommended)
          );

          // Store demo data in AsyncStorage
          await AsyncStorage.setItem(
            "deliveryStores",
            JSON.stringify(processedDemoData)
          );
          setError("Showing demo data - please log in to see actual stores");
          return;
        }

        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status}, body: ${responseText}`
          );
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Error parsing response:", parseError);
          throw new Error("Invalid JSON response from server");
        }

        console.log("Successfully parsed stores data:", data);

        const processedData = data.map((store: any) => ({
          ...store,
          isPopular: store.isPopular || Math.random() > 0.7,
          isRecommended: store.isRecommended || Math.random() > 0.7,
          category:
            store.category ||
            categories[Math.floor(Math.random() * (categories.length - 1)) + 1]
              .id,
        }));

        setStores(processedData);
        setFilteredStores(processedData);
        setPopularStores(
          processedData.filter((store: Store) => store.isPopular)
        );
        setRecommendedStores(
          processedData.filter((store: Store) => store.isRecommended)
        );

        // Store data in AsyncStorage for offline access
        await AsyncStorage.setItem(
          "deliveryStores",
          JSON.stringify(processedData)
        );
      } catch (error) {
        console.error("Error fetching stores:", error);
        setError(t("failedToLoadStores"));

        // Try to load from AsyncStorage if network request fails
        try {
          console.log("Attempting to load stores from AsyncStorage");
          const storedData = await AsyncStorage.getItem("deliveryStores");
          if (storedData) {
            console.log("Found stored data in AsyncStorage");
            const parsedData = JSON.parse(storedData);
            setStores(parsedData);
            setFilteredStores(parsedData);
            setPopularStores(
              parsedData.filter((store: Store) => store.isPopular)
            );
            setRecommendedStores(
              parsedData.filter((store: Store) => store.isRecommended)
            );
            setError(t("showingSavedData"));
          } else {
            console.log(
              "No stored data found in AsyncStorage, using demo data"
            );
            // Use demo data as last resort
            setStores(demoStores);
            setFilteredStores(demoStores);
            setPopularStores(demoStores.filter((store) => store.isPopular));
            setRecommendedStores(
              demoStores.filter((store) => store.isRecommended)
            );
            setError(
              "Showing demo data - please check your internet connection"
            );
          }
        } catch (storageError) {
          console.error("Error accessing storage:", storageError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStores();
  }, [t]);

  // Filter stores based on search query and category
  useEffect(() => {
    console.log(`Filtering by category: ${selectedCategory}`);

    let filtered = [...stores];

    // Apply category filter if not "all"
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (store) =>
          store.category &&
          store.category.toLowerCase() === selectedCategory.toLowerCase()
      );
      console.log(`Filtered by category: ${filtered.length} stores remaining`);
    }

    // Apply search filter if query exists
    if (searchQuery.trim() !== "") {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (store) =>
          store.name.toLowerCase().includes(lowercasedQuery) ||
          (store.description &&
            store.description.toLowerCase().includes(lowercasedQuery)) ||
          (store.address &&
            store.address.toLowerCase().includes(lowercasedQuery))
      );
      console.log(`Filtered by search: ${filtered.length} stores remaining`);
    }

    setFilteredStores(filtered);

    // Also update popular and recommended lists with the same filters
    const newPopularStores = stores
      .filter((store) => store.isPopular)
      .filter(
        (store) =>
          selectedCategory === "all" ||
          (store.category &&
            store.category.toLowerCase() === selectedCategory.toLowerCase())
      );

    const newRecommendedStores = stores
      .filter((store) => store.isRecommended)
      .filter(
        (store) =>
          selectedCategory === "all" ||
          (store.category &&
            store.category.toLowerCase() === selectedCategory.toLowerCase())
      );

    setPopularStores(newPopularStores);
    setRecommendedStores(newRecommendedStores);

    console.log(`Updated popular stores: ${newPopularStores.length}`);
    console.log(`Updated recommended stores: ${newRecommendedStores.length}`);
  }, [searchQuery, stores, selectedCategory]);

  // Навигация к деталям магазина
  const navigateToStoreDetail = (storeId: number) => {
    router.push({
      pathname: "/(tabs)/delivery/StoreDetailsPage",
      params: {
        storeId: storeId.toString(),
        fromScreen: "DeliverPage",
      },
    });
  };

  // Навигация ко всем магазинам
  const navigateToAllStores = (categoryId?: string) => {
    router.push({
      pathname: "/(tabs)/delivery/CategoryStoresPage",
      params: {
        category: categoryId,
        fromScreen: "DeliverPage",
      },
    });
  };

  // Navigate to admin page
  const navigateToAdminPage = () => {
    if (!isAuthenticated) {
      Alert.alert(t("authRequired"), t("loginToManageStores"), [
        {
          text: t("login"),
          onPress: () => router.push("/auth/login"),
        },
        {
          text: t("cancel"),
          style: "cancel",
        },
      ]);
      return;
    }

    router.push("./AdminPage");
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    console.log(`Changing category from ${selectedCategory} to ${categoryId}`);

    // Показываем индикатор загрузки
    setIsFilteringLoading(true);

    // Обновляем выбранную категорию
    setSelectedCategory(categoryId);

    // Принудительно обновляем состояние для перерисовки компонентов
    setCategoryKey((prevKey) => prevKey + 1);

    // Скрываем индикатор загрузки после небольшой задержки для лучшего UX
    setTimeout(() => {
      setIsFilteringLoading(false);
    }, 300);
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A5D23" />
          <Text style={styles.loadingText}>{t("loadingStores")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("delivery")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("searchDeliveryAddress")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Promotion Banner */}
        <PromotionBanner />

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.categoryTitle}>{t("category")}</Text>
          <ScrollView
            key={`categories-${categoryKey}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <CategoryItem
                key={`${category.id}-${categoryKey}`}
                item={category}
                selected={selectedCategory === category.id}
                onSelect={() => handleCategorySelect(category.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Recommended Stores */}
        {recommendedStores.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t("recommendedForYou")}
              onViewAll={() => navigateToAllStores("all")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalList}
              contentContainerStyle={styles.horizontalListContent}
            >
              {recommendedStores.map((store) => (
                <StoreCard
                  key={`recommended-${store.id}`}
                  store={store}
                  onPress={() => navigateToStoreDetail(store.id)}
                  style={styles.horizontalCard}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Popular Stores */}
        {popularStores.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t("popularElections")}
              onViewAll={() => navigateToAllStores("all")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalList}
              contentContainerStyle={styles.horizontalListContent}
            >
              {popularStores.map((store) => (
                <StoreCard
                  key={`popular-${store.id}`}
                  store={store}
                  onPress={() => navigateToStoreDetail(store.id)}
                  style={styles.horizontalCard}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Stores */}
        <View style={styles.allStoresSection}>
          <Text style={styles.allStoresTitle}>{t("allStores")}</Text>

          {/* Error message if any */}
          {error && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Add Store Button */}
          <TouchableOpacity
            style={styles.addStoreButton}
            onPress={navigateToAdminPage}
          >
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.addStoreText}>{t("addStore")}</Text>
          </TouchableOpacity>

          {/* Loading indicator for filtering */}
          {isFilteringLoading && (
            <View style={styles.filteringLoadingContainer}>
              <ActivityIndicator size="small" color="#4A5D23" />
              <Text style={styles.filteringLoadingText}>{t("filtering")}</Text>
            </View>
          )}

          {/* Grid of stores */}
          {filteredStores.length > 0 ? (
            <View style={styles.storesGrid}>
              {filteredStores.map((store, index) => (
                <StoreCard
                  key={`all-${store.id}`}
                  store={store}
                  onPress={() => navigateToStoreDetail(store.id)}
                  style={styles.gridCard}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="store" size={64} color="#E0E0E0" />
              <Text style={styles.emptyText}>
                {searchQuery.length > 0
                  ? t("noResultsFor", { query: searchQuery })
                  : t("noStoresFound")}
              </Text>
              <Text style={styles.emptySubText}>
                {searchQuery.length > 0
                  ? t("tryChangingSearch")
                  : t("pressAddStore")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEEEEE",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 23,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
  },
  promotionBanner: {
    width: SCREEN_WIDTH - 32,
    height: 160,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#f0f0f0",
  },
  categoriesSection: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFEFEF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryItemSelected: {
    backgroundColor: "#FF6C44",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#757575",
  },
  categoryTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#4A5D23",
    fontWeight: "500",
    marginRight: 4,
  },
  horizontalList: {
    paddingLeft: 16,
  },
  horizontalListContent: {
    paddingRight: 16,
  },
  horizontalCard: {
    width: 180,
    marginRight: 16,
  },
  storeCard: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  storeImageContainer: {
    height: 120,
    width: "100%",
    position: "relative",
  },
  storeImage: {
    width: "100%",
    height: "100%",
  },
  storeImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  popularBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
  },
  storeDetails: {
    padding: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  storeCategory: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginLeft: 4,
    marginRight: 2,
  },
  ratingCount: {
    fontSize: 12,
    color: "#999",
  },
  allStoresSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  allStoresTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  storesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -5, // Counteract the padding in the cards
  },
  gridCard: {
    width: CARD_WIDTH,
    marginHorizontal: 5,
    marginBottom: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFEEEE",
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#FF3B30",
    marginLeft: 8,
    fontSize: 14,
  },
  addStoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A5D23",
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addStoreText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  filteringLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#FFEEEE",
    borderRadius: 8,
    marginBottom: 16,
  },
  filteringLoadingText: {
    color: "#4A5D23",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
});
