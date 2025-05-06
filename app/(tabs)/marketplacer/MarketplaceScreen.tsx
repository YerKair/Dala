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
  TextInput,
  ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";

// Back Button Component
const BackButton = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth={1.5}
  >
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

// Search Icon Component
const SearchIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="gray"
    strokeWidth={1.5}
  >
    <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Svg>
);

// Category Card Component
interface CategoryCardProps {
  title: string;
  image: ImageSourcePropType;
  onPress: () => void;
}

const CategoryCard = ({ title, image, onPress }: CategoryCardProps) => {
  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
      <Image source={image} style={styles.categoryImage} resizeMode="contain" />
      <Text style={styles.categoryTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function MarketplaceScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Function to navigate back to home page
  const goBack = () => {
    router.push("/"); // Navigate to index/home page
  };

  // Function to navigate to category page
  const navigateToCategory = (category: string) => {
    router.push({
      pathname: "/(tabs)/marketplacer/CategoryPage",
      params: { category },
    });
  };

  // Function to navigate to submit ad page
  const navigateToSubmitAd = () => {
    router.push("/(tabs)/marketplacer/SubmitAdPage");
  };

  // Define category type
  interface Category {
    id: string;
    title: string;
    image: ImageSourcePropType;
  }

  // Mock data for categories
  const categories: Category[] = [
    {
      id: "1",
      title: t("marketplace.categories.foodProducts"),
      image: require("@/assets/images/food-products.png"),
    },
    {
      id: "2",
      title: t("marketplace.categories.handicrafts"),
      image: require("@/assets/images/handicrafts.png"),
    },
    {
      id: "3",
      title: t("marketplace.categories.clothesFootwear"),
      image: require("@/assets/images/clothes.png"),
    },
    {
      id: "4",
      title: t("marketplace.categories.utensils"),
      image: require("@/assets/images/utensils.png"),
    },
    {
      id: "5",
      title: t("marketplace.categories.petProducts"),
      image: require("@/assets/images/pet-products.png"),
    },
    {
      id: "6",
      title: t("marketplace.categories.seedsSeedlings"),
      image: require("@/assets/images/seeds.png"),
    },
    {
      id: "7",
      title: t("marketplace.categories.householdGoods"),
      image: require("@/assets/images/household.png"),
    },
    {
      id: "8",
      title: t("marketplace.categories.healthBeauty"),
      image: require("@/assets/images/health-beauty.png"),
    },
    {
      id: "9",
      title: t("marketplace.categories.houseplants"),
      image: require("@/assets/images/houseplants.png"),
    },
  ];

  // Group categories into rows of 3
  const groupedCategories: Category[][] = [];
  for (let i = 0; i < categories.length; i += 3) {
    groupedCategories.push(categories.slice(i, i + 3));
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <BackButton />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("marketplace.title")}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchIcon />
        <TextInput
          style={styles.searchInput}
          placeholder={t("search")}
          placeholderTextColor="#888"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 80 + insets.bottom },
        ]}
      >
        {/* Categories Grid */}
        {groupedCategories.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.categoryRow}>
            {row.map((category) => (
              <CategoryCard
                key={category.id}
                title={category.title}
                image={category.image}
                onPress={() => navigateToCategory(category.title)}
              />
            ))}
          </View>
        ))}

        {/* Submit Ad Button */}
        <TouchableOpacity
          style={styles.submitAdButton}
          onPress={navigateToSubmitAd}
        >
          <Text style={styles.submitAdButtonText}>
            {t("marketplace.submitAd")}
          </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 20,
    color: "#000000",
    textAlign: "center",
    marginRight: 40, // To center the title accounting for the back button width
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  categoryCard: {
    width: "31%",
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 110,
  },
  categoryImage: {
    width: 60,
    height: 60,
  },
  categoryTitle: {
    marginTop: 5,
    fontSize: 12,
    textAlign: "center",
  },
  submitAdButton: {
    backgroundColor: "#F8D7A4",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitAdButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
  },
});
