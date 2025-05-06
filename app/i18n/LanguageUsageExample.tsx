import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

/**
 * This is an example component demonstrating how to use i18n translations
 * in your application. You can import this in other files to see how it works.
 */
const LanguageUsageExample: React.FC = () => {
  // Get the translation function and the i18n instance
  const { t, i18n } = useTranslation();

  // Get current language
  const currentLanguage = i18n.language;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>i18n Usage Example</Text>

      <Text style={styles.label}>Current Language:</Text>
      <Text style={styles.value}>
        {t("language")} ({currentLanguage})
      </Text>

      <Text style={styles.label}>Translated Texts:</Text>
      <Text style={styles.value}>{t("delivery")}</Text>
      <Text style={styles.value}>{t("marketplace")}</Text>
      <Text style={styles.value}>{t("taxiService")}</Text>

      <Text style={styles.label}>Translation with Variables:</Text>
      <Text style={styles.value}>
        {t("hello", { name: "User" })}{" "}
        {/* This would require adding 'hello' with a {{name}} variable to your translations */}
      </Text>

      <Text style={styles.note}>
        To use translations in your components:
        {"\n"}
        1. Import: import {"{"}useTranslation{"}"} from 'react-i18next';
        {"\n"}
        2. Initialize: const {"{"}t{"}"} = useTranslation();
        {"\n"}
        3. Use: t('keyName')
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    color: "#555",
  },
  value: {
    fontSize: 14,
    color: "#333",
    marginVertical: 4,
  },
  note: {
    fontSize: 12,
    color: "#666",
    marginTop: 16,
    padding: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
  },
});

export default LanguageUsageExample;
