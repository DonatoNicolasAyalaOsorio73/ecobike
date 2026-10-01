import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore } from "@/stores/localProfileStore";
import { useTheme } from "@/theme/useTheme";
import BiometricLockScreen from "@/components/BiometricLockScreen";
import WebAppShell from "@/components/WebAppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import OfflineBanner from "@/components/ui/OfflineBanner";
import ToastHost from "@/components/ui/ToastHost";
import Logo from "@/components/ui/Logo";
import { initDb } from "@/services/db";
import { syncPendingRides } from "@/services/rides.service";
import NetInfo from "@react-native-community/netinfo";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { colors } = useTheme();
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const biometricUnlockEnabled = useSettingsStore((s) => s.biometricUnlockEnabled);
  const status = useAuthStore((s) => s.status);
  const init = useAuthStore((s) => s.init);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDb();
    hydrate();
    useLocalProfileStore.getState().hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated) init(biometricUnlockEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // A ride finishing offline (or mid network hiccup) leaves itself flagged
  // unsynced in local storage (rideStore.ts) — this is the other half of
  // that best-effort sync: retry once connectivity actually comes back,
  // instead of leaving it unsynced forever with no later trigger.
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const uid = useAuthStore.getState().firebaseUser?.uid;
      // Same conservative signal as useNetworkStatus — a retry that fails
      // because we were wrong about connectivity costs nothing (it stays
      // flagged unsynced), but never retrying does.
      if (uid && state.isConnected !== false) {
        syncPendingRides(uid).catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (hydrated && status !== "loading") {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hydrated, status]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgTop }}>
        <BackgroundBlobs />
        <Logo size="large" />
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 28 }} />
      </View>
    );
  }

  if (status === "locked") {
    return (
      <WebAppShell>
        <BiometricLockScreen />
      </WebAppShell>
    );
  }

  return (
    <ErrorBoundary>
      {/* Required for react-native-gesture-handler's recognizers (swipe
          actions, sheet drags) to receive touches at all. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <WebAppShell>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
              <Stack.Screen name="index" />
              <Stack.Protected guard={status === "signedOut"}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Protected guard={status === "signedIn"}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="ride/[id]" options={{ presentation: "card" }} />
                <Stack.Screen name="history" options={{ presentation: "card" }} />
                <Stack.Screen name="points/my-codes" options={{ presentation: "card" }} />
                <Stack.Screen name="settings" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              </Stack.Protected>
              <Stack.Screen name="+not-found" />
            </Stack>
            <OfflineBanner />
            <ToastHost />
          </SafeAreaProvider>
        </WebAppShell>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
