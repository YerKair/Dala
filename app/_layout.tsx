import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { TaxiProvider } from "./context/TaxiContent";
import { AuthProvider } from "./auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View, StyleSheet } from "react-native";

import { useColorScheme } from "@/hooks/useColorScheme";

// Import i18n
import "@/app/i18n/i18n";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error("Error checking auth status:", error);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // Hide splash screen when fonts are loaded and auth is checked
  useEffect(() => {
    if (loaded && authChecked) {
      SplashScreen.hideAsync();

      // Navigate to the appropriate initial route
      if (isAuthenticated) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [loaded, authChecked, isAuthenticated]);

  if (!loaded || !authChecked) {
    return null;
  }

  return (
    <AuthProvider>
      <TaxiProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="taxi"
              options={{
                headerShown: false,
                // Важно: добавьте эту опцию, чтобы таб-бар не отображался на этом экране
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen
              name="profile-information-views"
              options={{ headerShown: false }}
            />
            {/* Remove the redirect property from index */}
            <Stack.Screen name="index" />
            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </TaxiProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
