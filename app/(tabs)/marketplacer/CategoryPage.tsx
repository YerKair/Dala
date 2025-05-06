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
          <Text>No Image</Text>
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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const category: string = params.category as string;

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [conditionFilter, setConditionFilter] = useState("All");
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
          const filteredProducts = allProducts.filter(
            (product) => product.category === category || category === "All"
          );

          console.log("Filtered products:", filteredProducts.length);
          setProducts(filteredProducts);
        } else {
          console.log("No products found in storage");
          setProducts([]);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to load products");
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  // Apply filters to products
  const filteredProducts = products.filter((product) => {
    // Apply category filter if not "All"
    const matchCategory =
      categoryFilter === "All" || product.category === categoryFilter;

    // Apply condition filter if not "All"
    const matchCondition =
      conditionFilter === "All" || product.condition === conditionFilter;

    return matchCategory && matchCondition;
  });

  // Function to navigate back
  const goBack = () => {
    router.push("/(tabs)/marketplacer/MarketplaceScreen"); // Navigate specifically to marketplace
  };

  // Function to retry loading
  const retryLoading = () => {
    setProducts([]);
    setIsLoading(true);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <BackButton />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category || "Household goods"}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchIcon />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#888"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filters:</Text>
        <View style={styles.filtersRow}>
          <Dropdown
            title="Category"
            options={["All", "Furniture", "Tables", "Chairs", "Sofas"]}
            selected={categoryFilter}
            onSelect={setCategoryFilter}
          />
          <Dropdown
            title="Condition"
            options={["All", "New", "Used", "Damaged"]}
            selected={conditionFilter}
            onSelect={setConditionFilter}
          />
        </View>
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Product Count */}
          <View style={styles.productCountContainer}>
            <Text style={styles.productCount}>
              {filteredProducts.length > 0
                ? `We found ${filteredProducts.length} ads`
                : "No products found in this category"}
            </Text>
          </View>

          {/* Products List */}
          {filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts}
              renderItem={({ item }) => <ProductItem item={item} />}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContainer,
                { paddingBottom: 80 + insets.bottom },
              ]}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No products yet</Text>
              <Text style={styles.emptyStateSubText}>
                Be the first to add a product in this category
              </Text>
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => router.push("/(tabs)/marketplacer/SubmitAdPage")}
              >
                <Text style={styles.addProductButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
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
  filtersContainer: {
    paddingHorizontal: 16,
    marginTop: 5,
  },
  filtersTitle: {
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
  productCountContainer: {
    paddingHorizontal: 16,
    marginTop: 5,
    marginBottom: 10,
  },
  productCount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  listContainer: {
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
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  addProductButton: {
    backgroundColor: "#4C6A2E",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addProductButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  noImage: {
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
