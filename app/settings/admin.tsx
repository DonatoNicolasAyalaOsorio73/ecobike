import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/services/api";
import QrScanner from "@/components/QrScanner";

interface Store {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  pointsRequired: number | string;
  isActive?: boolean;
}

const EMPTY = { id: "", name: "", description: "", logo: "", pointsRequired: "", isActive: true };

// Rewards catalog admin (tiendas). All writes go through api/stores.js,
// which re-checks the admin role server-side; hiding this screen from
// non-admins is only UX.
export default function AdminScreen() {
  const { colors } = useTheme();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === "admin";
  const isStaff = isAdmin || role === "partner";
  const [code, setCode] = useState("");
  const [check, setCheck] = useState<{ code: string; store: string; status: string } | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  const [roleUser, setRoleUser] = useState("");
  const [roleMsg, setRoleMsg] = useState<string | null>(null);
  const setRole = async (role: "user" | "partner") => {
    setBusy(true);
    setRoleMsg(null);
    try {
      const r = await api<{ username: string; role: string }>("roles", "POST", { username: roleUser, role });
      setRoleMsg(`@${r.username} ahora es ${r.role === "partner" ? "tienda aliada" : "usuario normal"}.`);
      setRoleUser("");
    } catch (e: any) {
      setRoleMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const [scanning, setScanning] = useState(false);
  const validate = async (confirm: boolean, value = code) => {
    setBusy(true);
    setCodeMsg(null);
    try {
      const r = await api<{ code: string; store: string; status: string }>("validate", "POST", { code: value, confirm });
      setCheck(r);
      if (confirm) setCodeMsg("Código marcado como usado.");
    } catch (e: any) {
      setCheck(null);
      setCodeMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { stores } = await api<{ stores: Store[] }>("stores", "GET");
      setStores(stores.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      setMessage(e.message);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const payload = { ...form, pointsRequired: Number(form.pointsRequired) };
      if (form.id) await api("stores", "PUT", payload);
      else await api("stores", "POST", payload);
      setForm(EMPTY);
      setMessage("Guardado.");
      await load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.header, { color: colors.ink }]}>{isAdmin ? "Administración" : "Tienda aliada"}</Text>
          <View style={{ width: 44 }} />
        </View>

        {!isStaff ? (
          <GlassCard>
            <Text style={{ color: colors.inkSoft, textAlign: "center" }}>No tienes permisos de administrador.</Text>
          </GlassCard>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <GlassCard style={{ marginBottom: 16 }}>
              <Text style={[styles.section, { color: colors.ink }]}>Validar código de canje</Text>
              <GlassInput
                icon="qr-code-outline"
                placeholder="Código del cliente"
                value={code}
                onChangeText={(v) => {
                  setCode(v.toUpperCase());
                  setCheck(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={() => validate(false)}
              />
              {check && (
                <Text style={{ color: check.status === "used" ? colors.danger : colors.ink, marginBottom: 10, fontWeight: "700" }}>
                  {check.store} · {check.status === "used" ? "YA USADO" : "Válido, sin usar"}
                </Text>
              )}
              {codeMsg && <Text style={{ color: colors.inkSoft, marginBottom: 10 }}>{codeMsg}</Text>}
              {check?.status === "active" ? (
                <GlassButton label="Confirmar canje" icon="checkmark-circle-outline" onPress={() => validate(true)} loading={busy} />
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <GlassButton label="Escanear QR" icon="qr-code-outline" onPress={() => setScanning(true)} style={{ flex: 1 }} />
                  <GlassButton label="Verificar" icon="search" variant="secondary" onPress={() => validate(false)} loading={busy} style={{ flex: 1 }} />
                </View>
              )}
              <QrScanner
                visible={scanning}
                onClose={() => setScanning(false)}
                onScanned={(v) => {
                  const scanned = v.trim().toUpperCase();
                  setScanning(false);
                  setCode(scanned);
                  validate(false, scanned);
                }}
              />
            </GlassCard>

            {isAdmin && (
            <>
            <GlassCard style={{ marginBottom: 16 }}>
              <Text style={[styles.section, { color: colors.ink }]}>Tiendas aliadas (rol partner)</Text>
              <GlassInput icon="person-outline" placeholder="@usuario" value={roleUser} onChangeText={setRoleUser} autoCapitalize="none" autoCorrect={false} />
              {roleMsg && <Text style={{ color: colors.inkSoft, marginBottom: 10 }}>{roleMsg}</Text>}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <GlassButton label="Hacer partner" icon="storefront-outline" onPress={() => setRole("partner")} loading={busy} style={{ flex: 1 }} />
                <GlassButton label="Quitar" icon="close" variant="secondary" onPress={() => setRole("user")} style={{ flex: 1 }} />
              </View>
            </GlassCard>
            <GlassCard>
              <Text style={[styles.section, { color: colors.ink }]}>{form.id ? "Editar tienda" : "Nueva tienda"}</Text>
              <GlassInput icon="storefront-outline" placeholder="Nombre" value={form.name} onChangeText={set("name")} />
              <GlassInput
                icon="star-outline"
                placeholder="Puntos requeridos"
                keyboardType="number-pad"
                value={String(form.pointsRequired)}
                onChangeText={set("pointsRequired")}
              />
              <GlassInput icon="document-text-outline" placeholder="Descripción" value={form.description} onChangeText={set("description")} multiline />
              <GlassInput icon="image-outline" placeholder="URL del logo" value={form.logo} onChangeText={set("logo")} autoCapitalize="none" />
              <View style={styles.row}>
                <Text style={{ color: colors.ink, flex: 1 }}>Activa</Text>
                <Switch value={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              </View>
              {message && <Text style={{ color: colors.inkSoft, marginBottom: 10 }}>{message}</Text>}
              <GlassButton label={form.id ? "Guardar cambios" : "Crear tienda"} icon="save-outline" onPress={save} loading={busy} />
              {form.id ? (
                <GlassButton label="Cancelar" variant="secondary" onPress={() => setForm(EMPTY)} style={{ marginTop: 10 }} />
              ) : null}
            </GlassCard>

            {stores.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${s.name}`}
                onPress={() =>
                  setForm({
                    id: s.id,
                    name: s.name ?? "",
                    description: s.description ?? "",
                    logo: s.logo ?? "",
                    pointsRequired: String(s.pointsRequired ?? ""),
                    isActive: s.isActive !== false,
                  })
                }
              >
                <GlassCard style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700" }}>
                    {s.name} {s.isActive === false ? "(inactiva)" : ""}
                  </Text>
                  <Text style={{ color: colors.inkSoft }}>{s.pointsRequired} pts</Text>
                </GlassCard>
              </Pressable>
            ))}
            </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  header: { fontSize: 20, fontWeight: "800" },
  scroll: { paddingBottom: 60 },
  section: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
});
