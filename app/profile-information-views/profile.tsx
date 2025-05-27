// File: app/(root)/profile.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  ImageSourcePropType,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../auth/AuthContext"; // Import the AuthContext
import WorkInDalaScreen from "./WorkInDamuScreen";
import { useTranslation } from "react-i18next"; // Import translation hook
import LanguageQuickSelector from "../i18n/LanguageQuickSelector"; // Import language selector
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Иконка профиля
const ProfileIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <Path d="M12 11a4 4 0 100-8 4 4 0 000 8z" />
  </Svg>
);

// Иконка истории
const HistoryIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M12 8v4l3 3" />
    <Path d="M12 22a10 10 0 100-20 10 10 0 000 20z" />
  </Svg>
);

// Иконка такси
const TaxiIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M18 6v10a2 2 0 01-2 2H8a2 2 0 01-2-2V6" />
    <Path d="M5 11l1-5h12l1 5" />
    <Path d="M8 16h.01" />
    <Path d="M16 16h.01" />
  </Svg>
);

// Иконка поделиться
const ShareIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <Path d="M16 6l-4-4-4 4" />
    <Path d="M12 2v13" />
  </Svg>
);

// Иконка уведомлений
const NotificationIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" />
  </Svg>
);

// Иконка работы
const WorkIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <Path d="M4 22v-7" />
  </Svg>
);

// Иконка стрелки вправо
const ChevronRight = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#999"
    strokeWidth={1.5}
  >
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

// Определение типов для props MenuItem
interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

// Компонент пункта меню
const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight />
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  // Use the AuthContext to get user information
  const { user } = useAuth();
  // Initialize translation hook
  const { t } = useTranslation();
  const [avatar, setAvatar] = useState<string | null>(null);

  // Получаем ключ для хранения аватара с привязкой к ID пользователя
  const getAvatarStorageKey = () => {
    return user?.id ? `userAvatar_${user.id}` : null;
  };

  // Функция для загрузки аватара
  const loadAvatar = async () => {
    if (!user?.id) {
      console.log("No user ID, cannot load avatar");
      return;
    }

    try {
      const storageKey = getAvatarStorageKey();

      if (!storageKey) {
        console.log("No storage key available");
        return;
      }

      // Проверка флага обновления
      const lastUpdate = await AsyncStorage.getItem("avatarUpdated");
      console.log("Last avatar update:", lastUpdate);

      console.log("Attempting to load avatar with key:", storageKey);
      const savedAvatar = await AsyncStorage.getItem(storageKey);
      if (savedAvatar) {
        console.log(
          "Avatar loaded successfully:",
          savedAvatar.substring(0, 50) + "..."
        );
        setAvatar(savedAvatar);
      } else {
        console.log("No saved avatar found for this user");
        // Если нет сохраненного аватара, но есть аватар в объекте пользователя
        if (user?.avatar) {
          console.log("Using avatar from user object instead");
          setAvatar(user.avatar);
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке аватара:", error);
    }
  };

  // Загрузка аватара из AsyncStorage при монтировании компонента
  useEffect(() => {
    loadAvatar();
  }, [user]);

  // Загрузка аватара при каждом фокусе экрана
  useFocusEffect(
    React.useCallback(() => {
      loadAvatar();
      return () => {};
    }, [user])
  );

  const handleBackPress = () => {
    router.push("/");
  };

  // Функция для перехода на экран информации профиля
  const navigateToProfileInformation = () => {
    router.push("/profile-information-views/profile-information");
  };

  // Функция для перехода на экран истории заказов
  const navigateToOrderHistory = () => {
    router.push("/profile-information-views/profile/OrderHistoryScreen");
  };

  // Функция для перехода на экран истории такси
  const navigateToTaxiHistory = () => {
    router.push("/profile-information-views/profile/TaxiHistoryScreen");
  };

  const navigateToWorkOnDami = () => {
    router.push("/profile-information-views/WorkInDamuScreen");
  };

  // Function to navigate to language settings
  const navigateToLanguageSettings = () => {
    router.push("/profile-information-views/language-settings" as any);
  };

  // Определение источника аватара
  const getAvatarSource = (): ImageSourcePropType => {
    if (avatar) {
      console.log("Using avatar from state:", avatar);
      return { uri: avatar };
    } else if (user?.avatar) {
      console.log("Using avatar from user object:", user.avatar);
      return { uri: user.avatar };
    }

    // Дефолтный аватар
    console.log("Using default avatar");
    return require("../../assets/images/default-avatar.jpg");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок с кнопкой назад */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile")}</Text>
        <LanguageQuickSelector />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Профиль пользователя */}
        <View style={styles.profileContainer}>
          <Image source={getAvatarSource()} style={styles.profileImage} />
          <Text style={styles.profileName}>{user ? user.name : t("name")}</Text>
          <Text style={styles.profilePhone}>
            {user ? user.phone : t("phone")}
          </Text>
        </View>

        {/* Меню настроек */}
        <ScrollView style={styles.menuContainer}>
          <MenuItem
            icon={<ProfileIcon />}
            title={t("profileSection.personalInfo")}
            subtitle={t("profileSection.personalInfoDesc")}
            onPress={navigateToProfileInformation}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<HistoryIcon />}
            title={t("profileSection.orderHistory")}
            subtitle={t("profileSection.orderHistoryDesc")}
            onPress={navigateToOrderHistory}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<TaxiIcon />}
            title={t("profileSection.taxiHistory")}
            subtitle={t("profileSection.taxiHistoryDesc")}
            onPress={navigateToTaxiHistory}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<ShareIcon />}
            title={t("profileSection.referFriends")}
            subtitle={t("profileSection.referFriendsDesc")}
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<NotificationIcon />}
            title={t("profileSection.notifications")}
            subtitle={t("profileSection.notificationsDesc")}
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<WorkIcon />}
            title={t("profileSection.workInDala")}
            subtitle={t("profileSection.workInDalaDesc")}
            onPress={navigateToWorkOnDami}
          />
        </ScrollView>
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
  profileContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: "#666",
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20, // Added extra padding at the bottom
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuIconContainer: {
    width: 40,
    alignItems: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuSubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 16,
  },
});
