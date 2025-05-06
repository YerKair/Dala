// File: app/(root)/work-in-damu.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../auth/AuthContext";
import { updateUserRole } from "../auth/apiService";
import { tripManager } from "../store/globalState";

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

// Money Icon
const MoneyIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9z" />
    <Path d="M12 7v10m4-8c0 1.7-1.3 3-3 3h-2c-1.7 0-3-1.3-3-3" />
  </Svg>
);

// Info Icon
const InfoIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <Path d="M12 16v-4m0-4h.01" />
  </Svg>
);

// Taxi Requests Icon
const TaxiRequestsIcon = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#555"
    strokeWidth={1.5}
  >
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
    <Path d="M9 12h6m-6 4h6" />
  </Svg>
);

// Chevron Right Icon
const ChevronRight = () => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#999"
    strokeWidth={1.5}
  >
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

// Interface for role types
interface Role {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
}

// Interface for role item props
interface RoleItemProps {
  role: Role;
  isActive: boolean;
  onToggle: (id: string, value: boolean) => void;
  onPress?: () => void;
}

// Role Item Component
const RoleItem: React.FC<RoleItemProps> = ({
  role,
  isActive,
  onToggle,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.roleItem} onPress={onPress}>
      <View style={styles.roleIconContainer}>{role.icon}</View>
      <View style={styles.roleContent}>
        <Text style={styles.roleTitle}>{role.name}</Text>
        <Text style={styles.roleSubtitle}>{role.description}</Text>
      </View>
      <Switch
        trackColor={{ false: "#E0E0E0", true: "#4CAF50" }}
        thumbColor={isActive ? "#FFFFFF" : "#FFFFFF"}
        ios_backgroundColor="#E0E0E0"
        onValueChange={(value) => onToggle(role.id, value)}
        value={isActive}
      />
    </TouchableOpacity>
  );
};

// Interface for menu item props
interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

// Menu Item Component
const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight />
    </TouchableOpacity>
  );
};

const WorkInDamuScreen: React.FC = () => {
  const { user, token, updateUserRole } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // State for role management
  const [roles, setRoles] = useState<Role[]>([
    {
      id: "customer",
      name: "Customer",
      description: "Regular user of Damu services",
      icon: <CustomerIcon />,
      active: true,
    },
    {
      id: "driver",
      name: "Taxi Driver",
      description: "Drive and earn with Damu",
      icon: <CarIcon />,
      active: false,
    },
    {
      id: "courier",
      name: "Delivery Courier",
      description: "Deliver goods and earn",
      icon: <DeliveryIcon />,
      active: false,
    },
  ]);

  // Set initial role states based on user.role
  useEffect(() => {
    if (user && user.role) {
      const userRoles = user.role.split(",");

      setRoles((prevRoles) =>
        prevRoles.map((role) => ({
          ...role,
          active: userRoles.includes(role.id),
        }))
      );
    }
  }, [user]);

  const handleBackPress = () => {
    router.push("/profile-information-views/profile");
  };

  // Handle role toggle
  const handleRoleToggle = (roleId: string, value: boolean) => {
    // If turning off the last active role, prevent it
    if (
      !value &&
      roles.filter((r) => r.active).length === 1 &&
      roles.find((r) => r.id === roleId)?.active
    ) {
      Alert.alert(
        "Cannot Deactivate",
        "You must have at least one active role.",
        [{ text: "OK" }]
      );
      return;
    }

    setRoles(
      roles.map((role) =>
        role.id === roleId ? { ...role, active: value } : role
      )
    );
  };

  // Save user roles to the server
  const saveRoles = async () => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "You must be logged in to update roles."
      );
      return;
    }

    setIsUpdating(true);
    try {
      const activeRoles = roles
        .filter((r) => r.active)
        .map((r) => r.id)
        .join(",");

      // Don't use useAuth() inside a function - use the already destructured value
      const success = await updateUserRole(activeRoles);

      if (success) {
        Alert.alert(
          "Roles Updated",
          "Your role settings have been updated successfully"
        );

        // If driver role is active, show taxi driver specific message
        if (roles.find((r) => r.id === "driver" && r.active)) {
          Alert.alert(
            "Taxi Role Enabled",
            "You can now access the taxi driver dashboard and accept ride requests.",
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert(
          "Update Failed",
          "Failed to update roles. Please try again later."
        );
      }
    } catch (error) {
      console.error("Error updating roles:", error);
      Alert.alert(
        "Error",
        "An unexpected error occurred. Please try again later."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Navigate to job requirements screen
  const navigateToRequirements = () => {
    router.push("/profile-information-views/work-screens/RequirementsScreen");
  };

  // Navigate to taxi requests screen
  const navigateToTaxiRequests = () => {
    if (roles.find((r) => r.id === "driver" && r.active)) {
      // Create a temporary placeholder image before navigating
      router.push("/(tabs)/taxi-service/taxi");
    } else {
      Alert.alert(
        "Unauthorized",
        "You need to activate the Taxi Driver role to access this feature."
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work in Damu</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User profile section */}
        <View style={styles.profileContainer}>
          <Image
            source={{ uri: "https://randomuser.me/api/portraits/women/44.jpg" }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>{user ? user.name : "User"}</Text>
          <Text style={styles.profileStatus}>
            {roles.filter((r) => r.active).length > 1
              ? "Multiple roles"
              : roles.find((r) => r.active)?.name || "No active role"}
          </Text>
        </View>

        {/* Roles section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Your Roles</Text>
          <Text style={styles.sectionDescription}>
            Manage your roles in Damu platform
          </Text>

          <View style={styles.rolesContainer}>
            {roles.map((role) => (
              <RoleItem
                key={role.id}
                role={role}
                isActive={role.active}
                onToggle={handleRoleToggle}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.applyButton,
              isUpdating && { backgroundColor: "#A5D6A7" },
            ]}
            onPress={saveRoles}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.applyButtonText}>Apply Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Work Options */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Work Options</Text>
          <Text style={styles.sectionDescription}>
            Manage your work preferences and see statistics
          </Text>

          <MenuItem
            icon={<InfoIcon />}
            title="Job Requirements"
            subtitle="Documents and requirements for each role"
            onPress={navigateToRequirements}
          />

          {/* Show Taxi Requests menu item only if driver role is active */}
          {roles.find((r) => r.id === "driver" && r.active) && (
            <MenuItem
              icon={<TaxiRequestsIcon />}
              title="Taxi Requests"
              subtitle="View and accept ride requests"
              onPress={navigateToTaxiRequests}
            />
          )}
        </View>
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
  scrollView: {
    flex: 1,
  },
  profileContainer: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "500",
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  rolesContainer: {
    marginTop: 8,
  },
  roleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  roleIconContainer: {
    width: 40,
    alignItems: "center",
    marginRight: 16,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  roleSubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  applyButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuIconContainer: {
    width: 40,
    alignItems: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuSubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
});

export default WorkInDamuScreen;
