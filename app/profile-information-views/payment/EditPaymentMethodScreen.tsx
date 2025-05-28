import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../auth/AuthContext";

// Back Icon
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

// Credit Card Icon
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

// User Icon
const UserIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#999"
    strokeWidth={1.5}
  >
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

// Calendar Icon
const CalendarIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#999"
    strokeWidth={1.5}
  >
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <Path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);

// Lock Icon
const LockIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#999"
    strokeWidth={1.5}
  >
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0110 0v4" />
  </Svg>
);

export default function EditPaymentMethodScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const cardId = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form state
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardholderName, setCardholderName] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [cvv, setCvv] = useState<string>("");
  const [makeDefault, setMakeDefault] = useState<boolean>(false);

  // Form validation state
  const [errors, setErrors] = useState({
    cardNumber: "",
    cardholderName: "",
    expirationDate: "",
    cvv: "",
  });

  // Fetch card data when component mounts
  useEffect(() => {
    const fetchCardData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await fetch(
          `http://192.168.0.109:8000/api/credit-cards/${cardId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch card details");
        }

        const data = await response.json();
        console.log("Card data from API:", data);

        // Format card number with spaces for display
        const formattedCardNumber = formatCardNumberForDisplay(
          data.card_number
        );

        setCardNumber(formattedCardNumber);
        setCardholderName(data.cardholder_name);
        setExpirationDate(data.expiration_date);
        setCvv(data.cvv);
        setMakeDefault(data.is_default || false);
      } catch (error) {
        console.error("Error fetching card data:", error);
        Alert.alert("Error", "Could not fetch card details");
      } finally {
        setLoading(false);
      }
    };

    fetchCardData();
  }, [cardId]);

  // Handle back button press
  const handleBackPress = () => {
    router.push(
      "/profile-information-views/profile-information/PaymentMethodsScreen"
    );
  };

  // Format card number for display (adding spaces)
  const formatCardNumberForDisplay = (value: string) => {
    const cleaned = value.replace(/\s+/g, "");

    let formatted = "";
    for (let i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += " ";
      }
      formatted += cleaned[i];
    }

    return formatted;
  };

  // Format card number as user types
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (cleaned.length > 16) return;

    let formatted = "";
    for (let i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += " ";
      }
      formatted += cleaned[i];
    }

    setCardNumber(formatted);
  };

  // Format expiration date (MM/YY)
  const formatExpirationDate = (value: string) => {
    const cleaned = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (cleaned.length > 4) return;

    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.substring(0, 2) + "/" + cleaned.substring(2);
    }

    setExpirationDate(formatted);
  };

  // Validate form
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      cardNumber: "",
      cardholderName: "",
      expirationDate: "",
      cvv: "",
    };

    // Validate card number
    if (!cardNumber.trim()) {
      newErrors.cardNumber = "Card number is required";
      isValid = false;
    } else if (cardNumber.replace(/\s+/g, "").length !== 16) {
      newErrors.cardNumber = "Card number must be 16 digits";
      isValid = false;
    }

    // Validate cardholder name
    if (!cardholderName.trim()) {
      newErrors.cardholderName = "Cardholder name is required";
      isValid = false;
    }

    // Validate expiration date
    if (!expirationDate.trim()) {
      newErrors.expirationDate = "Expiration date is required";
      isValid = false;
    } else {
      const parts = expirationDate.split("/");
      if (
        parts.length !== 2 ||
        parts[0].length !== 2 ||
        parts[1].length !== 2
      ) {
        newErrors.expirationDate = "Invalid format (MM/YY)";
        isValid = false;
      } else {
        const month = parseInt(parts[0], 10);
        if (month < 1 || month > 12) {
          newErrors.expirationDate = "Invalid month";
          isValid = false;
        }

        const currentYear = new Date().getFullYear() % 100;
        const year = parseInt(parts[1], 10);
        const currentMonth = new Date().getMonth() + 1;

        if (
          year < currentYear ||
          (year === currentYear && month < currentMonth)
        ) {
          newErrors.expirationDate = "Card has expired";
          isValid = false;
        }
      }
    }

    // Validate CVV
    if (!cvv.trim()) {
      newErrors.cvv = "CVV is required";
      isValid = false;
    } else if (cvv.length < 3 || cvv.length > 4) {
      newErrors.cvv = "CVV must be 3 or 4 digits";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");

      // Prepare data for API
      const updateData = {
        card_number: cardNumber.replace(/\s+/g, ""),
        cardholder_name: cardholderName,
        expiration_date: expirationDate,
        cvv: cvv,
        user_id: user?.id || 1,
        is_default: makeDefault,
      };

      console.log("Sending update to API:", updateData);

      // Send PUT request to update card
      const response = await fetch(
        `http://192.168.0.109:8000/api/credit-cards/${cardId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update payment method");
      }

      const result = await response.json();
      console.log("API response:", result);

      // Success alert
      Alert.alert("Success", "Payment method updated successfully", [
        {
          text: "OK",
          onPress: () =>
            router.push(
              "/profile-information-views/profile-information/PaymentMethodsScreen"
            ),
        },
      ]);
    } catch (error) {
      console.error("Error updating payment method:", error);
      Alert.alert(
        "Error",
        "Could not update payment method: " + (error as Error).message
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Payment Method</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading card details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Card illustration */}
          <View style={styles.cardIllustration}>
            <CreditCardIcon />
            <Text style={styles.cardIllustrationText}>
              Edit your card details
            </Text>
          </View>

          {/* Card Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <View
              style={[
                styles.inputWrapper,
                errors.cardNumber ? styles.inputWrapperError : null,
              ]}
            >
              <CreditCardIcon />
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={formatCardNumber}
                maxLength={19} // 16 digits + 3 spaces
              />
            </View>
            {errors.cardNumber ? (
              <Text style={styles.errorText}>{errors.cardNumber}</Text>
            ) : null}
          </View>

          {/* Cardholder Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <View
              style={[
                styles.inputWrapper,
                errors.cardholderName ? styles.inputWrapperError : null,
              ]}
            >
              <UserIcon />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={cardholderName}
                onChangeText={setCardholderName}
              />
            </View>
            {errors.cardholderName ? (
              <Text style={styles.errorText}>{errors.cardholderName}</Text>
            ) : null}
          </View>

          {/* Expiration and CVV in a row */}
          <View style={styles.rowContainer}>
            {/* Expiration Date */}
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Expiration</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.expirationDate ? styles.inputWrapperError : null,
                ]}
              >
                <CalendarIcon />
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  value={expirationDate}
                  onChangeText={formatExpirationDate}
                  maxLength={5} // MM/YY
                />
              </View>
              {errors.expirationDate ? (
                <Text style={styles.errorText}>{errors.expirationDate}</Text>
              ) : null}
            </View>

            {/* CVV */}
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>CVV</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.cvv ? styles.inputWrapperError : null,
                ]}
              >
                <LockIcon />
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  keyboardType="numeric"
                  value={cvv}
                  onChangeText={setCvv}
                  maxLength={4}
                  secureTextEntry
                />
              </View>
              {errors.cvv ? (
                <Text style={styles.errorText}>{errors.cvv}</Text>
              ) : null}
            </View>
          </View>

          {/* Make Default Option */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setMakeDefault(!makeDefault)}
          >
            <View style={styles.checkbox}>
              {makeDefault && (
                <Svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="#4CAF50"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  <Path d="M20 6L9 17l-5-5" />
                </Svg>
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              Set as default payment method
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Update Payment Method</Text>
            )}
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityNoteContainer}>
            <LockIcon />
            <Text style={styles.securityNoteText}>
              Your payment information is securely encrypted and stored
            </Text>
          </View>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  cardIllustration: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    marginBottom: 16,
  },
  cardIllustrationText: {
    marginTop: 8,
    fontSize: 16,
    color: "#666",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  inputWrapperError: {
    borderColor: "#F44336",
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    fontSize: 12,
    color: "#F44336",
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  securityNoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  securityNoteText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    textAlign: "center",
  },
});
