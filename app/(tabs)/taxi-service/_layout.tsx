import { Stack } from "expo-router";

export default function TaxiServiceLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="taxi"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="trip"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
