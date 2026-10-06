import { Stack } from "expo-router";

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#05070c",
        },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
