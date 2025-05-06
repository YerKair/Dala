import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { taxiRequestsManager } from "../store/globalState";

interface SonarAnimationProps {
  requestId?: string;
  onDriverFound?: () => void;
  isSearching?: boolean;
  searchTimeSeconds?: number;
  driverId?: string | null;
  maxDiameter?: number;
  minDiameter?: number;
  initialDiameter?: number;
  pulseCount?: number;
  animationDelay?: number;
  backgroundColor?: string;
  pulseMode?: boolean;
}

const SonarAnimation: React.FC<SonarAnimationProps> = ({
  requestId,
  onDriverFound,
  isSearching: isSearchingProp,
  searchTimeSeconds: searchTimeSecondsProp,
  driverId,
  maxDiameter,
  minDiameter,
  initialDiameter,
  pulseCount,
  animationDelay,
  backgroundColor,
  pulseMode,
}) => {
  // Use props if provided, otherwise use internal state
  const [isSearchingState, setIsSearchingState] = useState(true);
  const [searchTimeSecondsState, setSearchTimeSecondsState] = useState(0);

  // Determine whether to use props or state
  const isSearching =
    isSearchingProp !== undefined ? isSearchingProp : isSearchingState;
  const searchTimeSeconds =
    searchTimeSecondsProp !== undefined
      ? searchTimeSecondsProp
      : searchTimeSecondsState;

  // Refs for the animated values
  const circle1 = useRef(new Animated.Value(0)).current;
  const circle2 = useRef(new Animated.Value(0)).current;
  const circle3 = useRef(new Animated.Value(0)).current;

  // Create refs for intervals so we can clear them later
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRunningRef = useRef<boolean>(true);

  // Function to check order status
  const checkOrderStatus = async () => {
    // Проверяем, найден ли водитель по prop driverId
    if (driverId && driverId !== "pending_driver") {
      // Водитель нашелся - останавливаем анимацию
      setIsSearchingState(false);
      animationRunningRef.current = false;
      if (onDriverFound) {
        onDriverFound();
      }
      return;
    }

    // Если requestId не указан, просто возвращаемся
    if (!requestId) return;

    try {
      const request = await taxiRequestsManager.getRequestById(requestId);

      if (request) {
        // If driver has been found (accepted status), stop the animation
        if (request.status === "accepted") {
          setIsSearchingState(false);
          animationRunningRef.current = false;
          if (onDriverFound) {
            onDriverFound();
          }
        } else if (request.status === "cancelled") {
          setIsSearchingState(false);
          animationRunningRef.current = false;
        } else if (
          request.status === "searching" ||
          request.status === "pending"
        ) {
          // Continue animation if we're still searching
          setIsSearchingState(true);
          animationRunningRef.current = true;
        }
      }
    } catch (error) {
      console.error("Error checking order status:", error);
    }
  };

  // Effect to set up the status checking interval
  useEffect(() => {
    // Check immediately on mount
    checkOrderStatus();

    // Then set interval to check every 1 second for faster response
    statusIntervalRef.current = setInterval(checkOrderStatus, 1000);

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, [requestId, driverId]);

  // Effect to keep track of search time - only if we're managing our own state
  useEffect(() => {
    // Only use this effect if we're not provided with searchTimeSeconds from props
    if (isSearching && searchTimeSecondsProp === undefined) {
      timeIntervalRef.current = setInterval(() => {
        setSearchTimeSecondsState((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [isSearching, searchTimeSecondsProp]);

  // Animation sequence for the circles
  const animateCircle = (animated: Animated.Value) => {
    if (!animationRunningRef.current) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(animated, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(animated, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start(({ finished }) => {
      // Only restart animation if we're still searching
      if (animationRunningRef.current && finished) {
        animateCircle(animated);
      }
    });
  };

  // Start animations
  useEffect(() => {
    if (isSearching) {
      animationRunningRef.current = true;

      // Staggered start of animations
      animateCircle(circle1);

      const timer1 = setTimeout(() => {
        if (animationRunningRef.current) {
          animateCircle(circle2);
        }
      }, 666);

      const timer2 = setTimeout(() => {
        if (animationRunningRef.current) {
          animateCircle(circle3);
        }
      }, 1333);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);

        // Flag to stop animations
        animationRunningRef.current = false;
      };
    }
  }, [isSearching]);

  // Format search time
  const formatSearchTime = () => {
    const minutes = Math.floor(searchTimeSeconds / 60);
    const seconds = searchTimeSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Interpolate circle scales
  const circle1Scale = circle1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const circle2Scale = circle2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const circle3Scale = circle3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  // Interpolate circle opacities
  const circle1Opacity = circle1.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.8, 0.3, 0],
  });

  const circle2Opacity = circle2.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.8, 0.3, 0],
  });

  const circle3Opacity = circle3.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.8, 0.3, 0],
  });

  return (
    <View style={styles.container}>
      {isSearching ? (
        <>
          <View style={styles.circlesContainer}>
            <Animated.View
              style={[
                styles.circle,
                {
                  transform: [{ scale: circle1Scale }],
                  opacity: circle1Opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.circle,
                {
                  transform: [{ scale: circle2Scale }],
                  opacity: circle2Opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.circle,
                {
                  transform: [{ scale: circle3Scale }],
                  opacity: circle3Opacity,
                },
              ]}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.searchingText}>Ищем водителя</Text>
            <Text style={styles.timeText}>{formatSearchTime()}</Text>
          </View>
        </>
      ) : (
        <View style={styles.textContainer}>
          <Text style={styles.searchingText}>Поиск завершен</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  circlesContainer: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  circle: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#3498db",
  },
  textContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  searchingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  timeText: {
    fontSize: 16,
    color: "#666",
  },
});

export default SonarAnimation;
