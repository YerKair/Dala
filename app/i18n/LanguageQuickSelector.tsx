import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { useTranslation } from "react-i18next";

interface LanguageQuickSelectorProps {
  buttonStyle?: object;
  textStyle?: object;
}

const LanguageQuickSelector: React.FC<LanguageQuickSelectorProps> = ({
  buttonStyle,
  textStyle,
}) => {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setModalVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.buttonText, textStyle]}>
          {t("language").slice(0, 2)}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.languageContainer}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === "en" && styles.activeLanguage,
              ]}
              onPress={() => changeLanguage("en")}
            >
              <Text
                style={[
                  styles.languageText,
                  i18n.language === "en" && styles.activeLanguageText,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === "ru" && styles.activeLanguage,
              ]}
              onPress={() => changeLanguage("ru")}
            >
              <Text
                style={[
                  styles.languageText,
                  i18n.language === "ru" && styles.activeLanguageText,
                ]}
              >
                Русский
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === "kk" && styles.activeLanguage,
              ]}
              onPress={() => changeLanguage("kk")}
            >
              <Text
                style={[
                  styles.languageText,
                  i18n.language === "kk" && styles.activeLanguageText,
                ]}
              >
                Қазақша
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
  buttonText: {
    fontWeight: "bold",
    color: "#8B4513",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  languageContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxWidth: 300,
  },
  languageButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  activeLanguage: {
    backgroundColor: "#8B4513",
  },
  languageText: {
    fontSize: 16,
    textAlign: "center",
  },
  activeLanguageText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default LanguageQuickSelector;
