import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  SectionList,
  Switch,
  Alert,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
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

// Иконка стрелки вправо
const ChevronRightIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#999"
    strokeWidth={1.5}
  >
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

// Типы данных для настроек
interface SettingItem {
  id: string;
  title: string;
  type: "switch" | "select" | "action";
  value?: boolean;
  description?: string;
  action?: () => void;
}

interface SettingSection {
  title: string;
  data: SettingItem[];
}

// Типизация для рендер-функции
interface SettingItemProps {
  item: SettingItem;
  onToggle: (id: string, value: boolean) => void;
  onPress: (item: SettingItem) => void;
}

// Компонент элемента настроек
const SettingItem: React.FC<SettingItemProps> = ({
  item,
  onToggle,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={() => onPress(item)}
      disabled={item.type === "switch"}
    >
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.settingDescription}>{item.description}</Text>
        )}
      </View>

      {item.type === "switch" && (
        <Switch
          value={item.value}
          onValueChange={(value) => onToggle(item.id, value)}
          trackColor={{ false: "#D1D1D1", true: "#A5D6A7" }}
          thumbColor={item.value ? "#38761D" : "#F5F5F5"}
        />
      )}

      {item.type === "select" && <ChevronRightIcon />}
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const { t } = useTranslation();

  // Данные настроек
  const [settings, setSettings] = useState<SettingSection[]>([
    {
      title: t("notifications"),
      data: [
        {
          id: "push",
          title: t("pushNotifications"),
          type: "switch",
          value: true,
        },
        {
          id: "email",
          title: t("emailNotifications"),
          type: "switch",
          value: false,
        },
        {
          id: "promos",
          title: t("promotionalNotifications"),
          type: "switch",
          value: true,
        },
        { id: "sound", title: t("sound"), type: "switch", value: true },
        { id: "vibration", title: t("vibration"), type: "switch", value: true },
      ],
    },
    {
      title: t("privacy"),
      data: [
        {
          id: "location",
          title: t("locationServices"),
          type: "switch",
          value: true,
        },
        {
          id: "datasharing",
          title: t("dataSharing"),
          type: "switch",
          value: false,
        },
        {
          id: "privacypolicy",
          title: t("privacyPolicy"),
          type: "select",
          description: t("readPrivacyPolicy"),
        },
        {
          id: "terms",
          title: t("termsOfService"),
          type: "select",
          description: t("readTermsOfService"),
        },
      ],
    },
    {
      title: t("account"),
      data: [
        {
          id: "language",
          title: t("language"),
          type: "select",
          description: t("english"),
        },
        {
          id: "region",
          title: t("region"),
          type: "select",
          description: t("unitedStates"),
        },
        {
          id: "deleteaccount",
          title: t("deleteAccount"),
          type: "action",
          description: t("deleteAccountDescription"),
        },
      ],
    },
  ]);

  const handleBackPress = () => {
    router.push("/profile-information-views/profile-information");
  };

  const handleToggle = (id: string, value: boolean) => {
    setSettings((currentSettings) =>
      currentSettings.map((section) => ({
        ...section,
        data: section.data.map((item) =>
          item.id === id ? { ...item, value } : item
        ),
      }))
    );
  };

  const handleItemPress = (item: SettingItem) => {
    if (item.type === "action") {
      if (item.id === "deleteaccount") {
        Alert.alert(
          t("deleteAccount"),
          t("deleteAccountConfirmation"),
          [
            {
              text: t("cancel"),
              style: "cancel",
            },
            {
              text: t("delete"),
              style: "destructive",
              onPress: () => {
                // Implement account deletion
                console.log("Account deletion requested");
                Alert.alert(t("accountDeleted"), t("accountDeletedMessage"));
              },
            },
          ],
          { cancelable: true }
        );
      }
    } else if (item.type === "select") {
      if (item.id === "language") {
        // Navigate to language settings
        router.push("/profile-information-views/language-settings");
      } else if (item.id === "region") {
        // Navigate to region settings
        console.log("Navigate to region settings");
      } else if (item.id === "privacypolicy") {
        // Show privacy policy
        console.log("Show privacy policy");
      } else if (item.id === "terms") {
        // Show terms of service
        console.log("Show terms of service");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок с кнопкой назад */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings")}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Список настроек */}
      <SectionList
        sections={settings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SettingItem
            item={item}
            onToggle={handleToggle}
            onPress={handleItemPress}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
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
  sectionList: {
    paddingBottom: 30,
  },
  sectionHeader: {
    backgroundColor: "#F6F6F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: "#888",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 30,
  },
});
