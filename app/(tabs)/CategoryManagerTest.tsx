import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  pickImage,
  takePicture,
  saveCategoryImage,
  getCategoryImage,
  deleteCategoryImage,
} from "./delivery/utils/CategoryManager";

export default function CategoryManagerTest() {
  const [storeId, setStoreId] = useState("1");
  const [categoryId, setCategoryId] = useState("1");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load image on component mount or when storeId/categoryId changes
  React.useEffect(() => {
    loadCategoryImage();
  }, [storeId, categoryId]);

  const loadCategoryImage = async () => {
    try {
      const imageUri = await getCategoryImage(storeId, categoryId);
      setSelectedImage(imageUri);
    } catch (error) {
      console.error("Error loading image:", error);
    }
  };

  const handlePickImage = async () => {
    try {
      const imageUri = await pickImage();
      if (imageUri) {
        setSelectedImage(imageUri);
        await saveCategoryImage(storeId, categoryId, imageUri);
        console.log(`Image saved for store ${storeId}, category ${categoryId}`);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const handleTakePicture = async () => {
    try {
      const imageUri = await takePicture();
      if (imageUri) {
        setSelectedImage(imageUri);
        await saveCategoryImage(storeId, categoryId, imageUri);
        console.log(
          `Picture saved for store ${storeId}, category ${categoryId}`
        );
      }
    } catch (error) {
      console.error("Error taking picture:", error);
    }
  };

  const handleDeleteImage = async () => {
    try {
      await deleteCategoryImage(storeId, categoryId);
      setSelectedImage(null);
      console.log(`Image deleted for store ${storeId}, category ${categoryId}`);
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Category Manager Test</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Category Image Manager</Text>

        {/* Input fields */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Store ID:</Text>
          <TextInput
            style={styles.input}
            value={storeId}
            onChangeText={setStoreId}
            placeholder="Enter Store ID"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Category ID:</Text>
          <TextInput
            style={styles.input}
            value={categoryId}
            onChangeText={setCategoryId}
            placeholder="Enter Category ID"
          />
        </View>

        {/* Image Container */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Category Image:</Text>

          <TouchableOpacity
            style={styles.imageContainer}
            onPress={handlePickImage}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="image-outline" size={40} color="#999" />
                <Text style={styles.placeholderText}>Tap to select image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Control buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handlePickImage}>
            <Ionicons name="images-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleTakePicture}>
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeleteImage}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Image selection status */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Image Status:</Text>
          <Text style={styles.statusText}>
            {selectedImage ? "Image selected ✓" : "No image selected"}
          </Text>
        </View>

        {/* Additional instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to use:</Text>
          <Text style={styles.instructionsText}>
            1. Enter a store ID and category ID above{"\n"}
            2. Tap on the image container or buttons to select/take an image
            {"\n"}
            3. The image is automatically saved to AsyncStorage{"\n"}
            4. When you reload with the same store/category IDs, the image will
            be loaded
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  imageSection: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#efefef",
    borderRadius: 8,
    backgroundColor: "#fdfdfd",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    marginTop: 8,
    color: "#999",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A5D23",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: "#d9534f",
  },
  buttonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "500",
  },
  statusSection: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
  },
  instructionsContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#e8f4ff",
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
