import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { globalState } from "../store/globalState";

// Import translation hook
import { useTranslation } from "react-i18next";
// Import Quick Language Selector
import LanguageQuickSelector from "../i18n/LanguageQuickSelector";
// Import Delivery Tracking Widget
import DeliveryTrackingWidget from "../components/DeliveryTrackingWidget";

// Иконка профиля для верхней панели
const ProfileIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth={1.5}
  >
    <Circle cx="12" cy="8" r="4" />
    <Path d="M4 18c0-4 3.58-6 8-6s8 2 8 6" />
  </Svg>
);

// Компонент карточки доставки с навигацией на страницу доставки в соответствии с новой структурой
const DeliveryCard = () => {
  const navigateToDelivery = () => {
    router.push("/(tabs)/delivery/DeliverPage");
  };

  return (
    <TouchableOpacity style={styles.deliveryCard} onPress={navigateToDelivery}>
      <Image
        source={require("@/assets/images/delivery-food.png")}
        style={styles.cardImage}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

// Компонент карточки маркетплейса
const MarketplaceCard = () => {
  const navigateToMarketplace = () => {
    router.push("/(tabs)/marketplacer/MarketplaceScreen");
  };

  return (
    <TouchableOpacity
      style={styles.marketplaceCard}
      onPress={navigateToMarketplace}
    >
      <Image
        source={require("@/assets/images/marketplace.png")}
        style={styles.cardImage}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

// Новый компонент карточки такси
const TaxiCard = () => {
  const navigateToTaxi = () => {
    // Проверка активного состояния поездки
    if (globalState.activeTaxiTrip) {
      router.push("/(tabs)/taxi-service/trip");
    } else {
      router.push("/(tabs)/taxi-service/taxi");
    }
  };

  return (
    <TouchableOpacity style={styles.taxiCard} onPress={navigateToTaxi}>
      <View style={styles.taxiIconContainer}>
        <Image
          source={require("../../assets/images/taxi-service.png")}
          style={styles.taxiIcon}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  // Initialize translation hook
  const { t } = useTranslation();

  // Функция для перехода на экран профиля
  const navigateToProfile = () => {
    router.push("/profile-information-views/profile");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Верхняя навигационная панель */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={navigateToProfile}
        >
          <ProfileIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dala</Text>
        <LanguageQuickSelector />
      </View>

      {/* Виджет отслеживания доставки */}
      <DeliveryTrackingWidget />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 80 + insets.bottom },
        ]}
      >
        <Text style={styles.sectionTitle}>{t("delivery")}</Text>
        <DeliveryCard />

        <Text style={styles.sectionTitle}>{t("marketplace.name")}</Text>
        <MarketplaceCard />

        <Text style={styles.sectionTitle}>{t("taxiService")}</Text>
        <TaxiCard />
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
    paddingVertical: 10,
  },
  profileButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "600",
    fontSize: 22,
    color: "#8B4513",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 8,
  },
  deliveryCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    height: 126,
  },
  marketplaceCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    height: 186,
  },
  taxiCard: {
    overflow: "hidden",
    marginBottom: 20,
    height: 160,
    alignItems: "center",
    borderColor: "#E0E0E0",
  },
  taxiIconContainer: {
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    overflow: "hidden",
    height: 200,
  },
  taxiIcon: {
    borderRadius: 12,
    width: 340,
    height: 340,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
});
