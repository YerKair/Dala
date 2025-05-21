import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TaxiService, setGlobalToken } from "../../services/TaxiService";
import { useAuth } from "../../auth/AuthContext";

export default function AuthDebugScreen() {
  const { token: authContextToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [apiTestResult, setApiTestResult] = useState<string | null>(null);
  const [apiTestLoading, setApiTestLoading] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState<string>("Not checked");
  const [authCheckLoading, setAuthCheckLoading] = useState(false);
  const [historyTestLoading, setHistoryTestLoading] = useState(false);
  const [historyTestResult, setHistoryTestResult] = useState<string | null>(
    null
  );
  const [showFullToken, setShowFullToken] = useState(false);

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    // When authContextToken changes, update it in TaxiService
    if (authContextToken) {
      setGlobalToken(authContextToken);
      addLogMessage(
        `Auth context token set in TaxiService: ${authContextToken.substring(
          0,
          10
        )}...`
      );
    }
  }, [authContextToken]);

  const loadToken = async () => {
    try {
      setTokenLoading(true);

      // Try to get token from AuthContext first
      if (authContextToken) {
        setToken(authContextToken);
        setGlobalToken(authContextToken);
        addLogMessage(
          `Token loaded from AuthContext: ${authContextToken.substring(
            0,
            10
          )}...`
        );
      } else {
        // Fall back to AsyncStorage
        const storedToken =
          (await AsyncStorage.getItem("userToken")) ||
          (await AsyncStorage.getItem("token"));
        setToken(storedToken);

        if (storedToken) {
          setGlobalToken(storedToken);
          addLogMessage(
            `Token loaded from AsyncStorage: ${storedToken.substring(0, 10)}...`
          );
        } else {
          addLogMessage("No token found in AsyncStorage");
        }
      }
    } catch (error) {
      addLogMessage(`Error loading token: ${error}`);
    } finally {
      setTokenLoading(false);
    }
  };

  const addLogMessage = (message: string) => {
    setLogMessages((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  const checkAuthentication = async () => {
    try {
      setAuthCheckLoading(true);
      addLogMessage("Checking authentication status...");

      const authResult = await TaxiService.checkAuth();

      setAuthStatus(
        authResult.isAuthenticated
          ? `Authenticated (User ID: ${authResult.userId})`
          : `Not authenticated: ${authResult.message}`
      );

      addLogMessage(`Auth check: ${authResult.message}`);
    } catch (error) {
      addLogMessage(`Auth check error: ${error}`);
      setAuthStatus(`Error: ${error}`);
    } finally {
      setAuthCheckLoading(false);
    }
  };

  const testApiConnection = async () => {
    try {
      setApiTestLoading(true);
      setApiTestResult(null);
      addLogMessage("Testing API connection...");

      // Use the same URL as in TaxiService
      const apiUrl = TaxiService["API_URL"];

      const response = await fetch(`${apiUrl}/trips?limit=1`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const statusText = `${response.status} ${response.statusText}`;
      addLogMessage(`API response status: ${statusText}`);

      let responseBody = "";
      try {
        const data = await response.json();
        responseBody = JSON.stringify(data, null, 2);
        addLogMessage(`API response body: ${responseBody}`);
      } catch (e) {
        addLogMessage(`Could not parse response as JSON: ${e}`);
        try {
          responseBody = await response.text();
          addLogMessage(`Raw response: ${responseBody}`);
        } catch (e2) {
          addLogMessage(`Could not get response text: ${e2}`);
        }
      }

      setApiTestResult(`Status: ${statusText}\n\nResponse:\n${responseBody}`);
    } catch (error) {
      addLogMessage(`API test error: ${error}`);
      setApiTestResult(`Error: ${error}`);
    } finally {
      setApiTestLoading(false);
    }
  };

  const testTripHistory = async () => {
    try {
      setHistoryTestLoading(true);
      setHistoryTestResult(null);
      addLogMessage("Testing trip history API...");

      // Use TaxiService to test trip history
      const tripHistory = await TaxiService.getTripHistory();

      const resultText = `Received ${tripHistory.length || 0} trip records`;
      addLogMessage(resultText);

      if (tripHistory.length > 0) {
        const sampleTrip = tripHistory[0];
        setHistoryTestResult(
          `${resultText}\n\nSample trip: \n${JSON.stringify(
            sampleTrip,
            null,
            2
          )}`
        );
      } else {
        setHistoryTestResult(
          `${resultText}\n\nNo trips found. This could be because: \n- You have no trips \n- The API returned an empty response \n- There's an authentication issue`
        );
      }
    } catch (error) {
      addLogMessage(`Trip history API error: ${error}`);
      setHistoryTestResult(`Error: ${error}`);
    } finally {
      setHistoryTestLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      addLogMessage("Attempting to refresh token...");

      // For demo purposes, simulate token refresh by generating a new random token
      const demoToken = "demo_" + Math.random().toString(36).substring(2);

      // Save to AsyncStorage (both keys for compatibility)
      await AsyncStorage.setItem("userToken", demoToken);
      await AsyncStorage.setItem("token", demoToken);

      // Update local state
      setToken(demoToken);

      // Set in TaxiService
      setGlobalToken(demoToken);

      addLogMessage(`Demo token saved: ${demoToken.substring(0, 10)}...`);

      Alert.alert(
        "Token Refreshed",
        "A new demo token has been generated and saved.",
        [{ text: "OK" }]
      );
    } catch (error) {
      addLogMessage(`Error refreshing token: ${error}`);
    }
  };

  const copyTokenToClipboard = () => {
    if (token) {
      Clipboard.setString(token);
      Alert.alert("Token Copied", "The token has been copied to clipboard");
      addLogMessage("Token copied to clipboard");
    }
  };

  const testCustomToken = async () => {
    Alert.prompt(
      "Test Custom Token",
      "Enter a token to test:",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel",
        },
        {
          text: "OK",
          onPress: async (tokenText) => {
            if (tokenText) {
              try {
                addLogMessage(
                  `Setting custom token: ${tokenText.substring(0, 15)}...`
                );
                setToken(tokenText);
                setGlobalToken(tokenText);

                // Try a test API call with this token
                await testApiConnectionWithToken(tokenText);
              } catch (error) {
                addLogMessage(`Error setting custom token: ${error}`);
              }
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const testApiConnectionWithToken = async (testToken: string) => {
    try {
      addLogMessage(
        `Testing API with custom token: ${testToken.substring(0, 15)}...`
      );

      const apiUrl = TaxiService["API_URL"];
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken.trim()}`,
      };

      addLogMessage(`Headers: ${JSON.stringify(headers)}`);

      const response = await fetch(`${apiUrl}/trips/available`, {
        method: "GET",
        headers,
      });

      const status = `${response.status} ${response.statusText}`;
      addLogMessage(`Custom token test response: ${status}`);

      if (response.ok) {
        addLogMessage("Custom token test succeeded!");
        Alert.alert("Success", "API call with custom token succeeded!");
      } else {
        const errorText = await response.text();
        addLogMessage(`Custom token error: ${errorText}`);
        Alert.alert("Error", `Failed with status ${status}: ${errorText}`);
      }
    } catch (error) {
      addLogMessage(`Custom token test error: ${error}`);
      Alert.alert("Error", `Test failed: ${error}`);
    }
  };

  const setDriverDemoToken = () => {
    try {
      const driverToken = "DRIVER_DEMO_TOKEN_123456";
      addLogMessage(`Setting demo driver token: ${driverToken}`);
      setToken(driverToken);
      setGlobalToken(driverToken);

      // Save to AsyncStorage as well
      AsyncStorage.setItem("authToken", driverToken)
        .then(() => {
          addLogMessage("Driver token saved to AsyncStorage");
          Alert.alert(
            "Success",
            "Driver demo token set. You can now access driver features."
          );
        })
        .catch((error) => {
          addLogMessage(`Error saving to AsyncStorage: ${error}`);
        });
    } catch (error) {
      addLogMessage(`Error setting driver token: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auth Debug</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Token</Text>
          {tokenLoading ? (
            <ActivityIndicator size="small" color="#4A5D23" />
          ) : (
            <>
              <Text style={styles.tokenStatus}>
                Status: {token ? "Token Found" : "No Token"}
              </Text>
              {token && (
                <View>
                  <TouchableOpacity
                    onPress={() => setShowFullToken(!showFullToken)}
                    style={styles.tokenToggle}
                  >
                    <Text style={styles.tokenValue}>
                      {showFullToken ? token : token.substring(0, 20) + "..."}
                    </Text>
                    <Ionicons
                      name={showFullToken ? "eye-off" : "eye"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={copyTokenToClipboard}
                  >
                    <Text style={styles.copyButtonText}>Copy Token</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={loadToken}>
                  <Text style={styles.buttonText}>Reload Token</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={refreshToken}>
                  <Text style={styles.buttonText}>Demo New Token</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: "#333", marginTop: 10 },
                  ]}
                  onPress={setDriverDemoToken}
                >
                  <Text style={[styles.buttonText, { color: "#fff" }]}>
                    Set Driver Token
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { marginTop: 10 }]}
                  onPress={testCustomToken}
                >
                  <Text style={styles.buttonText}>Test Custom Token</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Check</Text>
          <Text style={styles.authStatus}>Status: {authStatus}</Text>
          <TouchableOpacity
            style={[styles.button, styles.apiTestButton]}
            onPress={checkAuthentication}
            disabled={authCheckLoading}
          >
            <Text style={styles.buttonText}>
              {authCheckLoading ? "Checking..." : "Check Authentication"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Connection Test</Text>
          <TouchableOpacity
            style={[styles.button, styles.apiTestButton]}
            onPress={testApiConnection}
            disabled={apiTestLoading}
          >
            <Text style={styles.buttonText}>
              {apiTestLoading ? "Testing..." : "Test API Connection"}
            </Text>
          </TouchableOpacity>

          {apiTestLoading && (
            <ActivityIndicator
              size="small"
              color="#4A5D23"
              style={styles.loader}
            />
          )}

          {apiTestResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{apiTestResult}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip History API Test</Text>
          <TouchableOpacity
            style={[styles.button, styles.apiTestButton]}
            onPress={testTripHistory}
            disabled={historyTestLoading}
          >
            <Text style={styles.buttonText}>
              {historyTestLoading ? "Testing..." : "Test Trip History API"}
            </Text>
          </TouchableOpacity>

          {historyTestLoading && (
            <ActivityIndicator
              size="small"
              color="#4A5D23"
              style={styles.loader}
            />
          )}

          {historyTestResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{historyTestResult}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Log</Text>
          <View style={styles.logBox}>
            <ScrollView style={styles.logScroll}>
              {logMessages.map((msg, index) => (
                <Text key={index} style={styles.logMessage}>
                  {msg}
                </Text>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.clearLogButton]}
            onPress={() => setLogMessages([])}
          >
            <Text style={styles.buttonText}>Clear Log</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  tokenStatus: {
    fontSize: 16,
    marginBottom: 8,
    color: "#444",
  },
  tokenValue: {
    fontSize: 14,
    marginBottom: 16,
    color: "#666",
    fontFamily: "monospace",
  },
  authStatus: {
    fontSize: 16,
    marginBottom: 16,
    color: "#444",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    backgroundColor: "#4A5D23",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  apiTestButton: {
    flex: 0,
    marginBottom: 16,
  },
  buttonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 14,
  },
  resultBox: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    maxHeight: 200,
  },
  resultText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#333",
  },
  logBox: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    height: 200,
    marginBottom: 8,
  },
  logScroll: {
    flex: 1,
  },
  logMessage: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#333",
    marginBottom: 4,
  },
  clearLogButton: {
    flex: 0,
    marginTop: 8,
    backgroundColor: "#777",
  },
  loader: {
    marginVertical: 8,
  },
  tokenToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginVertical: 10,
  },
  copyButton: {
    backgroundColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  copyButtonText: {
    color: "#333",
    fontWeight: "500",
  },
});
