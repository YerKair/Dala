// app/(tabs)/taxi-service/chat.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalState, tripManager } from "../../store/globalState";
import { useTranslation } from "react-i18next";

// Message interface
interface Message {
  id: string;
  text: string;
  sender: "user" | "driver";
  timestamp: Date;
  delivered?: boolean;
}

// Empty state for the chat
const initialMessages: Message[] = [];

export default function ChatScreen() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const insets = useSafeAreaInsets();

  // Check if there's an active trip
  useEffect(() => {
    if (!globalState.tripData.isActive) {
      // If no active trip, redirect to taxi screen
      console.log("No active trip, redirecting to taxi screen");
      router.replace("/(tabs)/taxi-service/taxi");
    }
  }, []);

  // Function to handle sending a message
  const handleSendMessage = () => {
    if (inputText.trim().length === 0) return;

    // Create a new user message
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
      delivered: true,
    };

    // Add to messages
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInputText("");

    // Simulate driver response after 1-2 seconds
    setTimeout(() => {
      // Create a response based on the user's message
      let responseText = "I'll be there soon!";

      if (newMessage.text.toLowerCase().includes("where")) {
        responseText = "I'm waiting for you near the barrier.";
      } else if (
        newMessage.text.toLowerCase().includes("time") ||
        newMessage.text.toLowerCase().includes("long")
      ) {
        responseText = "I'll be there in about 2-3 minutes.";
      } else if (newMessage.text.toLowerCase().includes("cancel")) {
        responseText = "Please don't cancel, I'm almost there.";
      } else if (
        newMessage.text.toLowerCase().includes("hello") ||
        newMessage.text.toLowerCase().includes("hi")
      ) {
        responseText = "Hello! I'm on my way to pick you up.";
      }

      const driverResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "driver",
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, driverResponse]);
    }, 1000 + Math.random() * 1000);
  };

  // Function to go back
  const handleGoBack = () => {
    router.back();
  };

  // Format time as HH:MM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render a time divider
  const renderTimeDivider = (timestamp: Date) => {
    return (
      <View style={styles.timeDivider}>
        <Text style={styles.timeDividerText}>
          {t("taxi.chat.today")} {formatTime(timestamp)}
        </Text>
      </View>
    );
  };

  // Render a message item
  const renderMessageItem = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const isUserMessage = item.sender === "user";

    // For sent messages by the user
    if (isUserMessage) {
      return (
        <View style={styles.userMessageContainer}>
          <View style={styles.userMessage}>
            <Text style={styles.userMessageText}>{item.text}</Text>
          </View>
          {item.delivered && (
            <Text style={styles.deliveredText}>{t("taxi.chat.delivered")}</Text>
          )}
        </View>
      );
    }

    // For received messages from the driver
    return (
      <View style={styles.driverMessageContainer}>
        {index > 0 && messages[index - 1].sender !== "driver" && (
          <Text style={styles.driverName}>Ivan Shastyn</Text>
        )}
        <View style={styles.driverMessage}>
          <Text style={styles.driverMessageText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("taxi.chat.title")}</Text>
        <View style={styles.spacer} />
      </View>

      {/* Chat Messages */}
      <FlatList
        style={styles.messagesContainer}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        ListHeaderComponent={() =>
          messages.length > 0
            ? renderTimeDivider(messages[0].timestamp)
            : renderTimeDivider(new Date())
        }
      />

      {/* Bottom Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={styles.inputContainer}
      >
        <View
          style={[
            styles.inputWrapper,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera-outline" size={24} color="black" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t("taxi.chat.writeMessage")}
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim().length === 0 && styles.disabledSendButton,
            ]}
            onPress={handleSendMessage}
            disabled={inputText.trim().length === 0}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim().length === 0 ? "#CCC" : "#4C6A2E"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  spacer: {
    width: 34, // Same width as the back button for balanced centering
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 40,
  },
  timeDivider: {
    alignItems: "center",
    marginVertical: 16,
  },
  timeDividerText: {
    fontSize: 12,
    color: "#888",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  userMessageContainer: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  userMessage: {
    backgroundColor: "#E9F5FF",
    padding: 12,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    maxWidth: "80%",
  },
  userMessageText: {
    fontSize: 16,
    color: "#333",
  },
  deliveredText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  driverMessageContainer: {
    alignItems: "flex-start",
    marginBottom: 16,
  },
  driverName: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },
  driverMessage: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    maxWidth: "80%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  driverMessageText: {
    fontSize: 16,
    color: "#333",
  },
  inputContainer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  cameraButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
    marginHorizontal: 8,
    fontSize: 16,
  },
  sendButton: {
    padding: 8,
  },
  disabledSendButton: {
    opacity: 0.5,
  },
});
