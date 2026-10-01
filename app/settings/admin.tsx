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
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");
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
          <Text style={[styles.header, { color: colors.ink }]}>Administrar tiendas</Text>
          <View style={{ width: 44 }} />
        </View>

        {!isAdmin ? (
          <GlassCard>
            <Text style={{ color: colors.inkSoft, textAlign: "center" }}>No tienes permisos de administrador.</Text>
          </GlassCard>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
