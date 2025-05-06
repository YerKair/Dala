import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("changeLanguage")}</Text>
      <View style={styles.languagesContainer}>
        <TouchableOpacity
          style={[
            styles.languageButton,
            currentLanguage === "en" && styles.activeLanguage,
          ]}
          onPress={() => changeLanguage("en")}
        >
          <Text
            style={[
              styles.languageText,
              currentLanguage === "en" && styles.activeLanguageText,
            ]}
          >
            English
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.languageButton,
            currentLanguage === "kk" && styles.activeLanguage,
          ]}
          onPress={() => changeLanguage("kk")}
        >
          <Text
            style={[
              styles.languageText,
              currentLanguage === "kk" && styles.activeLanguageText,
            ]}
          >
            Қазақша
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.languageButton,
            currentLanguage === "ru" && styles.activeLanguage,
          ]}
          onPress={() => changeLanguage("ru")}
        >
          <Text
            style={[
              styles.languageText,
              currentLanguage === "ru" && styles.activeLanguageText,
            ]}
          >
            Русский
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  languagesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  languageButton: {
    padding: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  activeLanguage: {
    backgroundColor: "#8B4513",
    borderColor: "#8B4513",
  },
  languageText: {
    fontSize: 16,
  },
  activeLanguageText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default LanguageSelector;
