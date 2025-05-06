// File: app/(root)/work/requirements.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";

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

// Car Icon
const CarIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M7 17h10m-8-5h6M3 17V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v11M3 17h18M5 17v4M19 17v4" />
  </Svg>
);

// Delivery Icon
const DeliveryIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M16 16h6v-6h-4l-2-4h-7L8 9H4v7h2" />
    <Path d="M6 13h9m-5 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  </Svg>
);

// Customer Service Icon
const CustomerIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
  </Svg>
);

// Document Icon
const DocumentIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <Path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
    <Path d="M9 9h1m-1 4h6m-6 4h6" />
  </Svg>
);

// Car License Icon
const LicenseIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    <Path d="M7 16h1m2 0h1m2 0h1m2 0h1M4 9h16" />
  </Svg>
);

// Photo ID Icon
const IdCardIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <Path d="M14 10h5M14 15h5M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    <Path d="M5 15v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
  </Svg>
);

// Check Icon
const CheckIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4CAF50"
    strokeWidth={2}
  >
    <Path d="M20 6L9 17l-5-5" />
  </Svg>
);

// Warning Icon
const WarningIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFC107"
    strokeWidth={2}
  >
    <Path d="M12 9v4m0 4h.01m9.66-13a2 2 0 0 0-1.73-1H4.07a2 2 0 0 0-1.73 1L.63 8.73a2 2 0 0 0 0 1.47l1.7 2.26c.25.35.38.77.38 1.19V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3.34c0-.43.13-.85.39-1.2l1.7-2.25a2 2 0 0 0 0-1.47l-1.7-2.26z" />
  </Svg>
);

// X Icon
const XIcon = () => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F44336"
    strokeWidth={2}
  >
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

// Camera Icon
const CameraIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFFFFF"
    strokeWidth={2}
  >
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

// Interface for role requirement
interface Requirement {
  id: string;
  name: string;
  description: string;
  status: "approved" | "pending" | "missing";
  icon: React.ReactNode;
}

// Interface for role
interface RoleRequirements {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  requirements: Requirement[];
}

// Required Document Item Component
interface RequirementItemProps {
  requirement: Requirement;
  onUpload: (id: string) => void;
}

const RequirementItem: React.FC<RequirementItemProps> = ({
  requirement,
  onUpload,
}) => {
  const getStatusIcon = () => {
    switch (requirement.status) {
      case "approved":
        return <CheckIcon />;
      case "pending":
        return <WarningIcon />;
      case "missing":
        return <XIcon />;
      default:
        return <XIcon />;
    }
  };

  const getStatusText = () => {
    switch (requirement.status) {
      case "approved":
        return "Verified";
      case "pending":
        return "Under review";
      case "missing":
        return "Required";
      default:
        return "Required";
    }
  };

  const getStatusColor = () => {
    switch (requirement.status) {
      case "approved":
        return "#4CAF50";
      case "pending":
        return "#FFC107";
      case "missing":
        return "#F44336";
      default:
        return "#F44336";
    }
  };

  return (
    <View style={styles.requirementItem}>
      <View style={styles.requirementIconContainer}>{requirement.icon}</View>
      <View style={styles.requirementContent}>
        <Text style={styles.requirementName}>{requirement.name}</Text>
        <Text style={styles.requirementDescription}>
          {requirement.description}
        </Text>
        <View style={styles.statusContainer}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {requirement.status !== "approved" && (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => onUpload(requirement.id)}
        >
          <CameraIcon />
        </TouchableOpacity>
      )}
    </View>
  );
};

const RequirementsScreen: React.FC = () => {
  const [activeRoleId, setActiveRoleId] = useState<string>("driver");

  // Sample data for roles and requirements
  const roles: RoleRequirements[] = [
    {
      id: "driver",
      name: "Taxi Driver",
      icon: <CarIcon />,
      description: "Requirements for driving with Damu",
      requirements: [
        {
          id: "driver_license",
          name: "Driver's License",
          description:
            "Valid driver's license with at least 1 year of experience",
          status: "approved",
          icon: <LicenseIcon />,
        },
        {
          id: "id_card",
          name: "ID Card / Passport",
          description: "Government-issued identification document",
          status: "approved",
          icon: <IdCardIcon />,
        },
        {
          id: "vehicle_registration",
          name: "Vehicle Registration",
          description: "Vehicle registration in your name",
          status: "pending",
          icon: <DocumentIcon />,
        },
        {
          id: "insurance",
          name: "Vehicle Insurance",
          description: "Valid insurance policy for commercial use",
          status: "missing",
          icon: <DocumentIcon />,
        },
      ],
    },
    {
      id: "courier",
      name: "Delivery Courier",
      icon: <DeliveryIcon />,
      description: "Requirements for delivering with Damu",
      requirements: [
        {
          id: "id_card_courier",
          name: "ID Card / Passport",
          description: "Government-issued identification document",
          status: "approved",
          icon: <IdCardIcon />,
        },
        {
          id: "delivery_vehicle",
          name: "Vehicle Information",
          description: "Details of the vehicle you'll use for deliveries",
          status: "missing",
          icon: <DocumentIcon />,
        },
        {
          id: "insurance_courier",
          name: "Insurance",
          description: "Valid insurance for delivery services",
          status: "missing",
          icon: <DocumentIcon />,
        },
      ],
    },
    {
      id: "customer",
      name: "Customer",
      icon: <CustomerIcon />,
      description: "Basic verification for using Damu services",
      requirements: [
        {
          id: "id_card_customer",
          name: "ID Card / Passport",
          description: "Government-issued identification document",
          status: "approved",
          icon: <IdCardIcon />,
        },
      ],
    },
  ];

  const handleBackPress = () => {
    router.push("/profile-information-views/WorkInDamuScreen");
  };

  const handleRoleSelect = (roleId: string) => {
    setActiveRoleId(roleId);
  };

  const handleUploadDocument = (requirementId: string) => {
    // In a real app, this would open the camera or file picker
    console.log(`Upload for requirement: ${requirementId}`);
  };

  // Find the active role
  const activeRole = roles.find((role) => role.id === activeRoleId);

  // Calculate completion percentage
  const getCompletionPercentage = (requirements: Requirement[]) => {
    if (requirements.length === 0) return 100;
    const approvedCount = requirements.filter(
      (req) => req.status === "approved"
    ).length;
    return Math.round((approvedCount / requirements.length) * 100);
  };

  const completionPercentage = activeRole
    ? getCompletionPercentage(activeRole.requirements)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Requirements</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Role Selection */}
      <View style={styles.roleTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roleTabsScrollContent}
        >
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleTab,
                activeRoleId === role.id && styles.activeRoleTab,
              ]}
              onPress={() => handleRoleSelect(role.id)}
            >
              <View
                style={[
                  styles.roleIconContainer,
                  activeRoleId === role.id && styles.activeRoleIconContainer,
                ]}
              >
                {role.icon}
              </View>
              <Text
                style={[
                  styles.roleTabText,
                  activeRoleId === role.id && styles.activeRoleTabText,
                ]}
              >
                {role.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {activeRole && (
          <>
            {/* Role Information & Progress */}
            <View style={styles.roleInfoContainer}>
              <View style={styles.roleInfoHeader}>
                <Text style={styles.roleInfoTitle}>
                  {activeRole.name} Requirements
                </Text>
                <Text style={styles.roleInfoDescription}>
                  {activeRole.description}
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${completionPercentage}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {completionPercentage}% Complete
                </Text>
              </View>
            </View>

            {/* Requirements List */}
            <View style={styles.requirementsContainer}>
              {activeRole.requirements.map((requirement) => (
                <RequirementItem
                  key={requirement.id}
                  requirement={requirement}
                  onUpload={handleUploadDocument}
                />
              ))}
            </View>

            {/* Submit for review button - Only show if not all approved */}
            {completionPercentage < 100 && (
              <TouchableOpacity style={styles.submitButton}>
                <Text style={styles.submitButtonText}>Submit for Review</Text>
              </TouchableOpacity>
            )}

            {/* Help section */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>
                If you're having trouble with document verification or have
                questions about requirements, our support team is here to help.
              </Text>
              <TouchableOpacity style={styles.contactButton}>
                <Text style={styles.contactButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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
  headerRight: {
    width: 40,
  },
  roleTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  roleTabsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  roleTab: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 80,
  },
  activeRoleTab: {},
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  activeRoleIconContainer: {
    backgroundColor: "#E8F5E9",
  },
  roleTabText: {
    fontSize: 14,
    color: "#777",
  },
  activeRoleTabText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  roleInfoContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  roleInfoHeader: {
    marginBottom: 16,
  },
  roleInfoTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  roleInfoDescription: {
    fontSize: 14,
    color: "#666",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  requirementsContainer: {
    padding: 16,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
  },
  requirementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  requirementContent: {
    flex: 1,
  },
  requirementName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  requirementDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 6,
  },
  uploadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  helpContainer: {
    padding: 16,
    backgroundColor: "#F9F9F9",
    margin: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButton: {
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  contactButtonText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default RequirementsScreen;
