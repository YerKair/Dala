import { Stack } from "expo-router";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
        animation: "slide_from_bottom",
        navigationBarHidden: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="CartPage" options={{ gestureEnabled: true }} />
      <Stack.Screen name="CheckoutPage" options={{ gestureEnabled: true }} />
      <Stack.Screen
        name="DeliveryTrackingPage"
        options={{ gestureEnabled: true }}
      />
    </Stack>
  );
}
