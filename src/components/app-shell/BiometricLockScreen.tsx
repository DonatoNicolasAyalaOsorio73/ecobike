import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/theme/useTheme";
import { useBiometricSupport } from "@/hooks/useBiometricUnlock";
import { useAuthStore } from "@/stores/authStore";
import GlassButton from "@/components/ui/GlassButton";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import Logo from "@/components/ui/Logo";

/**
 * Local re-unlock gate for an already-authenticated Firebase session. If the
 * device has no biometric hardware/enrollment, it falls back to unlocking
 * automatically rather than trapping the user behind a control they can't
 * satisfy (Face ID is a convenience layer, never the actual identity check —
 * rule 6).
 */
export default function BiometricLockScreen() {
  const { colors } = useTheme();
  const { kind, enrolled, authenticate } = useBiometricSupport();
  const confirmUnlock = useAuthStore((s) => s.confirmBiometricUnlock);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  const promptLabel = kind === "face" ? "Face ID" : kind === "fingerprint" ? "huella digital" : "biometría";

  const tryUnlock = async () => {
    if (!enrolled) {
      confirmUnlock();
      return;
    }
    setChecking(true);
    setFailed(false);
    const ok = await authenticate(`Desbloquea EcoBike con ${promptLabel}`);
    setChecking(false);
    if (ok) confirmUnlock();
    else setFailed(true);
  };

  useEffect(() => {
    tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.screen}>
        <BackgroundBlobs />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Logo size="small" animateIn={false} />
            <Ionicons name="lock-closed" size={40} color={colors.primaryDark} style={{ marginVertical: 20 }} />
            <Text style={[styles.title, { color: colors.ink }]}>EcoBike está bloqueado</Text>
            {failed && (
              <Text style={[styles.subtitle, { color: colors.danger }]}>
                No se pudo verificar tu identidad. Inténtalo de nuevo.
              </Text>
            )}
            <GlassButton
              label={`Desbloquear con ${promptLabel}`}
              icon="finger-print-outline"
              onPress={tryUnlock}
              loading={checking}
              style={{ marginTop: 24, minWidth: 240 }}
            />
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 13.5, textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
});
