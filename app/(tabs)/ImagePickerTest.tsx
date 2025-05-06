import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function ImagePickerTest() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [message, ...prev]);
  };

  const pickImage = async () => {
    setLoading(true);
    try {
      addLog("Requesting permissions...");
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        addLog("Permission denied");
        return;
      }

      addLog("Permission granted, launching gallery...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      addLog("Gallery picker closed.");
      addLog(result.canceled ? "Selection canceled" : "Image selected");

      if (!result.canceled && result.assets && result.assets.length > 0) {
        addLog(
          `Selected image URI: ${result.assets[0].uri.substring(0, 30)}...`
        );
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      addLog(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async () => {
    setLoading(true);
    try {
      addLog("Requesting camera permissions...");
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        addLog("Camera permission denied");
        return;
      }

      addLog("Camera permission granted, launching camera...");
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      addLog("Camera closed.");
      addLog(result.canceled ? "Photo canceled" : "Photo taken");

      if (!result.canceled && result.assets && result.assets.length > 0) {
        addLog(`Photo URI: ${result.assets[0].uri.substring(0, 30)}...`);
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      addLog(
        `Camera error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>ImagePicker Test Page</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Pick Image from Gallery"
          onPress={pickImage}
          disabled={loading}
        />
        <View style={styles.spacer} />
        <Button title="Take Photo" onPress={takePicture} disabled={loading} />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
        </View>
      )}

      <Text style={styles.logsTitle}>Logs:</Text>
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logMessage}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  spacer: {
    width: 20,
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    resizeMode: "cover",
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 5,
  },
  logMessage: {
    marginBottom: 5,
    fontSize: 12,
    fontFamily: "monospace",
  },
});
