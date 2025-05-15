import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";

// Back Icon Component
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

// Eye Icon Component for password visibility
const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#666"
    strokeWidth={1.5}
  >
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <Path d="M1 1l22 22" />
      </>
    )}
  </Svg>
);

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { user, token } = useAuth();
  const { t } = useTranslation();

  const handleBackPress = () => {
    router.push("/profile-information-views/profile-information");
  };

  const handleChangePassword = async () => {
    // Проверка наличия данных в полях
    const isEmpty = (field: string): boolean => {
      return field === undefined || field === null || field.trim() === "";
    };

    // Клиентская валидация полей
    if (isEmpty(currentPassword)) {
      Alert.alert(t("error"), t("currentPasswordRequired"));
      return;
    }

    if (isEmpty(newPassword)) {
      Alert.alert(t("error"), t("newPasswordRequired"));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t("error"), t("passwordTooShort"));
      return;
    }

    if (isEmpty(confirmPassword)) {
      Alert.alert(t("error"), t("confirmPasswordRequired"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("error"), t("passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      // Формируем запрос в соответствии с форматом API
      const requestData = {
        old_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      };

      console.log("Отправляемые данные:", requestData);

      const response = await fetch(
        "http://192.168.0.113:8000/api/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      const responseData = await response.json();

      if (response.ok) {
        // Successful password change
        Alert.alert(t("success"), t("passwordChangedSuccessfully"), [
          {
            text: t("ok"),
            onPress: () =>
              router.push("/profile-information-views/profile-information"),
          },
        ]);

        // Clear fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        // Handle validation errors and other server errors
        if (response.status === 422) {
          // Ошибки валидации
          let errorsList: string[] = [];

          // Проверяем наличие ошибок валидации
          if (responseData.errors) {
            // Обрабатываем ошибки по полям
            if (responseData.errors.old_password) {
              responseData.errors.old_password.forEach((error: string) => {
                errorsList.push(`• ${error}`);
              });
            }

            if (responseData.errors.new_password) {
              responseData.errors.new_password.forEach((error: string) => {
                errorsList.push(`• ${error}`);
              });
            }

            if (responseData.errors.new_password_confirmation) {
              responseData.errors.new_password_confirmation.forEach(
                (error: string) => {
                  errorsList.push(`• ${error}`);
                }
              );
            }
          }

          // Показываем диалог с ошибками
          Alert.alert(
            t("error"),
            `Ошибка валидации:\n${errorsList.join("\n")}`,
            [{ text: t("ok") }]
          );
        } else if (response.status === 401) {
          // Unauthorized - likely incorrect current password
          Alert.alert(t("error"), t("invalidCurrentPassword"));
        } else {
          // Other server errors
          const errorMessage =
            responseData.message || t("failedToChangePassword");
          Alert.alert(t("error"), errorMessage);
        }
      }
    } catch (error) {
      console.error("Password change error:", error);
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
        <Text style={styles.headerTitle}>{t("changePassword")}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Current Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("currentPassword")}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              placeholder={t("enterCurrentPassword")}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <EyeIcon visible={showCurrentPassword} />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("newPassword")}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              placeholder={t("enterNewPassword")}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <EyeIcon visible={showNewPassword} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("confirmPassword")}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholder={t("confirmNewPassword")}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <EyeIcon visible={showConfirmPassword} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Change Password Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.changeButtonText}>{t("save")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
  },
  buttonContainer: {
    alignItems: "flex-end",
    marginTop: 20,
  },
  changeButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  changeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
