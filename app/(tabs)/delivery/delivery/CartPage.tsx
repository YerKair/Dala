import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import our utils
import { getProductImage } from "../utils/helpers";
import { getCategoryImage } from "../utils/CategoryManager";
import { useAuth } from "../../../auth/AuthContext";

// Types for Cart API response
interface Product {
  id: number;
  category_id: number;
  title: string;
  description: string;
  price: string;
  images: string | null;
  status: string;
}

interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  updated_at: string;
  product: Product;
  quantity?: number; // Added for UI purposes
}

// Type for CartItemComponent props
interface CartItemComponentProps {
  item: CartItem;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
}

// Cart Item Component
const CartItemComponent: React.FC<CartItemComponentProps> = ({
  item,
  onIncrement,
  onDecrement,
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Load product image when component mounts
  useEffect(() => {
    const loadImage = async () => {
      try {
        const image = await getProductImage(item.product_id.toString());
        setImageUri(image);
      } catch (error) {
        console.error("Error loading product image:", error);
      }
    };

    loadImage();
  }, [item.product_id]);

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemImageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.cartItemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cartItemImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color="#999" />
          </View>
        )}
      </View>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={2}>
          {item.product.title}
        </Text>
        <Text style={styles.cartItemPrice}>${item.product.price}</Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onDecrement(item.id)}
        >
          <Feather name="minus" size={18} color="#4A5D23" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity || 1}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onIncrement(item.id)}
        >
          <Feather name="plus" size={18} color="#4A5D23" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CartPage: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart when page is focused
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        loadCartItems();
      }
    }, [isAuthenticated])
  );

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        "Требуется авторизация",
        "Пожалуйста, войдите, чтобы просмотреть корзину",
        [
          {
            text: "OK",
            onPress: () => router.push("/auth/login"),
          },
        ]
      );
    }
  }, [isAuthenticated]);

  // Recalculate total price when cart items change
  useEffect(() => {
    calculateTotal();
  }, [cartItems]);

  // Load cart items from API
  const loadCartItems = async () => {
    setIsLoading(true);
    try {
      // Get token from AsyncStorage
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch("http://192.168.0.104:8000/api/cart", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cart: ${response.status}`);
      }

      const data = await response.json();
      console.log("Cart data loaded:", data.length, "items");

      // Add quantity property to each item (defaulting to 1)
      const itemsWithQuantity = data.map((item: CartItem) => ({
        ...item,
        quantity: 1, // Default quantity since the API doesn't provide it
      }));

      setCartItems(itemsWithQuantity);
    } catch (error) {
      console.error("Failed to load cart:", error);
      Alert.alert("Ошибка", "Не удалось загрузить вашу корзину");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total price
  const calculateTotal = () => {
    if (cartItems.length === 0) {
      setTotalPrice(0);
      return;
    }

    const total = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.product.price);
      const quantity = item.quantity || 1;
      return sum + price * quantity;
    }, 0);

    setTotalPrice(total);
  };

  // Increment quantity
  const incrementQuantity = async (id: number) => {
    try {
      const updatedItems = cartItems.map((item) => {
        if (item.id === id) {
          return { ...item, quantity: (item.quantity || 1) + 1 };
        }
        return item;
      });

      setCartItems(updatedItems);
    } catch (error) {
      console.error("Failed to update quantity:", error);
      Alert.alert("Ошибка", "Не удалось обновить количество товара");
    }
  };

  // Decrement quantity
  const decrementQuantity = async (id: number) => {
    try {
      const item = cartItems.find((item) => item.id === id);
      if (!item) return;

      if ((item.quantity || 1) > 1) {
        const updatedItems = cartItems.map((item) => {
          if (item.id === id) {
            return { ...item, quantity: (item.quantity || 1) - 1 };
          }
          return item;
        });

        setCartItems(updatedItems);
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
      Alert.alert("Ошибка", "Не удалось обновить количество товара");
    }
  };

  // Clear cart
  const clearCart = () => {
    Alert.alert("Очистка корзины", "Вы уверены, что хотите очистить корзину?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Очистить",
        style: "destructive",
        onPress: async () => {
          try {
            // Get token from AsyncStorage
            let token = await AsyncStorage.getItem("token");
            if (!token) {
              token = await AsyncStorage.getItem("userToken");
            }

            if (!token) {
              throw new Error("Токен авторизации не найден");
            }

            console.log("Clearing cart...");

            // Call the API to clear the cart - using DELETE method
            const response = await fetch("http://192.168.0.104:8000/api/cart", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            });

            console.log("Clear cart response status:", response.status);

            if (!response.ok) {
              const responseText = await response.text();
              console.error("Clear cart error:", responseText);
              throw new Error(`Failed to clear cart: ${response.status}`);
            }

            setCartItems([]);
            Alert.alert("Успешно", "Корзина очищена");
          } catch (error) {
            console.error("Failed to clear cart:", error);
            Alert.alert("Ошибка", "Не удалось очистить корзину");
          }
        },
      },
    ]);
  };

  // Proceed to checkout
  const proceedToCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Требуется авторизация",
        "Пожалуйста, войдите, чтобы перейти к оформлению",
        [
          {
            text: "OK",
            onPress: () => router.push("/auth/login"),
          },
        ]
      );
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert("Пустая корзина", "Добавьте товары в корзину для оформления");
      return;
    }

    router.push("/(modals)/CheckoutPage");
  };

  // Go back
  const goBack = () => {
    router.push("/delivery/products/ProductsPage");
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4A5D23" />
        <Text style={styles.loadingText}>Загрузка корзины...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Моя корзина</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
            <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>

      {/* Cart items */}
      {cartItems.length > 0 ? (
        <>
          <FlatList
            data={cartItems}
            renderItem={({ item }) => (
              <CartItemComponent
                item={item}
                onIncrement={incrementQuantity}
                onDecrement={decrementQuantity}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[
              styles.cartList,
              { paddingBottom: 80 + insets.bottom },
            ]}
          />

          {/* Checkout section */}
          <View
            style={[
              styles.checkoutContainer,
              { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
            ]}
          >
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                Итого ({cartItems.length} товаров)
              </Text>
              <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={proceedToCheckout}
            >
              <Text style={styles.checkoutButtonText}>Оформить заказ</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyCartContainer}>
          <MaterialIcons name="shopping-cart" size={80} color="#CCCCCC" />
          <Text style={styles.emptyCartTitle}>Корзина пуста</Text>
          <Text style={styles.emptyCartText}>
            Похоже, вы еще не добавили товары в корзину.
          </Text>
          <TouchableOpacity style={styles.startShoppingButton} onPress={goBack}>
            <Text style={styles.startShoppingButtonText}>Начать покупки</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
  clearButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  cartList: {
    padding: 16,
    paddingBottom: 100,
  },
  cartItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cartItemImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
  },
  cartItemImage: {
    width: "100%",
    height: "100%",
  },
  cartItemImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4A5D23",
  },
  cartItemActions: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 10,
  },
  checkoutContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: "#666666",
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4A5D23",
  },
  checkoutButton: {
    backgroundColor: "#4A5D23",
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyCartTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 12,
    color: "#333333",
  },
  emptyCartText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 24,
  },
  startShoppingButton: {
    backgroundColor: "#4A5D23",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  startShoppingButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  demoButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E5F1E0",
  },
  demoButtonText: {
    color: "#4A5D23",
    fontSize: 14,
  },
});

export default CartPage;
