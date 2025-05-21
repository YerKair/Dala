import { Tabs, usePathname } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons, AntDesign, FontAwesome5, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { globalState } from "../store/globalState";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

export default function TabLayout() {
  const pathname = usePathname();
  const [hasTaxiTrip, setHasTaxiTrip] = useState(globalState.activeTaxiTrip);

  useEffect(() => {
    // Check global state on each render
    setHasTaxiTrip(globalState.activeTaxiTrip);

    // If we're on the trip screen, set the flag
    if (pathname.includes("/taxi-service/trip")) {
      globalState.activeTaxiTrip = true;
      setHasTaxiTrip(true);
    }
  }, [pathname, globalState.activeTaxiTrip]);

  // More reliable path checking (case-insensitive)
  const isCheckoutScreen = () => {
    const path = pathname.toLowerCase();
    return (
      path.includes("checkout") ||
      path.includes("check-out") ||
      path.includes("chechoutpage") // Note: matching the typo in your routes
    );
  };

  const isCartScreen = () => {
    const path = pathname.toLowerCase();
    return path.includes("/cart") || path.includes("cartpage");
  };

  const isDeliveryScreen = () => {
    const path = pathname.toLowerCase();
    return (
      path.includes("delivery") ||
      path.includes("tracking") ||
      path.includes("trackingpage")
    );
  };

  // Screens where the tab bar should be hidden
  const shouldHideTabBar =
    pathname.includes("/taxi-service/taxi") ||
    pathname.includes("/taxi-service/trip") ||
    pathname.includes("/taxi-service/chat") ||
    isCartScreen() ||
    isCheckoutScreen() ||
    isDeliveryScreen();

  // Handler for navigating to taxi
  const navigateToTaxi = () => {
    // Force check global state before navigation
    console.log("Current taxi trip state:", globalState.activeTaxiTrip);

    if (globalState.activeTaxiTrip) {
      console.log("Navigating to trip screen");
      router.push("/(tabs)/taxi-service/trip");
    } else {
      console.log("Navigating to taxi screen");
      router.push("/(tabs)/taxi-service/taxi");
    }
  };

  // Handler for marketplace navigation
  const navigateToMarketplace = () => {
    router.push("/(tabs)/marketplacer/MarketplaceScreen");
  };

  // Handler for cart navigation
  const navigateToCart = () => {
    router.push("/(tabs)/delivery/delivery/CartPage");
  };

  if (shouldHideTabBar) {
    return (
      <Tabs
        screenOptions={{
          tabBarStyle: { display: "none" },
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="delivery/AdminPage" />
        <Tabs.Screen name="delivery/CategoryStoresPage" />
        <Tabs.Screen name="delivery/DeliverPage" />
        <Tabs.Screen name="delivery/delivery/CartPage" />
        <Tabs.Screen name="delivery/delivery/ChechoutPage" />
        <Tabs.Screen name="delivery/delivery/DeliveryTrackingPage" />
        <Tabs.Screen name="delivery/products/ProductsPage" />
        <Tabs.Screen name="marketplacer/CategoryPage" />
        <Tabs.Screen name="marketplacer/MarketplaceScreen" />
        <Tabs.Screen name="marketplacer/SubmitAdPage" />
        <Tabs.Screen name="taxi-service/CancelConfirmationDialog" />
        <Tabs.Screen name="taxi-service/chat" />
        <Tabs.Screen name="taxi-service/taxi" />
        <Tabs.Screen name="taxi-service/trip" />
        <Tabs.Screen name="ImagePickerTest" />
        <Tabs.Screen name="SimpleImagePickerTest" />
        <Tabs.Screen name="CategoryManagerTest" />
      </Tabs>
    );
  }

  return (
    <>
      <Image
        source={require("@/assets/images/tab-bar-bg.png")}
        style={styles.tabBarBackground}
        resizeMode="stretch"
      />

      <View style={styles.tabButtonsContainer}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/(tabs)")}
        >
          <Ionicons name="home-outline" size={22} color="#3c3c3c" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={navigateToTaxi}>
          <FontAwesome5 name="taxi" size={20} color="#3c3c3c" />
        </TouchableOpacity>

        <View style={styles.centerSpace} />

        <TouchableOpacity
          style={styles.tabItem}
          onPress={navigateToMarketplace}
        >
          <Ionicons name="cart-outline" size={22} color="#3c3c3c" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/delivery/DeliverPage")}
        >
          <FontAwesome5 name="box" size={20} color="#3c3c3c" />
        </TouchableOpacity>
      </View>

      {/* Center plus button */}
      <TouchableOpacity
        style={styles.addButtonContainer}
        onPress={navigateToCart}
      >
        <View style={styles.addButton}>
          <AntDesign name="plus" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Hidden tab bar for navigation */}
      <Tabs
        screenOptions={{
          tabBarStyle: { display: "none" },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="explore"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="delivery/StoreDetailPage"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="order-history"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile-information/settings"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile-information/change-password"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile-information/change-number"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile-information/apply-promocode"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="ImagePickerTest"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="SimpleImagePickerTest"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="CategoryManagerTest"
          options={{
            headerShown: false,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    width: width - 40,
    height: 70,
    borderRadius: 35,
    zIndex: 1,
  },
  tabButtonsContainer: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    height: 70,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 2,
  },
  tabItem: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  centerSpace: {
    width: 60,
    height: 60,
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 55,
    left: width / 2 - 28,
    zIndex: 3,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4A5D23",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4A5D23",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
});
