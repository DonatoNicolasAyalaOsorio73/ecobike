import React from "react";
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import LiquidTabBar from "@/components/ui/LiquidTabBar";

export default function TabsLayout() {
  // Signed-in accounts personalize their goals once (Duolingo-style onboarding).
  const isGuest = useAuthStore((s) => s.isGuest);
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  if (!isGuest && !onboardingDone) return <Redirect href="/onboarding" />;

  return (
    <Tabs initialRouteName="map" tabBar={(props) => <LiquidTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="map" options={{ title: "Mapa" }} />
      <Tabs.Screen name="points" options={{ title: "Puntos" }} />
      <Tabs.Screen name="friends" options={{ title: "Amigos" }} />
      <Tabs.Screen name="stats" options={{ title: "Progreso" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
