import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import AdminOnly from "@/components/admin/AdminOnly";
import BackButton from "@/components/ui/BackButton";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import PressableScale from "@/components/ui/PressableScale";
import LiquidToggle from "@/components/ui/LiquidToggle";
import StoreLogo from "@/components/rewards/StoreLogo";
import HoldToConfirm from "@/components/rewards/HoldToConfirm";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import { deleteStore, listStores, saveStore, uploadStoreLogo } from "@/services/admin.service";

const EMPTY = { name: "", description: "", logo: "", pointsRequired: "", isActive: true };

/** Create or edit a store (reward). The logo is required: tap the stamp to upload it. */
export default function StoreEditorScreen() {
  return (
    <AdminOnly>
      <StoreEditor />
    </AdminOnly>
  );
}

function StoreEditor() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    listStores()
      .then((all) => {
        const s = all.find((x) => x.id === id);
        if (!s) {
          setNotFound(true);
          throw new Error("La tienda no existe.");
        }
        setForm({ name: s.name ?? "", description: s.description ?? "", logo: s.logo ?? "", pointsRequired: String(s.pointsRequired ?? ""), isActive: s.isActive !== false });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k: "name" | "description" | "pointsRequired") => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const pickLogo = async () => {
    setError(null);
    let res: ImagePicker.ImagePickerResult;
    try {
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    } catch {
      setError("No se pudo abrir la galería.");
      return;
    }
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const logo = await uploadStoreLogo(res.assets[0].uri);
      setForm((f) => ({ ...f, logo }));
    } catch (e: any) {
      setError(e?.message ?? "No se pudo procesar el logo.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      // An old store without a logo can still be edited; new ones need it (enforced by the API too).
      const { logo, ...rest } = form;
      await saveStore({ ...(id ? { id } : {}), ...rest, ...(logo ? { logo } : {}), pointsRequired: Number(form.pointsRequired) });
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await deleteStore(id);
      router.back();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const ready = !notFound && form.name.trim() && Number(form.pointsRequired) > 0 && (id || form.logo);

  return (
    <LargeTitleScreen title={id ? "Editar tienda" : "Nueva tienda"} leading={<BackButton size={36} />} tabBar={false}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />
      ) : (
        <>
          {/* The logo as a big stamp; tapping it uploads a new one. */}
          <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.logoWrap}>
            <PressableScale onPress={pickLogo} disabled={uploading} accessibilityLabel={form.logo ? "Cambiar logo" : "Subir logo"} style={styles.logoTap}>
              <StoreLogo uri={form.logo || undefined} name={form.name || "?"} size={132} />
              <View style={[styles.logoBadge, { backgroundColor: colors.ink }]}>
                {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={form.logo ? "camera" : "add"} size={18} color="#fff" />}
              </View>
            </PressableScale>
            {!form.logo && (
              <Animated.Text entering={FadeIn} style={[type.footnote, { color: colors.inkSoft, marginTop: 8 }]}>
                Sube el logo (cuadrado, se guarda a 256 px)
              </Animated.Text>
            )}
          </Animated.View>

          <Animated.View entering={enter(60)}>
            <GlassInput label="Nombre" placeholder="Ej. Pelu Store" value={form.name} onChangeText={set("name")} maxLength={80} />
            <GlassInput label="Puntos" placeholder="Ej. 400" keyboardType="number-pad" value={form.pointsRequired} onChangeText={(v) => set("pointsRequired")(v.replace(/\D/g, ""))} />
            <GlassInput label="Premio" placeholder="Ej. 2x1 en bebidas" value={form.description} onChangeText={set("description")} maxLength={500} multiline />
            <View style={styles.toggleRow}>
              <Text style={[type.body, { color: colors.ink, flex: 1 }]}>Visible en Premios</Text>
              <LiquidToggle value={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </View>
          </Animated.View>

          {error && (
            <Animated.Text entering={FadeIn} style={[type.footnote, { color: colors.danger, marginBottom: 10 }]} accessibilityLiveRegion="assertive">
              {error}
            </Animated.Text>
          )}

          <Animated.View entering={enter(120)}>
            <GlassButton label={id ? "Guardar" : "Crear tienda"} onPress={save} loading={busy} disabled={!ready || uploading} />
            {id && (
              <View style={{ marginTop: 28 }}>
                <HoldToConfirm label="Mantén para eliminar" onConfirm={remove} loading={busy} />
                <Text style={[type.caption, { color: colors.inkFaint, textAlign: "center", marginTop: 8 }]}>Los códigos ya canjeados siguen siendo válidos.</Text>
              </View>
            )}
          </Animated.View>
        </>
      )}
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "center", marginBottom: 18 },
  logoTap: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
  logoBadge: { position: "absolute", right: 6, bottom: 6, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 6, marginBottom: 14 },
});
