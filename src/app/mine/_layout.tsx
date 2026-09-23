import { Stack } from "expo-router";

export default function MineLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="receipt" />
    </Stack>
  );
}
