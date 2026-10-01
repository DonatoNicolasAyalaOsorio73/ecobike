import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import BackButton from "@/components/ui/BackButton";
import { SettingsChoiceRow, SettingsNavRow, SettingsStepperRow, SettingsSwitchRow } from "@/components/ui/SettingsRow";
import { useTheme } from "@/theme/useTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useBiometricSupport } from "@/hooks/useBiometricUnlock";
import { sendPasswordReset } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";

export default function SettingsScreen() {
  const { colors } = useTheme();
  const settings = useSettingsStore();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { supported: biometricSupported, enrolled: biometricEnrolled, kind } = useBiometricSupport();
  const [resetSent, setResetSent] = useState(false);

  const biometricLabel = kind === "face" ? "Face ID" : kind === "fingerprint" ? "Huella digital" : "Biometría";

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.header, { color: colors.ink }]}>Ajustes</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SectionLabel text="Apariencia" />
          <GlassCard>
            <SettingsChoiceRow
              icon="contrast-outline"
              label="Tema"
              value={settings.appearance}
              onChange={(v) => settings.update({ appearance: v })}
              options={[
                { label: "Sistema", value: "system" },
                { label: "Claro", value: "light" },
                { label: "Oscuro", value: "dark" },
              ]}
            />
          </GlassCard>

          <SectionLabel text="Unidades" />
          <GlassCard>
            <SettingsChoiceRow
              icon="speedometer-outline"
              label="Unidades"
              value={settings.units}
              onChange={(v) => settings.update({ units: v })}
              options={[
                { label: "Métrico (km)", value: "metric" },
                { label: "Imperial (mi)", value: "imperial" },
              ]}
            />
          </GlassCard>

          <SectionLabel text="Objetivos" />
          <GlassCard>
            <SettingsStepperRow
              icon="flag-outline"
              label="Meta semanal"
              sublabel="Distancia objetivo cada semana"
              value={settings.weeklyGoalKm}
              onChange={(v) => settings.update({ weeklyGoalKm: v })}
              step={5}
              min={5}
              max={500}
              format={(v) => `${v} km`}
            />
          </GlassCard>

          <SectionLabel text="Seguridad" />
          <GlassCard>
            <SettingsSwitchRow
              icon="finger-print-outline"
              label={`Desbloquear con ${biometricLabel}`}
              sublabel={!biometricSupported ? "Tu dispositivo no tiene biometría disponible" : !biometricEnrolled ? "Configura biometría en Ajustes del sistema" : undefined}
              value={settings.biometricUnlockEnabled}
              onValueChange={(v) => settings.update({ biometricUnlockEnabled: v })}
            />
            {profile?.email && (
              <>
                <Divider />
                <SettingsNavRow
                  icon="key-outline"
                  label="Cambiar contraseña"
                  sublabel={resetSent ? "Enlace enviado a tu correo" : undefined}
                  onPress={async () => {
                    await sendPasswordReset(profile.email!);
                    setResetSent(true);
                  }}
                />
              </>
            )}
          </GlassCard>

          <SectionLabel text="Privacidad" />
          <GlassCard>
            <SettingsSwitchRow
              icon="people-outline"
              label="Compartir estadísticas con amigos"
              value={settings.shareStatsWithFriends}
              onValueChange={(v) => settings.update({ shareStatsWithFriends: v })}
            />
            <Divider />
            <SettingsSwitchRow
              icon="location-outline"
              label="Compartir ubicación en vivo durante recorridos"
              value={settings.shareLocationDuringRide}
              onValueChange={(v) => settings.update({ shareLocationDuringRide: v })}
            />
          </GlassCard>

          <SectionLabel text="Notificaciones" />
          <GlassCard>
            <SettingsSwitchRow
              icon="notifications-outline"
              label="Notificaciones push"
              value={settings.notificationsEnabled}
              onValueChange={(v) => settings.update({ notificationsEnabled: v })}
            />
          </GlassCard>

          <SectionLabel text="Cuenta" />
          <GlassCard>
            <SettingsNavRow icon="people-circle-outline" label="Amigos y solicitudes" onPress={() => router.push("/(tabs)/friends")} />
            {profile && (
              <>
                {profile.role === "admin" && (
                  <>
                    <Divider />
                    <SettingsNavRow icon="storefront-outline" label="Administrar tiendas" onPress={() => router.push("/settings/admin")} />
                  </>
                )}
                <Divider />
                <SettingsNavRow icon="log-out-outline" label="Cerrar sesión" onPress={signOut} />
                <Divider />
                <SettingsNavRow icon="trash-outline" label="Eliminar cuenta" danger onPress={() => router.push("/settings/delete-account")} />
              </>
            )}
          </GlassCard>

          {!isFirebaseConfigured && (
            <Text style={[styles.demoNotice, { color: colors.inkFaint }]}>
              Modo demo local — configura Firebase (ver ENVIRONMENT.md) para cuentas reales, sincronización y funciones sociales.
            </Text>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>{text.toUpperCase()}</Text>;
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 2 }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 4 },
  header: { fontSize: 17, fontWeight: "800" },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  sectionLabel: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 18 },
  demoNotice: { fontSize: 11.5, textAlign: "center", marginTop: 20, paddingHorizontal: 10, lineHeight: 16 },
});
