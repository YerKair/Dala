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
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ImageManager from "./delivery/utils/components/ImageManager";

export default function ImageManagerTest() {
  const [entityType, setEntityType] = useState("product");
  const [entityId, setEntityId] = useState("1");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageSelected = (imageUri: string) => {
    setSelectedImage(imageUri);
    console.log(
      `Image selected for ${entityType}_${entityId}:`,
      imageUri.substring(0, 50) + "..."
    );
  };

  const handleImageRemoved = () => {
    setSelectedImage(null);
    console.log(`Image removed for ${entityType}_${entityId}`);
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
        <Text style={styles.headerTitle}>Image Manager Test</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Test Image Loading</Text>

        {/* Input fields */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Entity Type:</Text>
          <TextInput
            style={styles.input}
            value={entityType}
            onChangeText={setEntityType}
            placeholder="product, category, etc."
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Entity ID:</Text>
          <TextInput
            style={styles.input}
            value={entityId}
            onChangeText={setEntityId}
            keyboardType="numeric"
            placeholder="Enter ID"
          />
        </View>

        {/* Image Manager */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Standard Size:</Text>
          <ImageManager
            entityId={entityId}
            entityType={entityType}
            onImageSelected={handleImageSelected}
            onImageRemoved={handleImageRemoved}
          />
        </View>

        {/* Different sizes */}
        <View style={styles.sizesContainer}>
          <View style={styles.sizeSection}>
            <Text style={styles.sizeTitle}>Small</Text>
            <ImageManager
              entityId={entityId}
              entityType={entityType}
              size="small"
            />
          </View>

          <View style={styles.sizeSection}>
            <Text style={styles.sizeTitle}>Medium</Text>
            <ImageManager
              entityId={entityId}
              entityType={entityType}
              size="medium"
            />
          </View>

          <View style={styles.sizeSection}>
            <Text style={styles.sizeTitle}>Large</Text>
            <ImageManager
              entityId={entityId}
              entityType={entityType}
              size="large"
            />
          </View>
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
            1. Enter an entity type and ID above{"\n"}
            2. Tap on the image container to select an image{"\n"}
            3. The image is automatically saved to AsyncStorage{"\n"}
            4. When you reload with the same entity type/ID, the image will be
            loaded
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
  sizesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    paddingHorizontal: 8,
  },
  sizeSection: {
    alignItems: "center",
  },
  sizeTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
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
