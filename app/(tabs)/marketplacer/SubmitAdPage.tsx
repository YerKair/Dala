import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  Image,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
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

// Camera Icon Component
const CameraIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="gray"
    strokeWidth={1.5}
  >
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

// Dropdown Component
interface DropdownProps {
  placeholder: string;
  value: string;
  onPress: () => void;
}

const Dropdown = ({ placeholder, value, onPress }: DropdownProps) => {
  return (
    <TouchableOpacity style={styles.dropdownField} onPress={onPress}>
      <Text style={value ? styles.inputText : styles.placeholderText}>
        {value || placeholder}
      </Text>
      <Svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="black"
        strokeWidth={1.5}
      >
        <Path d="M6 9l6 6 6-6" />
      </Svg>
    </TouchableOpacity>
  );
};

export default function SubmitAdPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState(t("marketplace.conditions.new"));
  const [mainPhotoUri, setMainPhotoUri] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<
    Array<string | null>
  >([null, null, null]);

  // Request permission to access the device's photos
  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("marketplace.submitAdPage.permissionDenied"),
          t("marketplace.submitAdPage.mediaPermissionRequired")
        );
        return false;
      }
      return true;
    }
    return true;
  };

  // Function to pick an image from the device's media library
  const pickImage = async (index: number) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        if (index === 0) {
          setMainPhotoUri(result.assets[0].uri);
        } else {
          const newPhotos = [...additionalPhotos];
          newPhotos[index - 1] = result.assets[0].uri;
          setAdditionalPhotos(newPhotos);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        t("marketplace.submitAdPage.errorPickingImage"),
        t("marketplace.submitAdPage.pickImageError")
      );
    }
  };

  // Function to navigate back
  const goBack = () => {
    router.push("/marketplacer/MarketplaceScreen");
  };

  // Function to show category picker
  const showCategoryPicker = () => {
    Alert.alert(
      t("marketplace.submitAdPage.selectCategoryTitle"),
      t("marketplace.submitAdPage.selectCategoryMessage"),
      [
        {
          text: t("marketplace.categories.foodProducts"),
          onPress: () => setCategory(t("marketplace.categories.foodProducts")),
        },
        {
          text: t("marketplace.categories.handicrafts"),
          onPress: () => setCategory(t("marketplace.categories.handicrafts")),
        },
        {
          text: t("marketplace.categories.clothesFootwear"),
          onPress: () =>
            setCategory(t("marketplace.categories.clothesFootwear")),
        },
        {
          text: t("marketplace.categories.utensils"),
          onPress: () => setCategory(t("marketplace.categories.utensils")),
        },
        {
          text: t("marketplace.categories.petProducts"),
          onPress: () => setCategory(t("marketplace.categories.petProducts")),
        },
        {
          text: t("marketplace.categories.seedsSeedlings"),
          onPress: () =>
            setCategory(t("marketplace.categories.seedsSeedlings")),
        },
        {
          text: t("marketplace.categories.householdGoods"),
          onPress: () =>
            setCategory(t("marketplace.categories.householdGoods")),
        },
        {
          text: t("marketplace.categories.healthBeauty"),
          onPress: () => setCategory(t("marketplace.categories.healthBeauty")),
        },
        {
          text: t("marketplace.categories.houseplants"),
          onPress: () => setCategory(t("marketplace.categories.houseplants")),
        },
        { text: t("marketplace.submitAdPage.cancel"), style: "cancel" },
      ]
    );
  };

  // Function to show condition picker
  const showConditionPicker = () => {
    Alert.alert(
      t("marketplace.submitAdPage.selectConditionTitle"),
      t("marketplace.submitAdPage.selectConditionMessage"),
      [
        {
          text: t("marketplace.conditions.new"),
          onPress: () => setCondition(t("marketplace.conditions.new")),
        },
        {
          text: t("marketplace.conditions.used"),
          onPress: () => setCondition(t("marketplace.conditions.used")),
        },
        {
          text: t("marketplace.conditions.damaged"),
          onPress: () => setCondition(t("marketplace.conditions.damaged")),
        },
        { text: t("marketplace.submitAdPage.cancel"), style: "cancel" },
      ]
    );
  };

  // Validate form
  const validateForm = () => {
    if (!productName || productName.length < 10) {
      Alert.alert(
        t("marketplace.submitAdPage.formError"),
        t("marketplace.submitAdPage.productNameTooShort")
      );
      return false;
    }
    if (!category) {
      Alert.alert(
        t("marketplace.submitAdPage.formError"),
        t("marketplace.submitAdPage.categoryRequired")
      );
      return false;
    }
    if (!description) {
      Alert.alert(
        t("marketplace.submitAdPage.formError"),
        t("marketplace.submitAdPage.descriptionRequired")
      );
      return false;
    }
    if (!price) {
      Alert.alert(
        t("marketplace.submitAdPage.formError"),
        t("marketplace.submitAdPage.priceRequired")
      );
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Create a new product object
      const newProduct = {
        id: Date.now().toString(),
        title: productName,
        description,
        price,
        category,
        condition,
        imageUri: mainPhotoUri,
      };

      // Get existing products from storage
      const existingProductsJSON = await AsyncStorage.getItem(
        "marketplace_products"
      );
      const existingProducts = existingProductsJSON
        ? JSON.parse(existingProductsJSON)
        : [];

      // Add new product to array
      const updatedProducts = [newProduct, ...existingProducts];

      // Save back to storage
      await AsyncStorage.setItem(
        "marketplace_products",
        JSON.stringify(updatedProducts)
      );

      // Show success message
      Alert.alert(
        t("marketplace.submitAdPage.adSubmitted"),
        t("marketplace.submitAdPage.adSubmittedSuccess"),
        [
          {
            text: "OK",
            onPress: () =>
              router.push("/(tabs)/marketplacer/MarketplaceScreen"),
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting ad:", error);
      Alert.alert(
        t("marketplace.submitAdPage.formError"),
        t("marketplace.submitAdPage.adSubmitFailed")
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <BackButton />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("marketplace.submitAdPage.title")}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.formContainer,
          { paddingBottom: 40 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Product Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.productName")}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("marketplace.submitAdPage.enterProductName")}
            value={productName}
            onChangeText={setProductName}
          />
        </View>

        {/* Category Dropdown */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.category")}
          </Text>
          <Dropdown
            placeholder={t("marketplace.submitAdPage.selectCategory")}
            value={category}
            onPress={showCategoryPicker}
          />
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.description")}
          </Text>
          <TextInput
            style={styles.textAreaInput}
            placeholder={t("marketplace.submitAdPage.enterDescription")}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Price */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.price")}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("marketplace.submitAdPage.enterPrice")}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>

        {/* Condition Dropdown */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.condition")}
          </Text>
          <Dropdown
            placeholder={t("marketplace.submitAdPage.selectCondition")}
            value={condition}
            onPress={showConditionPicker}
          />
        </View>

        {/* Contact Information */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>
            {t("marketplace.submitAdPage.contactInformation")}
          </Text>
        </View>

        {/* Contact Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.yourName")}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("marketplace.submitAdPage.enterYourName")}
            value={contactName}
            onChangeText={setContactName}
          />
        </View>

        {/* Contact Phone */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.yourPhone")}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("marketplace.submitAdPage.enterYourPhone")}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Photos Section */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>
            {t("marketplace.submitAdPage.photos")}
          </Text>
        </View>

        {/* Main Photo */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.mainPhoto")}
          </Text>
          <TouchableOpacity
            style={styles.photoUploader}
            onPress={() => pickImage(0)}
          >
            {mainPhotoUri ? (
              <Image
                source={{ uri: mainPhotoUri }}
                style={styles.uploadedImage}
              />
            ) : (
              <>
                <CameraIcon />
                <Text style={styles.uploadPhotoText}>
                  {t("marketplace.submitAdPage.uploadPhoto")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Additional Photos */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t("marketplace.submitAdPage.additionalPhotos")}
          </Text>
          <View style={styles.additionalPhotosContainer}>
            {additionalPhotos.map((photoUri, index) => (
              <TouchableOpacity
                key={index}
                style={styles.additionalPhotoUploader}
                onPress={() => pickImage(index + 1)}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.uploadedImage}
                  />
                ) : (
                  <>
                    <CameraIcon />
                    <Text style={styles.uploadPhotoText}>
                      {t("marketplace.submitAdPage.uploadPhoto")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>
            {t("marketplace.submitAdPage.submit")}
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
    fontWeight: "bold",
    fontSize: 22,
    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },
  textAreaInput: {
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    padding: 12,
    height: 120,
    fontSize: 16,
  },
  sectionTitle: {
    marginBottom: 20,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  photoUploader: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
  },
  uploadPhotoText: {
    position: "absolute",
    bottom: 5,
    fontSize: 10,
    color: "#666",
  },
  additionalPhotosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  additionalPhotoUploader: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#4C6A2E",
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  dropdownField: {
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  placeholderText: {
    color: "#888",
    fontSize: 16,
  },
  inputText: {
    fontSize: 16,
    color: "#000",
  },
});
