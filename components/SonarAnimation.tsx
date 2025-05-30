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

  // Effect to handle the timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isSearching) {
      // Reset timer when search starts
      setSearchTimeSecondsState(0);

      // Start the timer
      interval = setInterval(() => {
        setSearchTimeSecondsState((prev) => prev + 1);
      }, 1000);
    } else {
      // Reset timer when search stops
      setSearchTimeSecondsState(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isSearching]);

  // Use internal timer state
  const displayTime = searchTimeSecondsState;

  // Format search time
  const formatSearchTime = () => {
    const minutes = Math.floor(displayTime / 60);
    const seconds = displayTime % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Refs for the animated values
  const circle1 = useRef(new Animated.Value(0)).current;
  const circle2 = useRef(new Animated.Value(0)).current;
  const circle3 = useRef(new Animated.Value(0)).current;

  // Create refs for intervals so we can clear them later
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
          <View style={styles.contentContainer}>
            <FontAwesome name="car" size={24} color="#4A5D23" />
            <Text style={styles.searchingText}>Searching for driver...</Text>
            <Text style={styles.timerText}>{formatSearchTime()}</Text>
          </View>
        </>
      ) : (
        <View style={styles.contentContainer}>
          <FontAwesome name="check-circle" size={24} color="#4A5D23" />
          <Text style={styles.searchingText}>Driver found!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  circlesContainer: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4A5D23",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  searchingText: {
    fontSize: 16,
    color: "#333",
    marginTop: 10,
    marginBottom: 5,
  },
  timerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4A5D23",
    marginTop: 5,
  },
});

export default SonarAnimation;
