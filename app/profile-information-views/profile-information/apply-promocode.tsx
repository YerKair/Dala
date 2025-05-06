import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path, Rect, Circle, G } from "react-native-svg";
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

// Иконка тэга
const TagIcon = () => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <Circle cx="7" cy="7" r="2" />
  </Svg>
);

// Иконка проверки
const CheckIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#38761D"
    strokeWidth={2}
  >
    <Path d="M20 6L9 17l-5-5" />
  </Svg>
);

// Тип для промокода
interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount: string;
  expiryDate: string;
  isApplied: boolean;
}

// Компонент элемента промокода
const PromoCodeItem: React.FC<{
  promo: PromoCode;
  onApply: (id: string) => void;
}> = ({ promo, onApply }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.promoCard}>
      <View style={styles.promoHeader}>
        <View style={styles.promoIcon}>
          <TagIcon />
        </View>
        <View style={styles.promoInfo}>
          <Text style={styles.promoCode}>{promo.code}</Text>
          <Text style={styles.promoDescription}>{promo.description}</Text>
        </View>
        {promo.isApplied && (
          <View style={styles.appliedBadge}>
            <CheckIcon />
            <Text style={styles.appliedText}>{t("applied")}</Text>
          </View>
        )}
      </View>
      <View style={styles.promoDetails}>
        <Text style={styles.promoDiscount}>{promo.discount}</Text>
        <Text style={styles.promoExpiry}>
          {t("validUntil")} {promo.expiryDate}
        </Text>
      </View>
      {!promo.isApplied && (
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => onApply(promo.id)}
        >
          <Text style={styles.applyButtonText}>{t("apply")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function ApplyPromocodeScreen() {
  const { t } = useTranslation();
  const [promoCode, setPromoCode] = useState("");
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([
    {
      id: "1",
      code: "WELCOME20",
      description: t("welcomeDiscount"),
      discount: t("percentOffFirstRide", { percent: "20%" }),
      expiryDate: "31 Dec 2023",
      isApplied: false,
    },
    {
      id: "2",
      code: "DAMU50",
      description: t("specialPromoOffer"),
      discount: t("percentOffUpTo", { percent: "50%", amount: "$10" }),
      expiryDate: "15 Jan 2024",
      isApplied: true,
    },
    {
      id: "3",
      code: "WEEKEND25",
      description: t("weekendDiscount"),
      discount: t("percentOffWeekend", { percent: "25%" }),
      expiryDate: "31 Mar 2024",
      isApplied: false,
    },
  ]);

  const handleBackPress = () => {
    router.push("/profile-information-views/profile-information");
  };

  const handleApplyPromoCode = () => {
    if (!promoCode.trim()) {
      Alert.alert(t("error"), t("enterPromoCodeAlert"));
      return;
    }

    // Проверяем, существует ли такой промокод
    const existingPromo = promoCodes.find(
      (promo) => promo.code.toLowerCase() === promoCode.toLowerCase()
    );

    if (existingPromo) {
      if (existingPromo.isApplied) {
        Alert.alert(t("alreadyApplied"), t("promoCodeAlreadyApplied"));
      } else {
        handleApply(existingPromo.id);
      }
    } else {
      // Имитируем добавление нового промокода для демонстрационных целей
      const newPromo: PromoCode = {
        id: `new-${Date.now()}`,
        code: promoCode.toUpperCase(),
        description: t("customPromoCode"),
        discount: t("specialOffer"),
        expiryDate: "31 Dec 2024",
        isApplied: true,
      };

      setPromoCodes((current) => [newPromo, ...current]);
      setPromoCode("");
      Alert.alert(t("success"), t("promoCodeAppliedSuccess"));
    }
  };

  const handleApply = (id: string) => {
    setPromoCodes((current) =>
      current.map((promo) => ({
        ...promo,
        isApplied: promo.id === id || promo.isApplied,
      }))
    );
    Alert.alert(t("success"), t("promoCodeAppliedSuccess"));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок с кнопкой назад */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("applyPromocode")}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Ввод промокода */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t("enterPromoCode")}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder={t("enterPromoCodePlaceholder")}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.applyCodeButton}
              onPress={handleApplyPromoCode}
            >
              <Text style={styles.applyCodeText}>{t("apply")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Список доступных промокодов */}
        <View style={styles.promoSection}>
          <Text style={styles.sectionTitle}>{t("yourPromoCodes")}</Text>
          <FlatList
            data={promoCodes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PromoCodeItem promo={item} onApply={handleApply} />
            )}
            contentContainerStyle={styles.promoList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t("noPromoCodes")}</Text>
              </View>
            }
          />
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
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  applyCodeButton: {
    backgroundColor: "#38761D",
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  applyCodeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  promoSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  promoList: {
    paddingBottom: 20,
  },
  promoCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  promoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  promoIcon: {
    marginRight: 12,
  },
  promoInfo: {
    flex: 1,
  },
  promoCode: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  promoDescription: {
    fontSize: 14,
    color: "#666",
  },
  appliedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  appliedText: {
    fontSize: 12,
    color: "#38761D",
    fontWeight: "500",
    marginLeft: 4,
  },
  promoDetails: {
    marginBottom: 12,
  },
  promoDiscount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#38761D",
    marginBottom: 4,
  },
  promoExpiry: {
    fontSize: 12,
    color: "#888",
  },
  applyButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#38761D",
    borderRadius: 4,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
});
