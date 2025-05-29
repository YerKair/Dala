import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ImagePickerComponent } from "./ImagePickerComponent";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "../../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Back icon component
const BackIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth={2}
  >
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const { width } = Dimensions.get("window");

export default function EditProfileScreen(): JSX.Element {
  const { t } = useTranslation();
  const { user, token, updateUser } = useAuth();
  const [name, setName] = useState<string>(user?.name || "");
  const [email, setEmail] = useState<string>(user?.email || "");
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [loading, setLoading] = useState<boolean>(false);

  const handleBackPress = (): void => {
    router.push("/profile-information-views/profile-information");
  };

  const handleUpdateProfile = async (): Promise<void> => {
    // Validate inputs
    if (!name.trim()) {
      Alert.alert(t("error"), t("nameRequired"));
      return;
    }

    if (!email.trim()) {
      Alert.alert(t("error"), t("emailRequired"));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t("error"), t("invalidEmail"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://192.168.0.109:8000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      const responseData = await response.json();
      console.log("Server response:", responseData); // Для отладки

      // Проверяем статус ответа и наличие ошибок
      if (response.ok && !responseData.error) {
        // Получаем обновленные данные пользователя из ответа сервера
        const updatedUserData = responseData.data ||
          responseData.user || {
            ...user!,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
          };

        // Обновляем контекст пользователя
        const updateSuccess = await updateUser(updatedUserData);

        if (updateSuccess) {
          Alert.alert(t("success"), t("profileUpdatedSuccessfully"), [
            {
              text: t("ok"),
              onPress: () => {
                router.push("/profile-information-views/profile-information");
              },
            },
          ]);
        } else {
          throw new Error("Failed to update local user data");
        }
      } else {
        // Показываем сообщение об ошибке из ответа сервера
        const errorMessage =
          responseData.message ||
          responseData.error ||
          (responseData.errors && Object.values(responseData.errors)[0]) ||
          t("failedToUpdateProfile");
        Alert.alert(t("error"), errorMessage);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert(t("error"), t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#ffffff", "#f8f9fa", "#e9ecef"]}
        style={styles.gradient}
      >
        {/* Header with back button */}
        <BlurView intensity={80} tint="light" style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("profileInformation")}</Text>
          <View style={styles.headerRight} />
        </BlurView>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            {/* Title section */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t("personalInfo")}</Text>
              <Text style={styles.subtitle}>{t("personalInfoDesc")}</Text>
            </View>

            {/* Avatar section */}
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={["#ffffff", "#f8f9fa"]}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.avatarContainer}>
                  <ImagePickerComponent />
                </View>
              </LinearGradient>
            </View>

            {/* Info text */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                {t("profilePhoto.tapToChange")}
              </Text>
              <Text style={styles.infoSubtext}>
                {t("profilePhoto.recommendedSize")}
              </Text>
            </View>

            {/* Edit form */}
            <View style={styles.formContainer}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("name")}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={t("enterYourName")}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("email")}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("enterYourEmail")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("phone")}</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t("enterYourPhone")}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Update button */}
              <TouchableOpacity
                style={[
                  styles.updateButton,
                  loading && styles.updateButtonDisabled,
                ]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.updateButtonText}>
                    {t("updateProfile")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    letterSpacing: 0.5,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: "center",
    marginVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: width * 0.8,
  },
  avatarWrapper: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarGradient: {
    padding: 2,
    borderRadius: 24,
  },
  avatarContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
    borderRadius: 22,
  },
  infoContainer: {
    marginTop: 24,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 16,
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
  },
  infoText: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  infoSubtext: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  formContainer: {
    width: width * 0.9,
    maxWidth: 400,
    marginTop: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  updateButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonDisabled: {
    backgroundColor: "#999",
    shadowOpacity: 0,
  },
  updateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
