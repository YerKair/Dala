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
  const insets = useSafeAreaInsets();
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("New");
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
          "Permission denied",
          "Sorry, we need camera roll permissions to upload images."
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
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  // Function to navigate back
  const goBack = () => {
    router.push("/marketplacer/MarketplaceScreen");
  };

  // Function to show category picker
  const showCategoryPicker = () => {
    Alert.alert("Select Category", "Choose a category for your product", [
      { text: "Food products", onPress: () => setCategory("Food products") },
      { text: "Handicrafts", onPress: () => setCategory("Handicrafts") },
      {
        text: "Clothes and footwear",
        onPress: () => setCategory("Clothes and footwear"),
      },
      { text: "Utensils", onPress: () => setCategory("Utensils") },
      { text: "Pet Products", onPress: () => setCategory("Pet Products") },
      {
        text: "Seeds and seedlings",
        onPress: () => setCategory("Seeds and seedlings"),
      },
      {
        text: "Household goods",
        onPress: () => setCategory("Household goods"),
      },
      {
        text: "Health and beauty products",
        onPress: () => setCategory("Health and beauty products"),
      },
      {
        text: "Houseplants and flowers",
        onPress: () => setCategory("Houseplants and flowers"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Function to show condition picker
  const showConditionPicker = () => {
    Alert.alert("Select Condition", "Choose the condition of your product", [
      { text: "New", onPress: () => setCondition("New") },
      { text: "Used", onPress: () => setCondition("Used") },
      { text: "Damaged", onPress: () => setCondition("Damaged") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Validate form
  const validateForm = () => {
    if (!productName || productName.length < 10) {
      Alert.alert("Error", "Product name must be at least 10 characters");
      return false;
    }
    if (!category) {
      Alert.alert("Error", "Please select a category");
      return false;
    }
    if (!description) {
      Alert.alert("Error", "Please provide a description");
      return false;
    }
    if (!price) {
      Alert.alert("Error", "Please set a price");
      return false;
    }
    return true;
  };

  // Function to handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Generate a unique ID using timestamp
      const productId = Date.now().toString();

      // Create the product object
      const newProduct = {
        id: productId,
        title: productName,
        description,
        price: `${price} ₸`,
        category,
        condition,
        imageUri: mainPhotoUri,
        additionalImageUris: additionalPhotos.filter(Boolean), // Remove null values
        contact: {
          name: contactName,
          phone: contactPhone,
        },
        dateCreated: new Date().toISOString(),
      };

      // Get existing products from storage
      const existingProductsJSON = await AsyncStorage.getItem(
        "marketplace_products"
      );
      let allProducts = [];

      if (existingProductsJSON) {
        allProducts = JSON.parse(existingProductsJSON);
      }

      // Add the new product
      allProducts.push(newProduct);

      // Save back to storage
      await AsyncStorage.setItem(
        "marketplace_products",
        JSON.stringify(allProducts)
      );

      Alert.alert("Success", "Your ad has been submitted successfully", [
        {
          text: "OK",
          onPress: () => {
            // Navigate back to the previous screen first (which would be marketplace)
            router.back();
            // Then navigate to the specific category if needed
            // Or you can use router.replace to replace the current screen
            router.replace({
              pathname: "/(tabs)/marketplacer/CategoryPage",
              params: { category: category },
            });
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert("Error", "Failed to save your ad. Please try again.");
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
        <Text style={styles.headerTitle}>Ad Service</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 80 + insets.bottom },
        ]}
      >
        <Text style={styles.formTitle}>Create an ad</Text>

        {/* Product Name Field */}
        <Text style={styles.fieldLabel}>
          Name of your product*
          <Text style={styles.requiredNote}>
            *Please write at least 10 characters
          </Text>
        </Text>
        <TextInput
          style={styles.inputField}
          placeholder="Name of your product"
          value={productName}
          onChangeText={setProductName}
          maxLength={50}
        />
        <Text style={styles.charCount}>{productName.length}/50</Text>

        {/* Category Dropdown */}
        <Text style={styles.fieldLabel}>Category</Text>
        <Dropdown
          placeholder="Choose category"
          value={category}
          onPress={showCategoryPicker}
        />

        {/* Condition Dropdown */}
        <Text style={styles.fieldLabel}>Condition</Text>
        <Dropdown
          placeholder="Choose condition"
          value={condition}
          onPress={showConditionPicker}
        />

        {/* Price Field */}
        <Text style={styles.fieldLabel}>Price (₸)*</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Enter price"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        {/* Photo Section */}
        <Text style={styles.fieldLabel}>Photo</Text>
        <Text style={styles.photoNote}>
          The very first photo will be on the cover of the ad.
        </Text>
        <View style={styles.photoGrid}>
          <TouchableOpacity
            style={styles.photoPlaceholder}
            onPress={() => pickImage(0)}
          >
            {mainPhotoUri ? (
              <Image
                source={{ uri: mainPhotoUri }}
                style={styles.photoPreview}
              />
            ) : (
              <CameraIcon />
            )}
            <Text style={styles.photoText}>Add main photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoPlaceholder}
            onPress={() => pickImage(1)}
          >
            {additionalPhotos[0] ? (
              <Image
                source={{ uri: additionalPhotos[0] }}
                style={styles.photoPreview}
              />
            ) : (
              <CameraIcon />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoPlaceholder}
            onPress={() => pickImage(2)}
          >
            {additionalPhotos[1] ? (
              <Image
                source={{ uri: additionalPhotos[1] }}
                style={styles.photoPreview}
              />
            ) : (
              <CameraIcon />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoPlaceholder}
            onPress={() => pickImage(3)}
          >
            {additionalPhotos[2] ? (
              <Image
                source={{ uri: additionalPhotos[2] }}
                style={styles.photoPreview}
              />
            ) : (
              <CameraIcon />
            )}
          </TouchableOpacity>
        </View>

        {/* Description Field */}
        <Text style={styles.fieldLabel}>Description *</Text>
        <TextInput
          style={[styles.inputField, styles.textArea]}
          placeholder="Write a definition for your product"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={900}
        />
        <Text style={styles.charCount}>{description.length}/900</Text>

        {/* Contact Information */}
        <Text style={styles.sectionTitle}>Your contact information</Text>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Your name"
          value={contactName}
          onChangeText={setContactName}
        />

        <Text style={styles.fieldLabel}>Mobile number</Text>
        <TextInput
          style={styles.inputField}
          placeholder="+7 (___) ___-__-__"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit ad</Text>
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
  contentContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  requiredNote: {
    fontSize: 12,
    color: "#888",
    fontWeight: "normal",
  },
  inputField: {
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    padding: 12,
    marginBottom: 5,
    fontSize: 16,
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
  photoNote: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  photoPlaceholder: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
  },
  photoText: {
    position: "absolute",
    bottom: 5,
    fontSize: 10,
    color: "#666",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#888",
    textAlign: "right",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 15,
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
});
