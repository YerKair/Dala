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
  TextInput,
  FlatList,
  ImageSourcePropType,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";

// Search Icon Component
const SearchIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="gray"
    strokeWidth={1.5}
  >
    <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Svg>
);

// Back Button Component
const BackButton = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth={1.5}
  >
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

// Add to Cart Icon Component
const PlusIcon = () => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth={1.5}
  >
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

// Define product interface
interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  image?: ImageSourcePropType; // Optional because user-added products might not have images
  imageUri?: string; // For storing image paths from user uploads
}

// Product Item Component
interface ProductItemProps {
  item: Product;
}

const ProductItem = ({ item }: ProductItemProps) => {
  const { t } = useTranslation();
  const navigateToProductDetail = () => {
    router.push({
      pathname: "/ProductDetailPage",
      params: { id: item.id },
    });
  };

  return (
    <TouchableOpacity
      style={styles.productItem}
      onPress={navigateToProductDetail}
    >
      {item.image ? (
        <Image
          source={item.image}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : item.imageUri ? (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.productImage, styles.noImage]}>
          <Text>{t("marketplace.productItem.noImage")}</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productTitle}>{item.title}</Text>
        <Text style={styles.productDescription}>{item.description}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
      </View>
      <View style={styles.addButton}>
        <PlusIcon />
      </View>
    </TouchableOpacity>
  );
};

// Dropdown Component
interface DropdownProps {
  title: string;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

const Dropdown = ({ title, options, selected, onSelect }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{title}</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text>{selected}</Text>
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="black"
          strokeWidth={1.5}
        >
          <Path d={isOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </Svg>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownMenu}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              <Text>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function CategoryPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const category: string = params.category as string;

  const [categoryFilter, setCategoryFilter] = useState(
    t("marketplace.categoryPage.all")
  );
  const [conditionFilter, setConditionFilter] = useState(
    t("marketplace.categoryPage.all")
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use React's useEffect to fetch products from storage when component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching products for category:", category);

        // Here you would fetch stored products
        const storedProductsJSON = await AsyncStorage.getItem(
          "marketplace_products"
        );
        if (storedProductsJSON) {
          console.log("Products data retrieved");
          const allProducts = JSON.parse(storedProductsJSON) as Product[];
          console.log("Total products:", allProducts.length);

          // Filter products by current category
          let filteredProducts = allProducts.filter((product) => {
            if (
              category === t("marketplace.categoryPage.all") ||
              product.category === category
            ) {
              if (
                conditionFilter === t("marketplace.categoryPage.all") ||
                product.condition === conditionFilter
              ) {
                return true;
              }
            }
            return false;
          });
          console.log("Filtered products count:", filteredProducts.length);

          setProducts(filteredProducts);
        } else {
          console.log("No products found in storage");
          setProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setError(t("marketplace.categoryPage.failedToLoad"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [category, categoryFilter, conditionFilter]);

  // Go back function
  const goBack = () => {
    router.push("/marketplacer/MarketplaceScreen");
  };

  // Retry loading function
  const retryLoading = () => {
    setIsLoading(true);
    setError(null);
    // Re-fetch products
    fetchProducts();
  };

  // Function to fetch products (extracted for reuse)
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Here you would fetch stored products
      const storedProductsJSON = await AsyncStorage.getItem(
        "marketplace_products"
      );
      if (storedProductsJSON) {
        const allProducts = JSON.parse(storedProductsJSON) as Product[];

        // Filter products by current category
        let filteredProducts = allProducts.filter((product) => {
          if (
            category === t("marketplace.categoryPage.all") ||
            product.category === category
          ) {
            if (
              conditionFilter === t("marketplace.categoryPage.all") ||
              product.condition === conditionFilter
            ) {
              return true;
            }
          }
          return false;
        });

        setProducts(filteredProducts);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(t("marketplace.categoryPage.failedToLoad"));
    } finally {
      setIsLoading(false);
    }
  };

  // Content to show based on loading and error states
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <Text>{t("marketplace.categoryPage.loadingProducts")}</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
            <Text style={styles.retryButtonText}>
              {t("marketplace.categoryPage.retryLoading")}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (products.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text>{t("marketplace.categoryPage.noProducts")}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={products}
        renderItem={({ item }) => <ProductItem item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.productList}
      />
    );
  };

  // Condition options
  const conditionOptions = [
    t("marketplace.categoryPage.all"),
    t("marketplace.categoryPage.new"),
    t("marketplace.categoryPage.used"),
    t("marketplace.categoryPage.damaged"),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <BackButton />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchIcon />
        <TextInput
          style={styles.searchInput}
          placeholder={t("search")}
          placeholderTextColor="#888"
        />
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>
          {t("marketplace.categoryPage.filter")}
        </Text>
        <View style={styles.filtersRow}>
          <Dropdown
            title={t("marketplace.categoryPage.condition")}
            options={conditionOptions}
            selected={conditionFilter}
            onSelect={setConditionFilter}
          />
        </View>
      </View>

      {/* Product List */}
      <View style={styles.centerContainer}>{renderContent()}</View>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  headerTitle: {
    fontWeight: "bold",
    fontSize: 22,
    color: "#000000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginTop: 5,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
  },
  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dropdownContainer: {
    width: "48%",
    marginBottom: 10,
  },
  dropdownLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  dropdown: {
    backgroundColor: "#F0F0F0",
    padding: 10,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownMenu: {
    position: "absolute",
    top: 65,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  productList: {
    padding: 16,
  },
  productItem: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    marginBottom: 15,
    overflow: "hidden",
  },
  productImage: {
    width: 100,
    height: 100,
  },
  productInfo: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  productDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 5,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginRight: 10,
  },
  noImage: {
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#4C6A2E",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "500",
  },
});
