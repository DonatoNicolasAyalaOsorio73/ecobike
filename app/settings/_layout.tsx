import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="admin/index" />
      <Stack.Screen name="admin/store" />
      <Stack.Screen name="admin/user" />
      <Stack.Screen name="help" />
      <Stack.Screen name="maintenance" />
    </Stack>
  );
}
