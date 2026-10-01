import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as Application from "expo-application";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import BackButton from "@/components/ui/BackButton";
import { SettingsChoiceRow, SettingsNavRow, SettingsStepperRow, SettingsSwitchRow } from "@/components/ui/SettingsRow";
import { useTheme } from "@/theme/useTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { useBiometricSupport } from "@/hooks/useBiometricUnlock";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { sendPasswordReset } from "@/services/auth.service";
import { exportMyData, getAccountPrefs, setNotificationPrefs, setSearchable, signOutEverywhere, type AccountPrefs } from "@/services/account.service";
import { resetLocalCache } from "@/services/rides.service";
import { resetDemoData } from "@/services/demo.service";
import { DEFAULT_NOTIF_PREFS } from "@/types/user";
import { DAILY_GOALS } from "@/utils/streak";

const PROVIDER_LABEL: Record<string, string> = { password: "Correo y contraseña", "google.com": "Google", "apple.com": "Apple" };

export default function SettingsScreen() {
  const { colors } = useTheme();
  const settings = useSettingsStore();
  const profile = useAuthStore((s) => s.profile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const isGuest = useAuthStore((s) => s.isGuest);
  const signOut = useAuthStore((s) => s.signOut);
  const toast = useToastStore((s) => s.show);
  const userId = useCurrentUserId();
  const { supported: biometricSupported, enrolled: biometricEnrolled, kind } = useBiometricSupport();
  const [resetSent, setResetSent] = useState(false);
  const [prefs, setPrefs] = useState<AccountPrefs | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmEverywhere, setConfirmEverywhere] = useState(false);

  const uid = firebaseUser?.uid;
  const biometricLabel = kind === "face" ? "Face ID" : kind === "fingerprint" ? "Huella digital" : "Biometría";
  const native = Platform.OS !== "web";

  useEffect(() => {
    if (uid) getAccountPrefs(uid).then(setPrefs).catch(() => setPrefs({ notif: DEFAULT_NOTIF_PREFS, searchable: true }));
  }, [uid]);

  // Optimistic update of a server-side preference, rolled back on failure.
  const savePrefs = async (next: AccountPrefs) => {
    if (!uid || !prefs) return;
    const prev = prefs;
    setPrefs(next);
    try {
      if (next.searchable !== prev.searchable) await setSearchable(uid, next.searchable);
      if (next.notif !== prev.notif) await setNotificationPrefs(uid, next.notif);
    } catch {
      setPrefs(prev);
      toast("No se pudo guardar. Revisa tu conexión.", "error");
    }
  };

  const task = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast(ok, "success");
    } catch (e: any) {
      toast(e?.message ?? "Algo salió mal.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.header, { color: colors.ink }]} accessibilityRole="header">
            Ajustes
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SectionLabel text="Unidades" />
          <GlassCard>
            <SettingsChoiceRow
              icon="speedometer-outline"
              label="Unidades"
              value={settings.units}
              onChange={(v) => settings.update({ units: v })}
              options={[
                { label: "Kilómetros", value: "metric" },
                { label: "Millas", value: "imperial" },
              ]}
            />
          </GlassCard>

          <SectionLabel text="Recorridos" />
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
            <Divider />
            <SettingsChoiceRow
              icon="flame-outline"
              label={`Meta diaria · ${DAILY_GOALS.find((g) => g.points === settings.dailyGoalPoints)?.label ?? "Personal"}`}
              value={String(settings.dailyGoalPoints)}
              onChange={(v) => settings.update({ dailyGoalPoints: Number(v) })}
              options={DAILY_GOALS.map((g) => ({ label: `${g.points} pts`, value: String(g.points) }))}
            />
            <Divider />
            <SettingsStepperRow
              icon="body-outline"
              label="Tu peso"
              sublabel="Para estimar calorías"
              value={settings.weightKg}
              onChange={(v) => settings.update({ weightKg: v })}
              step={1}
              min={30}
              max={200}
              format={(v) => `${v} kg`}
            />
            <Divider />
            <SettingsSwitchRow
              icon="pause-circle-outline"
              label="Pausa automática"
              sublabel="Pausa al detenerte y reanuda al moverte"
              value={settings.autoPause}
              onValueChange={(v) => settings.update({ autoPause: v })}
            />
            <Divider />
            <SettingsSwitchRow
              icon="sunny-outline"
              label="Pantalla encendida"
              sublabel="No se apaga mientras grabas"
              value={settings.keepScreenOn}
              onValueChange={(v) => settings.update({ keepScreenOn: v })}
            />
            <Divider />
            <SettingsChoiceRow
              icon="navigate-outline"
              label="GPS"
              value={settings.gpsAccuracy}
              onChange={(v) => settings.update({ gpsAccuracy: v })}
              options={[
                { label: "Alta precisión", value: "high" },
                { label: "Ahorro de batería", value: "balanced" },
              ]}
            />
          </GlassCard>

          <SectionLabel text="Notificaciones" />
          <GlassCard>
            <SettingsSwitchRow
              icon="notifications-outline"
              label="Notificaciones push"
              sublabel={native ? "En este dispositivo" : "Disponibles en la app del teléfono"}
              value={settings.notificationsEnabled}
              onValueChange={(v) => settings.update({ notificationsEnabled: v })}
            />
            {uid && prefs && (
              <>
                <Divider />
                <SettingsSwitchRow
                  icon="person-add-outline"
                  label="Solicitudes de amistad"
                  value={prefs.notif.friends}
                  onValueChange={(v) => savePrefs({ ...prefs, notif: { ...prefs.notif, friends: v } })}
                />
                <Divider />
                <SettingsSwitchRow
                  icon="chatbubble-outline"
                  label="Mensajes"
                  value={prefs.notif.messages}
                  onValueChange={(v) => savePrefs({ ...prefs, notif: { ...prefs.notif, messages: v } })}
                />
              </>
            )}
            {native && (
              <>
                <Divider />
                <SettingsSwitchRow
                  icon="calendar-outline"
                  label="Recordatorio semanal"
                  sublabel="Domingos 6:00 p. m., revisa tu meta"
                  value={settings.weeklyReminder}
                  onValueChange={(v) => settings.update({ weeklyReminder: v })}
                />
              </>
            )}
          </GlassCard>

          {uid && prefs && (
            <>
              <SectionLabel text="Privacidad" />
              <GlassCard>
                <SettingsSwitchRow
                  icon="search-outline"
                  label="Aparecer en búsquedas"
                  sublabel="Otros pueden encontrarte por tu usuario"
                  value={prefs.searchable}
                  onValueChange={(v) => savePrefs({ ...prefs, searchable: v })}
                />
              </GlassCard>
            </>
          )}

          <SectionLabel text="Seguridad" />
          <GlassCard>
            <SettingsSwitchRow
              icon="finger-print-outline"
              label={`Desbloquear con ${biometricLabel}`}
              sublabel={!biometricSupported ? "No disponible en este dispositivo" : !biometricEnrolled ? "Configúrala en los ajustes del sistema" : undefined}
              value={settings.biometricUnlockEnabled}
              onValueChange={(v) => settings.update({ biometricUnlockEnabled: v })}
            />
            {profile?.email && profile.providers.includes("password") && (
              <>
                <Divider />
                <SettingsNavRow
                  icon="key-outline"
                  label="Cambiar contraseña"
                  sublabel={resetSent ? "Te enviamos un enlace a tu correo" : undefined}
                  onPress={async () => {
                    await sendPasswordReset(profile.email!);
                    setResetSent(true);
                  }}
                />
              </>
            )}
            {uid && (
              <>
                <Divider />
                <SettingsNavRow
                  icon="phone-portrait-outline"
                  label={confirmEverywhere ? "Toca otra vez para confirmar" : "Cerrar sesión en todos los dispositivos"}
                  danger={confirmEverywhere}
                  sublabel={busy === "everywhere" ? "Cerrando sesiones…" : undefined}
                  onPress={() => {
                    if (!confirmEverywhere) return setConfirmEverywhere(true);
                    task("everywhere", async () => {
                      await signOutEverywhere();
                      await signOut();
                    }, "Cerraste sesión en todos tus dispositivos.");
                  }}
                />
              </>
            )}
          </GlassCard>

          {profile && (
            <>
              <SectionLabel text="Cuentas vinculadas" />
              <GlassCard>
                {profile.providers.map((p, i) => (
                  <View key={p}>
                    {i > 0 && <Divider />}
                    <SettingsNavRow icon="link-outline" label={PROVIDER_LABEL[p] ?? p} sublabel={p === "password" ? profile.email ?? undefined : undefined} onPress={() => {}} showChevron={false} />
                  </View>
                ))}
              </GlassCard>
            </>
          )}

          <SectionLabel text="Tus datos" />
          <GlassCard>
            {uid && (
              <>
                <SettingsNavRow
                  icon="download-outline"
                  label="Exportar mis datos"
                  sublabel={busy === "export" ? "Preparando archivo…" : "Archivo JSON con todo lo que guardamos"}
                  onPress={() => task("export", exportMyData, "Exportación lista.")}
                />
                <Divider />
                <SettingsNavRow
                  icon="refresh-outline"
                  label="Volver a sincronizar"
                  sublabel={busy === "cache" ? "Sincronizando…" : "Descarga de nuevo tu historial desde la nube"}
                  onPress={() => task("cache", () => resetLocalCache(uid), "Historial sincronizado.")}
                />
              </>
            )}
            {isGuest && userId && (
              <SettingsNavRow
                icon="refresh-outline"
                label="Restablecer datos de ejemplo"
                onPress={() => task("demo", async () => resetDemoData(userId), "Datos de ejemplo restablecidos.")}
              />
            )}
          </GlassCard>

          <SectionLabel text="Ayuda y legal" />
          <GlassCard>
            <SettingsNavRow icon="help-buoy-outline" label="Centro de ayuda" onPress={() => router.push("/settings/help")} />
            <Divider />
            <SettingsNavRow icon="shield-checkmark-outline" label="Política de privacidad" onPress={() => router.push("/legal/privacy")} />
            <Divider />
            <SettingsNavRow icon="document-text-outline" label="Términos de uso" onPress={() => router.push("/legal/terms")} />
          </GlassCard>

          <SectionLabel text="Cuenta" />
          <GlassCard>
            {profile && (profile.role === "admin" || profile.role === "partner") && (
              <>
                <SettingsNavRow
                  icon="storefront-outline"
                  label={profile.role === "admin" ? "Administración" : "Validar códigos"}
                  onPress={() => router.push("/settings/admin")}
                />
                <Divider />
              </>
            )}
            <SettingsNavRow icon="log-out-outline" label={isGuest ? "Salir del modo invitado" : "Cerrar sesión"} onPress={signOut} />
            {profile && (
              <>
                <Divider />
                <SettingsNavRow icon="trash-outline" label="Eliminar cuenta" danger onPress={() => router.push("/settings/delete-account")} />
              </>
            )}
          </GlassCard>

          <Text style={[styles.footer, { color: colors.inkFaint }]}>
            EcoBike {Constants.expoConfig?.version ?? ""}
            {Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ""} · {Platform.OS === "web" ? "Web" : Platform.OS === "ios" ? "iOS" : "Android"}
          </Text>

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
  header: { fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  sectionLabel: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 18 },
  footer: { fontSize: 11.5, textAlign: "center", marginTop: 20 },
});
