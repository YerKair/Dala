import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ImagePickerComponent } from "./ImagePickerComponent";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

// Back icon component
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

const { width } = Dimensions.get("window");

export default function EditProfileScreen(): JSX.Element {
  const { t } = useTranslation();

  const handleBackPress = (): void => {
    router.push("/profile-information-views/profile-information");
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#ffffff", "#f8f9fa", "#e9ecef"]}
        style={styles.gradient}
      >
        {/* Header with back button */}
        <BlurView intensity={80} tint="light" style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("profileInformation")}</Text>
          <View style={styles.headerRight} />
        </BlurView>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            {/* Title section */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t("personalInfo")}</Text>
              <Text style={styles.subtitle}>{t("personalInfoDesc")}</Text>
            </View>

            {/* Avatar section */}
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={["#ffffff", "#f8f9fa"]}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.avatarContainer}>
                  <ImagePickerComponent />
                </View>
              </LinearGradient>
            </View>

            {/* Info text */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                {t("profilePhoto.tapToChange")}
              </Text>
              <Text style={styles.infoSubtext}>
                {t("profilePhoto.recommendedSize")}
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    letterSpacing: 0.5,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: "center",
    marginVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: width * 0.8,
  },
  avatarWrapper: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarGradient: {
    padding: 2,
    borderRadius: 24,
  },
  avatarContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
    borderRadius: 22,
  },
  infoContainer: {
    marginTop: 24,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 16,
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
  },
  infoText: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  infoSubtext: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
});
