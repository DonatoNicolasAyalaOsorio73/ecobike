import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import LiquidToggle from "@/components/ui/LiquidToggle";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ChoiceChips from "@/components/ui/ChoiceChips";
import HoldToConfirm from "@/components/rewards/HoldToConfirm";
import { Avatar } from "@/components/rewards/StoreLogo";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import { useAuthStore } from "@/stores/authStore";
import { deleteUser, describeLog, getUser, listStores, updateUser, type AdminLog, type AdminStore, type AdminUserDetail, type Role } from "@/services/admin.service";

/** One user: activity at a glance, then each change in its own small card. */
export default function UserAdmin() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myUid = useAuthStore((s) => s.firebaseUser?.uid);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [role, setRole] = useState<Role>("user");
  const [storeId, setStoreId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  const apply = useCallback((r: { user: AdminUserDetail; logs: AdminLog[] }) => {
    setUser(r.user);
    setLogs(r.logs);
    setRole(r.user.role);
    setStoreId(r.user.storeId ?? "");
    setPoints(String(r.user.points));
    setReason("");
    setNombre(r.user.nombre);
    setApellido(r.user.apellido);
  }, []);

  useEffect(() => {
    if (!id) return;
    getUser(id).then(apply).catch((e) => setError(e.message));
    listStores().then(setStores).catch(() => {});
  }, [id, apply]);

  const run = async (key: string, patch: Parameters<typeof updateUser>[0], done: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      apply(await updateUser(patch));
      setNotice(done);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    setError(null);
    try {
      await deleteUser(id, deleteReason);
      router.back();
    } catch (e: any) {
      setError(e.message);
      setBusy(null);
    }
  };

  if (!user) {
    return (
      <LargeTitleScreen title="Usuario" leading={<BackButton size={36} />} tabBar={false}>
        {error ? <Text style={[type.subhead, { color: colors.danger, textAlign: "center" }]}>{error}</Text> : <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />}
      </LargeTitleScreen>
    );
  }

  const me = user.uid === myUid;
  const name = `${user.nombre} ${user.apellido}`.trim() || (user.username ? `@${user.username}` : "Sin nombre");
  const pointsChanged = points !== String(user.points);
  const roleChanged = role !== user.role || (role === "partner" && storeId !== (user.storeId ?? ""));
  const namesChanged = nombre.trim() !== user.nombre || apellido.trim() !== user.apellido;

  return (
    <LargeTitleScreen title={name} leading={<BackButton size={36} />} tabBar={false}>
      <Animated.View entering={enter(0)} style={styles.head}>
        <Avatar name={name} photo={user.photo} size={64} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.headline, { color: colors.ink }]} numberOfLines={1}>
            {user.username ? `@${user.username}` : "Sin usuario"}
          </Text>
          <Text style={[type.footnote, { color: colors.inkSoft }]} numberOfLines={1} selectable>
            {user.email ?? "Sin correo"}
            {user.email ? (user.emailVerified ? " · verificado" : " · sin verificar") : ""}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.stats}>
        {(
          [
            ["Puntos", user.points],
            ["Válidos", user.stats.verifiedRides],
            ["Viajes", user.stats.rides],
            ["Canjes", user.stats.codes],
          ] as const
        ).map(([label, value], i) => (
          <Animated.View key={label} entering={enter(40 + i * 40)} style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>
              {value.toLocaleString("es-CO")}
            </Text>
            <Text style={[type.caption, { color: colors.inkSoft }]}>{label}</Text>
          </Animated.View>
        ))}
      </View>

      {(error || notice) && (
        <Animated.Text entering={FadeInDown.duration(200)} style={[type.footnote, { color: error ? colors.danger : colors.inkSoft, marginBottom: 12, textAlign: "center" }]} accessibilityLiveRegion="polite">
          {error ?? notice}
        </Animated.Text>
      )}

      <GlassCard style={styles.card}>
        <Text style={[type.headline, { color: colors.ink, marginBottom: 10 }]}>Rol</Text>
        <SegmentedControl
          options={[
            { label: "Usuario", value: "user" as Role },
            { label: "Partner", value: "partner" as Role },
            { label: "Admin", value: "admin" as Role },
          ]}
          value={role}
          onChange={setRole}
        />
        {role === "partner" && (
          <Animated.View entering={FadeIn} style={{ marginTop: 12 }}>
            <ChoiceChips accessibilityLabel="Tienda del partner" allowClear={false} value={storeId} onChange={setStoreId} choices={stores.map((s) => ({ value: s.id, label: s.name }))} />
          </Animated.View>
        )}
        {roleChanged && (
          <Animated.View entering={FadeIn}>
            <GlassButton
              label="Guardar rol"
              onPress={() => run("role", { id: user.uid, role, ...(role === "partner" ? { storeId } : {}) }, "Rol actualizado.")}
              loading={busy === "role"}
              disabled={(role === "partner" && !storeId) || (me && role !== "admin")}
              style={{ marginTop: 12 }}
            />
          </Animated.View>
        )}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[type.headline, { color: colors.ink, marginBottom: 10 }]}>Puntos</Text>
        <GlassInput icon="ribbon-outline" keyboardType="number-pad" value={points} onChangeText={(v) => setPoints(v.replace(/\D/g, ""))} accessibilityLabel="Puntos" />
        {pointsChanged && (
          <Animated.View entering={FadeIn}>
            <GlassInput placeholder="Motivo del ajuste (queda registrado)" value={reason} onChangeText={setReason} maxLength={300} />
            <GlassButton label="Ajustar puntos" onPress={() => run("points", { id: user.uid, points: Number(points), reason }, "Puntos ajustados.")} loading={busy === "points"} disabled={!points || reason.trim().length < 5} />
          </Animated.View>
        )}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[type.headline, { color: colors.ink, marginBottom: 10 }]}>Nombre</Text>
        <GlassInput placeholder="Nombre" value={nombre} onChangeText={setNombre} maxLength={60} />
        <GlassInput placeholder="Apellido" value={apellido} onChangeText={setApellido} maxLength={60} />
        {namesChanged && (
          <Animated.View entering={FadeIn}>
            <GlassButton label="Guardar nombre" onPress={() => run("names", { id: user.uid, nombre, apellido }, "Nombre actualizado.")} loading={busy === "names"} disabled={!nombre.trim() || !apellido.trim()} />
          </Animated.View>
        )}
      </GlassCard>

      {!me && (
        <GlassCard style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[type.headline, { color: colors.ink }]}>Cuenta activa</Text>
              <Text style={[type.footnote, { color: colors.inkSoft }]}>Suspender cierra su sesión en todos los dispositivos.</Text>
            </View>
            {busy === "disabled" ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <LiquidToggle value={!user.disabled} onValueChange={(v) => run("disabled", { id: user.uid, disabled: !v }, v ? "Cuenta reactivada." : "Cuenta suspendida.")} />
            )}
          </View>
        </GlassCard>
      )}

      {logs.length > 0 && (
        <View style={{ marginTop: 6, marginBottom: 10 }}>
          <Text style={[type.footnote, { color: colors.inkSoft, marginBottom: 6, marginLeft: 4, fontWeight: "600" }]}>Historial de cambios</Text>
          {logs.map((l) => (
            <View key={l.id} style={styles.log}>
              <Text style={[type.footnote, { color: colors.ink, flex: 1 }]}>{describeLog(l)}</Text>
              <Text style={[type.caption, { color: colors.inkFaint }]}>{l.at ? new Date(l.at).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : ""}</Text>
            </View>
          ))}
        </View>
      )}

      {!me && (
        <View style={{ marginTop: 18 }}>
          <GlassInput placeholder="Motivo para eliminar la cuenta" value={deleteReason} onChangeText={setDeleteReason} maxLength={300} />
          <HoldToConfirm label="Mantén para eliminar" onConfirm={remove} loading={busy === "delete"} disabled={deleteReason.trim().length < 5} />
          <Text style={[type.caption, { color: colors.inkFaint, textAlign: "center", marginTop: 8 }]}>Borra su cuenta, recorridos, chats y foto. No se puede deshacer.</Text>
        </View>
      )}
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  stats: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  statValue: { fontSize: 19, fontWeight: "800", letterSpacing: -0.5 },
  card: { marginBottom: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  log: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
});
