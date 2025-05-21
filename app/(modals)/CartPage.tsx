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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProductImage } from "../(tabs)/delivery/utils/helpers";
import { useTranslation } from "react-i18next";

// CartItem interface
interface CartItem {
  id: string;
  productId: string;
  storeId: string;
  name: string;
  price: string;
  quantity: number;
  image?: string | null;
}

// Cart Item Component
const CartItemComponent = ({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const [productImage, setProductImage] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      const image = await getProductImage(item.productId);
      setProductImage(image);
    };
    loadImage();
  }, [item.productId]);

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemImageContainer}>
        {productImage ? (
          <Image
            source={{ uri: productImage }}
            style={styles.cartItemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cartItemImagePlaceholder}>
            <Feather name="image" size={24} color="#CCC" />
          </View>
        )}
      </View>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>${item.price}</Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onDecrement(item.id)}
        >
          <Feather name="minus" size={18} color="#4A5D23" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onIncrement(item.id)}
        >
          <Feather name="plus" size={18} color="#4A5D23" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(item.id)}
      >
        <Feather name="trash-2" size={18} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
};

export default function CartPage() {
  const insets = useSafeAreaInsets();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const { t } = useTranslation();

  // Load cart items on component mount
  useEffect(() => {
    loadCartItems();
  }, []);

  // Calculate total price whenever cart items change
  useEffect(() => {
    calculateTotal();
  }, [cartItems]);

  // Load cart items from AsyncStorage
  const loadCartItems = async () => {
    try {
      const storedCart = await AsyncStorage.getItem("cart");
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
      Alert.alert("Error", "Failed to load your cart");
    }
  };

  // Save cart items to AsyncStorage
  const saveCartItems = async (items: CartItem[]) => {
    try {
      await AsyncStorage.setItem("cart", JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart:", error);
      Alert.alert("Error", "Failed to update your cart");
    }
  };

  // Calculate total price
  const calculateTotal = () => {
    const total = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);
    setTotalPrice(total);
  };

  // Increment item quantity
  const incrementQuantity = (id: string) => {
    const updatedItems = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    setCartItems(updatedItems);
    saveCartItems(updatedItems);
  };

  // Decrement item quantity
  const decrementQuantity = (id: string) => {
    const updatedItems = cartItems.map((item) =>
      item.id === id && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item
    );
    setCartItems(updatedItems);
    saveCartItems(updatedItems);
  };

  // Remove item from cart
  const removeItem = (id: string) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updatedItems = cartItems.filter((item) => item.id !== id);
            setCartItems(updatedItems);
            saveCartItems(updatedItems);
          },
        },
      ]
    );
  };

  // Clear cart
  const clearCart = () => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to clear your entire cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setCartItems([]);
            saveCartItems([]);
          },
        },
      ]
    );
  };

  // Proceed to checkout - изменен путь
  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert("Empty Cart", "Please add items to your cart to checkout");
      return;
    }
    router.push("/(modals)/CheckoutPage");
  };

  // Go back
  const goBack = () => {
    router.back();
  };

  // Add sample items (for testing only - remove in production)
  const addSampleItems = async () => {
    const sampleItems: CartItem[] = [
      {
        id: "cart1",
        productId: "product1",
        storeId: "store1",
        name: "Fresh Apples",
        price: "3.99",
        quantity: 2,
      },
      {
        id: "cart2",
        productId: "product2",
        storeId: "store1",
        name: "Organic Milk",
        price: "4.50",
        quantity: 1,
      },
      {
        id: "cart3",
        productId: "product3",
        storeId: "store1",
        name: "Whole Grain Bread",
        price: "2.99",
        quantity: 1,
      },
    ];
    setCartItems(sampleItems);
    await saveCartItems(sampleItems);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("cartPage.title")}</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
            <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>

      {/* Cart Items */}
      {cartItems.length > 0 ? (
        <>
          <FlatList
            data={cartItems}
            renderItem={({ item }) => (
              <CartItemComponent
                item={item}
                onIncrement={incrementQuantity}
                onDecrement={decrementQuantity}
                onRemove={removeItem}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.cartList,
              { paddingBottom: 80 + insets.bottom },
            ]}
          />

          {/* Cart Summary and Checkout */}
          <View
            style={[
              styles.checkoutContainer,
              { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
            ]}
          >
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                {t("cartPage.totalItems", { count: cartItems.length })}
              </Text>
              <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={proceedToCheckout}
            >
              <Text style={styles.checkoutButtonText}>
                {t("cartPage.proceedToCheckout")}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyCartContainer}>
          <MaterialIcons name="shopping-cart" size={80} color="#CCCCCC" />
          <Text style={styles.emptyCartTitle}>
            {t("cartPage.emptyCartTitle")}
          </Text>
          <Text style={styles.emptyCartText}>
            {t("cartPage.emptyCartText")}
          </Text>
          <TouchableOpacity style={styles.startShoppingButton} onPress={goBack}>
            <Text style={styles.startShoppingButtonText}>
              {t("cartPage.startShopping")}
            </Text>
          </TouchableOpacity>

          {/* For demo purposes only */}
          <TouchableOpacity style={styles.demoButton} onPress={addSampleItems}>
            <Text style={styles.demoButtonText}>
              {t("cartPage.addSampleItems")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

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
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
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
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFEEEE",
    justifyContent: "center",
    alignItems: "center",
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
