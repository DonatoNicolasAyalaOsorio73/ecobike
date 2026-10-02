import React from "react";
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import LiquidTabBar from "@/components/ui/LiquidTabBar";
import DesktopSidebar from "@/components/ui/DesktopSidebar";
import { useLayout } from "@/hooks/useLayout";

export default function TabsLayout() {
  // Signed-in accounts personalize their goals once (Duolingo-style onboarding).
  const isGuest = useAuthStore((s) => s.isGuest);
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  const { desktop } = useLayout();
  if (!isGuest && !onboardingDone) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      initialRouteName="home"
      // Profile opens from the avatar on phones; "back" returns to the tab you came from.
      backBehavior="history"
      tabBar={(props) => (desktop ? <DesktopSidebar {...props} /> : <LiquidTabBar {...props} />)}
      screenOptions={{
        headerShown: false,
        tabBarPosition: desktop ? "left" : "bottom",
        // Cross-fade between tabs: no hard cut, no white flash.
        animation: "fade",
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Inicio" }} />
      <Tabs.Screen name="map" options={{ title: "Mapa" }} />
      <Tabs.Screen name="stats" options={{ title: "Progreso" }} />
      <Tabs.Screen name="points" options={{ title: "Premios" }} />
      <Tabs.Screen name="friends" options={{ title: "Amigos" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
