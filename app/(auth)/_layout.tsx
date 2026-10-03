import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    // Cross-fade: every auth screen shares the same backdrop and logo spot, so
    // a fade reads as one place changing content rather than separate pages.
    <Stack screenOptions={{ headerShown: false, animation: "fade", animationDuration: 260 }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
