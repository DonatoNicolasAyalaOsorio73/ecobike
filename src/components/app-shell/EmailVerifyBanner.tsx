import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { reloadEmailVerification, resendVerificationEmail } from "@/services/auth.service";

/** Shown to email/password accounts that haven't verified yet; redeeming requires it (api/redeem.js). */
export default function EmailVerifyBanner() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.firebaseUser);
  const [verified, setVerified] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "check" | null>(null);

  const needsIt = user && !user.emailVerified && !verified && user.providerData.some((p) => p.providerId === "password");
  if (!needsIt) return null;

  const run = async (kind: "send" | "check") => {
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === "send") {
        await resendVerificationEmail();
        setMsg(`Te enviamos un enlace a ${user.email}.`);
      } else if (await reloadEmailVerification()) {
        setVerified(true);
      } else {
        setMsg("Aún no aparece verificado. Abre el enlace del correo y vuelve a intentar.");
      }
    } catch (e: any) {
      setMsg(e?.code === "auth/too-many-requests" ? "Demasiados intentos. Espera unos minutos." : "No se pudo completar. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="mail-unread-outline" size={20} color={colors.warning} />
        <Text style={[styles.text, { color: colors.ink }]}>Verifica tu correo para poder canjear recompensas.</Text>
      </View>
      {msg && <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginBottom: 8 }} accessibilityLiveRegion="polite">{msg}</Text>}
      <View style={styles.row}>
        <GlassButton label="Reenviar correo" variant="secondary" onPress={() => run("send")} loading={busy === "send"} style={{ flex: 1 }} />
        <GlassButton label="Ya lo verifiqué" onPress={() => run("check")} loading={busy === "check"} style={{ flex: 1 }} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  text: { flex: 1, fontSize: 13, fontWeight: "600" },
});
