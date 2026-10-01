import React from "react";
import { Tabs } from "expo-router";
import LiquidTabBar from "@/components/ui/LiquidTabBar";

export default function TabsLayout() {
  return (
    <Tabs initialRouteName="map" tabBar={(props) => <LiquidTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="map" options={{ title: "Mapa" }} />
      <Tabs.Screen name="points" options={{ title: "Puntos" }} />
      <Tabs.Screen name="friends" options={{ title: "Amigos" }} />
      <Tabs.Screen name="stats" options={{ title: "Estadísticas" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
