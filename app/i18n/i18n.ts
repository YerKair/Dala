import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import translations
import enTranslation from "./locales/en";
import kkTranslation from "./locales/kk";
import ruTranslation from "./locales/ru";
// Initialize i18next
i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslation,
    },
    kk: {
      translation: kkTranslation,
    },
    ru: {
      translation: ruTranslation,
    },
  },
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Setup language detection using AsyncStorage
(async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem("user-language");
    if (storedLanguage) {
      i18n.changeLanguage(storedLanguage);
    }
  } catch (error) {
    console.log("Error initializing language from AsyncStorage", error);
  }
})();

// Override changeLanguage to save language to AsyncStorage
const originalChangeLanguage = i18n.changeLanguage;
i18n.changeLanguage = async (lng?: string) => {
  if (lng) {
    try {
      await AsyncStorage.setItem("user-language", lng);
    } catch (error) {
      console.log("Error saving language to AsyncStorage", error);
    }
  }
  return originalChangeLanguage(lng);
};

export default i18n;
