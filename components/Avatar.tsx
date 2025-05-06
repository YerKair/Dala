import React from "react";
import {
  Image,
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  ImageStyle,
  ViewStyle,
  StyleProp,
  Text,
} from "react-native";
import { useAvatar } from "../hooks/useAvatar";

interface AvatarProps {
  userId?: string;
  size?: number;
  updatedAt?: number;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  onUploadSuccess?: (uri: string) => void;
  onUploadError?: (error: Error) => void;
  token?: string;
  userProfile?: any;
}

const DEFAULT_AVATAR_SIZE = 50;

export const Avatar: React.FC<AvatarProps> = ({
  userId,
  size = DEFAULT_AVATAR_SIZE,
  updatedAt,
  editable = false,
  style,
  imageStyle,
  onUploadSuccess,
  onUploadError,
  token,
  userProfile,
}) => {
  const {
    avatarUri,
    isLoading,
    error,
    uploadAvatar,
    loadAvatar,
    updateFromUserProfile,
  } = useAvatar({
    userId: userId || (userProfile?.id ? userProfile.id.toString() : ""),
    token,
    onUploadSuccess,
    onUploadError,
    initialUri: undefined,
  });

  // Обновление аватара при изменении временной метки или профиля пользователя
  React.useEffect(() => {
    if (userId && updatedAt) {
      loadAvatar();
    }
  }, [userId, updatedAt, loadAvatar]);

  // Обновление аватара из данных профиля
  React.useEffect(() => {
    if (userProfile) {
      updateFromUserProfile(userProfile);
    }
  }, [userProfile, updateFromUserProfile]);

  const handleSelectImage = async () => {
    if (!editable) return;
    await uploadAvatar();
  };

  // Отображаем индикатор загрузки, если аватар загружается
  if (isLoading) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  // Отображаем заглушку, если аватар не удалось загрузить
  if (!avatarUri || error) {
    const placeholderText = userProfile?.name
      ? userProfile.name.substring(0, 2).toUpperCase()
      : userId
      ? userId.substring(0, 2).toUpperCase()
      : "U";

    return (
      <TouchableOpacity
        style={[styles.container, { width: size, height: size }, style]}
        disabled={!editable}
        onPress={handleSelectImage}
      >
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <Text style={styles.placeholderText}>{placeholderText}</Text>
        </View>
        {editable && (
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>+</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Отображаем аватар
  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }, style]}
      disabled={!editable}
      onPress={handleSelectImage}
    >
      <Image
        source={{ uri: avatarUri }}
        style={[styles.image, { width: size, height: size }, imageStyle]}
        resizeMode="cover"
      />
      {editable && (
        <View style={styles.editBadge}>
          <Text style={styles.editBadgeText}>+</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    borderRadius: 9999,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
  },
  placeholder: {
    backgroundColor: "#E1E1E1",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 9999,
  },
  placeholderText: {
    fontSize: 16,
    color: "#6E6E6E",
    fontWeight: "bold",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  editBadgeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
});
