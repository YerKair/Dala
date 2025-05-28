// app/auth/login.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Import translation hook
import { useTranslation } from "react-i18next";

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  // Initialize translation hook
  const { t } = useTranslation();

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Переход на страницу регистрации
  const goToSignUp = (): void => {
    router.replace("/auth/register");
  };

  // Функция авторизации
  const handleLogin = async (): Promise<void> => {
    // Validate email
    if (!email.trim()) {
      setErrorMessage(t("enterEmail"));
      return;
    }

    if (!validateEmail(email.trim())) {
      setErrorMessage(t("invalidEmail"));
      return;
    }

    // Validate password
    if (!password.trim()) {
      setErrorMessage(t("enterPassword"));
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Прямой запрос к API без абстракций - для отладки
      const response = await fetch("http://192.168.0.109:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const responseData = await response.text();
      console.log("Ответ сервера (raw):", responseData);

      let parsedData;
      try {
        parsedData = JSON.parse(responseData);
      } catch (e) {
        console.error("Ошибка парсинга JSON:", e);
        setErrorMessage(t("invalidServerResponse"));
        return;
      }

      if (response.ok && parsedData.token) {
        console.log("Успешный вход, токен:", parsedData.token);
        await login(parsedData.user, parsedData.token);
        router.replace("/(tabs)");
      } else {
        // Ищем сообщение об ошибке в ответе
        const errorMsg =
          parsedData.message || parsedData.error || t("validationError");
        console.error("Ошибка входа:", errorMsg, parsedData);

        // Более подробное логирование ошибок валидации
        if (parsedData.errors) {
          console.log("Детали ошибок валидации:", parsedData.errors);

          // Extract and display specific validation errors
          const errorDetails = Object.values(parsedData.errors)
            .flat()
            .join(", ");
          setErrorMessage(errorDetails || errorMsg);
        } else {
          setErrorMessage(errorMsg);
        }

        Alert.alert(t("loginError"), errorMsg);
      }
    } catch (error) {
      console.error("Исключение при входе:", error);
      setErrorMessage(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundOverlay}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("appName")}</Text>
          <Text style={styles.subtitle}>{t("appSlogan")}</Text>
        </View>

        <View style={styles.authContainer}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity onPress={goToSignUp} style={styles.tab}>
              <Text style={styles.tabText}>{t("register")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, styles.activeTab]}>
              <Text style={[styles.tabText, styles.activeTabText]}>
                {t("login")}
              </Text>
              <View style={styles.activeIndicator} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputsContainer}>
            {errorMessage && (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder={t("email")}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="emailInput"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t("password")}
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                testID="passwordInput"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                testID="togglePassword"
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#555"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleLogin}
              disabled={loading}
              testID="loginButton"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.nextButtonText}>{t("next")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#62763B", // Зелёный фон как в макете
  },
  backgroundOverlay: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#000000",
    marginTop: 5,
    textAlign: "center",
  },
  authContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabsContainer: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    width: "40%",
    backgroundColor: "#000",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "bold",
  },
  inputsContainer: {
    width: "100%",
    marginBottom: 20,
  },
  errorMessage: {
    color: "#D32F2F",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 15,
    marginBottom: 12,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    height: 50,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
  },
  passwordToggle: {
    paddingHorizontal: 15,
    height: 50,
    justifyContent: "center",
    zIndex: 1,
  },
  nextButton: {
    backgroundColor: "#8B4513",
    borderRadius: 8,
    height: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default LoginScreen;
