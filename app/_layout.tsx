import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ReduceMotion, ReducedMotionConfig } from "react-native-reanimated";
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
import { useLayout } from "@/hooks/useLayout";
import { pullRemoteRides, syncPendingRides } from "@/services/rides.service";
import { disablePush, enablePush, listenForPushTaps } from "@/services/push";
import { setWeeklyReminder } from "@/services/reminders";
import { withMonitoring } from "@/services/monitoring";
// Side effect: registers the background location task at startup.
import "@/stores/rideStore";
import { onConnectivityChange } from "@/services/connectivity";

// Haptics on web map to navigator.vibrate, which browsers block (and log an
// error) until the user has interacted with the page. Skip it until then.
if (Platform.OS === "web" && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
  const vibrate = navigator.vibrate.bind(navigator);
  navigator.vibrate = ((pattern: VibratePattern) => ((navigator as any).userActivation?.hasBeenActive === false ? false : vibrate(pattern))) as Navigator["vibrate"];
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default withMonitoring(RootLayout);

function RootLayout() {
  const { colors } = useTheme();
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const biometricUnlockEnabled = useSettingsStore((s) => s.biometricUnlockEnabled);
  const status = useAuthStore((s) => s.status);
  const init = useAuthStore((s) => s.init);
  const [ready, setReady] = useState(false);
  const { desktop } = useLayout();

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
  // Push unsynced rides, then pull rides recorded on other devices.
  // ponytail: re-reads all ride summaries each time; add a since-timestamp
  // query if users accumulate thousands of rides.
  const syncRides = (uid: string) =>
    syncPendingRides(uid)
      .then((n) => (n > 0 ? useAuthStore.getState().refreshProfile() : undefined))
      .then(() => pullRemoteRides(uid))
      .catch(() => {});

  const signedInUid = useAuthStore((s) => s.firebaseUser?.uid);
  useEffect(() => {
    if (signedInUid) syncRides(signedInUid);
  }, [signedInUid]);

  const weeklyReminder = useSettingsStore((s) => s.weeklyReminder);
  useEffect(() => {
    if (hydrated) setWeeklyReminder(weeklyReminder).catch(() => {});
  }, [hydrated, weeklyReminder]);

  // Tapping a push opens its screen (chat, friend requests) once signed in.
  useEffect(() => {
    if (!signedInUid) return;
    return listenForPushTaps((path) => router.push(path as any));
  }, [signedInUid]);

  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  useEffect(() => {
    if (!signedInUid || !hydrated) return;
    (notificationsEnabled ? enablePush(signedInUid) : disablePush(signedInUid)).catch(() => {});
  }, [signedInUid, notificationsEnabled, hydrated]);

  useEffect(() => {
    return onConnectivityChange((connected) => {
      const uid = useAuthStore.getState().firebaseUser?.uid;
      // Same conservative signal as useNetworkStatus — a retry that fails
      // because we were wrong about connectivity costs nothing (it stays
      // flagged unsynced), but never retrying does.
      if (uid && connected) syncRides(uid);
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
        <Logo size="large" animateIn={false} />
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 28 }} />
      </View>
    );
  }

  if (status === "locked") {
    return (
      <SafeAreaProvider>
        <WebAppShell>
          <BiometricLockScreen />
        </WebAppShell>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      {/* Required for react-native-gesture-handler's recognizers (swipe
          actions, sheet drags) to receive touches at all. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* SafeAreaProvider outside the shell: on desktop web the shell
            overrides insets with the iPhone frame's (island + home bar). */}
        <SafeAreaProvider>
          <WebAppShell>
            <StatusBar style="dark" />
            {/* Honor the OS "reduce motion" accessibility setting app-wide. */}
            <ReducedMotionConfig mode={ReduceMotion.System} />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                // Desktop: detail screens read as a centered column, not a stretched phone screen.
                contentStyle: desktop ? { width: "100%", maxWidth: 760, alignSelf: "center" } : undefined,
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Protected guard={status === "signedOut"}>
                <Stack.Screen name="(auth)" options={{ contentStyle: undefined }} />
              </Stack.Protected>
              <Stack.Protected guard={status === "signedIn"}>
                <Stack.Screen name="(tabs)" options={{ contentStyle: undefined }} />
                <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
                <Stack.Screen name="ride/[id]" options={{ presentation: "card" }} />
                <Stack.Screen name="history" options={{ presentation: "card" }} />
                <Stack.Screen name="points/my-codes" options={{ presentation: "card" }} />
                <Stack.Screen name="chat/[uid]" options={{ presentation: "card" }} />
                <Stack.Screen name="friend/[uid]" options={{ presentation: "card" }} />
                <Stack.Screen name="settings" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              </Stack.Protected>
              <Stack.Screen name="legal/[doc]" options={{ presentation: "card" }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <OfflineBanner />
            <ToastHost />
          </WebAppShell>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
