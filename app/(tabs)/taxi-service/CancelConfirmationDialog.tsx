// app/(tabs)/taxi-service/CancelConfirmationDialog.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface CancelConfirmationProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  tripStage: "waiting" | "active" | "completed" | "cancelled" | null;
}

const { width } = Dimensions.get("window");

const CancelConfirmationDialog: React.FC<CancelConfirmationProps> = ({
  visible,
  onClose,
  onConfirm,
  tripStage,
}) => {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  // Cancellation reasons
  const reasons = [
    t("taxi.cancelDialog.reasonChangedPlans"),
    t("taxi.cancelDialog.reasonWaitingTooLong"),
    t("taxi.cancelDialog.reasonFoundAlternative"),
    t("taxi.cancelDialog.reasonPriceTooHigh"),
    t("taxi.cancelDialog.reasonDriverAsked"),
    t("taxi.cancelDialog.reasonOther"),
  ];

  // Handle confirmation
  const handleConfirm = () => {
    if (selectedReason || tripStage === "active") {
      onConfirm(selectedReason || "Trip completed");
      setSelectedReason(null);
    }
  };

  // Close dialog
  const handleClose = () => {
    setSelectedReason(null);
    onClose();
    console.log("Dialog close handler called");
  };

  // Render a reason item
  const renderReasonItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.reasonItem,
        selectedReason === item && styles.reasonItemSelected,
      ]}
      onPress={() => setSelectedReason(item)}
    >
      <Text style={styles.reasonText}>{item}</Text>
      {selectedReason === item && (
        <Ionicons name="checkmark-circle" size={24} color="#4A5D23" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {tripStage === "active"
              ? t("taxi.cancelDialog.endTrip")
              : t("taxi.cancelDialog.cancelTrip")}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Main content */}
        {tripStage === "waiting" ? (
          <>
            <Text style={styles.subtitle}>
              {t("taxi.cancelDialog.selectReason")}
            </Text>
            <FlatList
              data={reasons}
              renderItem={renderReasonItem}
              keyExtractor={(item) => item}
              style={styles.reasonsList}
            />
            <Text style={styles.feeNote}>
              {t("taxi.cancelDialog.cancellationFeeNote")}
            </Text>
          </>
        ) : (
          <Text style={styles.subtitle}>
            {t("taxi.cancelDialog.endTripConfirm")}
          </Text>
        )}

        {/* Footer buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>
              {tripStage === "active"
                ? t("taxi.cancelDialog.continueTrip")
                : t("taxi.cancelDialog.keepTrip")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              tripStage !== "waiting" || selectedReason
                ? styles.confirmButtonEnabled
                : styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={tripStage === "waiting" && !selectedReason}
          >
            <Text style={styles.confirmButtonText}>
              {tripStage === "active"
                ? t("taxi.cancelDialog.endTrip")
                : t("taxi.cancelDialog.cancelTrip")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  reasonsList: {
    maxHeight: 300,
    marginVertical: 10,
  },
  reasonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  reasonItemSelected: {
    backgroundColor: "#f5f9f0",
  },
  reasonText: {
    fontSize: 16,
    color: "#333",
  },
  feeNote: {
    fontSize: 12,
    color: "#666",
    paddingHorizontal: 20,
    marginTop: 5,
    marginBottom: 15,
    fontStyle: "italic",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#333",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonEnabled: {
    backgroundColor: "#e74c3c",
  },
  confirmButtonDisabled: {
    backgroundColor: "#f5b7b1",
  },
  confirmButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
});

export default CancelConfirmationDialog;
