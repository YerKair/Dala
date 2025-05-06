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
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

// Иконка назад
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

export default function ChangeNumberScreen() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const [currentNumber, setCurrentNumber] = useState("+7 708 563 22 22");
  const [newNumber, setNewNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBackPress = () => {
    router.push("/profile-information-views/profile-information");
  };

  const handleRequestCode = () => {
    if (!newNumber) {
      Alert.alert("Ошибка", "Пожалуйста, введите новый номер телефона");
      return;
    }

    // Имитация отправки кода верификации
    Alert.alert("Отправлено", "Код верификации отправлен на указанный номер");
    setIsCodeSent(true);
  };

  const handleVerifyCode = () => {
    if (!newNumber) {
      Alert.alert("Ошибка", "Пожалуйста, введите новый номер телефона");
      return;
    }

    if (!verificationCode) {
      Alert.alert("Ошибка", "Пожалуйста, введите код верификации");
      return;
    }

    // Имитация проверки кода
    if (verificationCode === "1234") {
      Alert.alert("Успешно", "Номер телефона успешно изменен", [
        {
          text: "OK",
          onPress: () => router.push("./profile-information"),
        },
      ]);
    } else {
      Alert.alert("Ошибка", "Неверный код верификации");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок с кнопкой назад */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("changeNumber")}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Текущий номер */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("currentNumber")}</Text>
          <TextInput
            style={styles.input}
            value={currentNumber}
            editable={false}
            placeholder={t("phoneNotAvailable")}
          />
        </View>

        {/* Новый номер */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("newNumber")}</Text>
          <TextInput
            style={styles.input}
            value={newNumber}
            onChangeText={setNewNumber}
            placeholder={t("enterNewPhoneNumber")}
            keyboardType="phone-pad"
          />
        </View>

        {/* Код верификации (показывается после отправки) */}
        {isCodeSent && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t("verificationCode")}</Text>
            <TextInput
              style={styles.input}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder={t("enterVerificationCode")}
              keyboardType="number-pad"
            />
            <Text style={styles.codeHint}>{t("demoUseCode")}</Text>
          </View>
        )}

        {/* Кнопки */}
        <View style={styles.actionContainer}>
          {isCodeSent ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {t("verifyAndChange")}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRequestCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {t("getVerificationCode")}
                </Text>
              )}
            </TouchableOpacity>
          )}
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
  helperText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
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
  disabledInput: {
    backgroundColor: "#F5F5F5",
    color: "#666",
  },
  buttonContainer: {
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  codeHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    fontStyle: "italic",
  },
  actionContainer: {
    marginTop: 20,
    alignItems: "center",
  },
});
