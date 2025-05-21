import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../auth/AuthContext";
import { ImagePickerComponent } from "./ImagePickerComponent";
import { useTranslation } from "react-i18next";

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

export default function EditProfileScreen(): JSX.Element {
  const { user, token } = useAuth();
  const { t } = useTranslation();
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
      const response = await fetch(
        "http://192.168.0.104:8000/api/profile/update",
        {
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
        }
      );

      const responseData = await response.json();

      if (response.ok) {
        // Update local user data in AsyncStorage
        if (user) {
          const userData = await AsyncStorage.getItem("userData");
          if (userData) {
            const parsedUserData = JSON.parse(userData);
            const updatedUserData = {
              ...parsedUserData,
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
            };

            await AsyncStorage.setItem(
              "userData",
              JSON.stringify(updatedUserData)
            );
          }
        }

        // Show success message
        Alert.alert(t("success"), t("profileUpdatedSuccessfully"), [
          {
            text: t("ok"),
            onPress: () =>
              router.push("/profile-information-views/profile-information"),
          },
        ]);
      } else {
        // Handle server errors
        const errorMessage = responseData.message || t("failedToUpdateProfile");
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
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("editProfile")}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Avatar section */}
        <View style={styles.avatarContainer}>
          <ImagePickerComponent />
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
            />
          </View>

          {/* Update button */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.updateButtonText}>{t("updateProfile")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  avatarContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  updateButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  updateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
