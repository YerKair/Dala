// File: app/profile-views/_layout.jsx
import React from "react";
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        // Remove any bottom tab navigator or tab bars
        presentation: "card",
      }}
    >
      <Stack.Screen name="profile" />
      <Stack.Screen name="profile-information" />
      <Stack.Screen name="order-history" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="change-number" />
      <Stack.Screen name="payment-methods" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="apply-promocode" />
    </Stack>
  );
}
