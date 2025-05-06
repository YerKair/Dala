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
import { registerUser, RegisterData } from "./apiService";
import { useAuth } from "./AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register } = useAuth();

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation function
  const validatePhone = (phone: string): boolean => {
    // Basic phone number validation (adjust regex as needed)
    const phoneRegex = /^[+]?[\d\s()-]{10,}$/;
    return phoneRegex.test(phone);
  };

  // Переход на страницу входа
  const goToSignIn = (): void => {
    router.replace("/auth/login");
  };

  // Функция регистрации
  const handleSignUp = async (): Promise<void> => {
    // Reset previous error messages
    setErrorMessage(null);

    // Validate all fields
    if (!name.trim()) {
      setErrorMessage(t("nameRequired"));
      return;
    }

    if (!email.trim()) {
      setErrorMessage(t("emailRequired"));
      return;
    }

    if (!validateEmail(email.trim())) {
      setErrorMessage(t("invalidEmail"));
      return;
    }

    if (!phone.trim()) {
      setErrorMessage(t("phoneRequired"));
      return;
    }

    if (!validatePhone(phone.trim())) {
      setErrorMessage(t("invalidPhone"));
      return;
    }

    if (!password) {
      setErrorMessage(t("passwordRequired"));
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t("passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t("passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const userData: RegisterData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      };

      const result = await registerUser(userData);

      if (result.success && result.data) {
        // Сохраняем данные пользователя в контекст
        await register(result.data.user, result.data.token);

        console.log("Registration successful:", result.data);
        Alert.alert(t("success"), t("registrationSuccessful"), [
          { text: t("ok"), onPress: () => router.replace("/(tabs)") },
        ]);
      } else {
        // Display specific error from backend
        const errorMsg = result.error || t("registrationFailed");
        setErrorMessage(errorMsg);
        Alert.alert(t("error"), errorMsg);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setErrorMessage(t("connectionError"));
      Alert.alert(t("error"), t("connectionError"));
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
            <TouchableOpacity style={[styles.tab, styles.activeTab]}>
              <Text style={[styles.tabText, styles.activeTabText]}>
                {t("register")}
              </Text>
              <View style={styles.activeIndicator} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToSignIn} style={styles.tab}>
              <Text style={styles.tabText}>{t("login")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputsContainer}>
            {errorMessage && (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder={t("name")}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              testID="nameInput"
            />

            <TextInput
              style={styles.input}
              placeholder={t("email")}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              testID="emailInput"
            />

            <TextInput
              style={styles.input}
              placeholder={t("phone")}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              testID="phoneInput"
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

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t("confirmPassword")}
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                testID="confirmPasswordInput"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                testID="toggleConfirmPassword"
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#555"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleSignUp}
            disabled={loading}
            testID="signUpButton"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signUpButtonText}>{t("register")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#62763B",
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
  signUpButton: {
    backgroundColor: "#8B4513",
    borderRadius: 8,
    height: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  signUpButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default RegisterScreen;
