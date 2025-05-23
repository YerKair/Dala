import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ImageSourcePropType,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { useAuth } from "../auth/AuthContext";
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

// Иконка документа
const DocumentIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <Path d="M14 2v6h6" />
    <Path d="M16 13H8" />
    <Path d="M16 17H8" />
    <Path d="M10 9H8" />
  </Svg>
);

// Иконка галочки
const CheckIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M20 6L9 17l-5-5" />
  </Svg>
);

// Иконка отмены
const CancelIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

// Иконка замка
const LockIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000"
    strokeWidth={1.5}
  >
    <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" />
    <Path d="M7 11V7a5 5 0 0110 0v4" />
  </Svg>
);

// Иконка телефона
const PhoneIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000"
    strokeWidth={1.5}
  >
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </Svg>
);

// Иконка кредитной карты
const CreditCardIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000"
    strokeWidth={1.5}
  >
    <Rect x="2" y="5" width="20" height="14" rx="2" />
    <Path d="M2 10h20" />
  </Svg>
);

// Иконка настроек
const SettingsIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000"
    strokeWidth={1.5}
  >
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </Svg>
);

// Иконка промокода
const TagIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000"
    strokeWidth={1.5}
  >
    <Path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <Circle cx="7" cy="7" r="2" />
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

// Иконка выхода
const LogoutIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#D32F2F"
    strokeWidth={1.5}
  >
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <Path d="M16 17l5-5-5-5" />
    <Path d="M21 12H9" />
  </Svg>
);

// Иконка редактирования
const EditIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#666"
    strokeWidth={1.5}
  >
    <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Svg>
);

// Add this new icon component after the other icon components
const HistoryIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z"
      fill="#333333"
    />
    <Path d="M12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z" fill="#333333" />
  </Svg>
);

// Add this new icon component after the HistoryIcon
const BugIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L16.9 4H7.1l1.52 2.04c-.75.51-1.37 1.18-1.82 1.96H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4h1c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2zm0 4h-3v6H7v-6H4v-2h3.89c.64-.85 1.48-1.5 2.47-1.86.33-.11.68-.14 1.02-.14.31 0 .63.03.93.13 1.01.35 1.87 1.02 2.52 1.87H20v2z"
      fill="#C75E56"
    />
    <Path
      d="M9 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
      fill="#C75E56"
    />
  </Svg>
);

// Определение типов для props MenuItem
interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
}

// Компонент пункта меню
const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onPress }) => {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>{icon}</View>
      <Text style={styles.menuItemText}>{title}</Text>
      <ChevronRight />
    </TouchableOpacity>
  );
};

export default function ProfileInformationScreen() {
  const { user, logout } = useAuth();
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

  // Исправляем переход назад, чтобы он вел непосредственно на страницу профиля
  const handleBackPress = () => {
    router.push("/profile-information-views/profile");
  };

  // Функция для перехода на экран редактирования
  const handleEditProfile = () => {
    router.push("/profile-information-views/profile-information/edit-profile");
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

  // Функция для выхода из аккаунта
  const handleLogout = async () => {
    Alert.alert(t("logout"), t("logoutConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("logout"),
        style: "destructive",
        onPress: async () => {
          try {
            // Отправляем запрос на сервер для logout
            const response = await fetch(
              "http://192.168.0.104:8000/api/logout",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${await AsyncStorage.getItem(
                    "token"
                  )}`,
                },
              }
            );

            // Выполняем локальный выход (удаление токена)
            await logout();

            // Перенаправляем на экран входа
            router.replace("/auth/login");
          } catch (error) {
            console.error("Logout error:", error);

            // Даже если запрос к API не удался, все равно выходим
            await logout();
            router.replace("/auth/login");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок с кнопкой назад */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profileInformation")}</Text>
        <TouchableOpacity onPress={handleEditProfile}>
          <EditIcon />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Профиль пользователя */}
        <View style={styles.profileContainer}>
          <Image source={getAvatarSource()} style={styles.profileImage} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user ? user.name : t("user")}
            </Text>
            <Text style={styles.profilePhone}>
              {user ? user.phone : t("phoneNotAvailable")}
            </Text>
          </View>
        </View>

        {/* Разделительная линия */}
        <View style={styles.divider} />

        {/* Статистика поездок */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statTitle}>{t("totalRides")}</Text>
              <DocumentIcon />
            </View>
            <Text style={styles.statValue}>56</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statTitle}>{t("completed")}</Text>
              <CheckIcon />
            </View>
            <Text style={styles.statValue}>50</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statTitle}>{t("cancelled")}</Text>
              <CancelIcon />
            </View>
            <Text style={styles.statValue}>6</Text>
          </View>
        </View>

        {/* Меню настроек */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon={<LockIcon />}
            title={t("changePassword")}
            onPress={() =>
              router.push(
                "/profile-information-views/profile-information/change-password"
              )
            }
          />
          <MenuItem
            icon={<PhoneIcon />}
            title={t("changeNumber")}
            onPress={() =>
              router.push(
                "/profile-information-views/profile-information/change-number"
              )
            }
          />
          <MenuItem
            icon={<CreditCardIcon />}
            title={t("paymentMethods")}
            onPress={() =>
              router.push(
                "/profile-information-views/profile-information/PaymentMethodsScreen"
              )
            }
          />

          <MenuItem
            icon={<SettingsIcon />}
            title={t("settings")}
            onPress={() =>
              router.push(
                "/profile-information-views/profile-information/settings"
              )
            }
          />
          <MenuItem
            icon={<TagIcon />}
            title={t("applyPromocode")}
            onPress={() =>
              router.push(
                "/profile-information-views/profile-information/apply-promocode"
              )
            }
          />
          <MenuItem
            icon={<BugIcon />}
            title={t("debug") || "Debug"}
            onPress={() =>
              router.push(
                "/profile-information-views/profile-information/auth-debug"
              )
            }
          />
        </View>

        {/* Кнопка выхода */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogoutIcon />
          <Text style={styles.logoutText}>{t("logout")}</Text>
        </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  statsContainer: {
    flexDirection: "row",
    padding: 16,
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#A5D6A7", // Светло-зеленый цвет
    borderRadius: 12,
    padding: 16,
    width: "30%",
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: "#333",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    alignItems: "flex-start",
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 20,
  },
  logoutText: {
    fontSize: 16,
    color: "#D32F2F",
    marginLeft: 16,
  },
});
