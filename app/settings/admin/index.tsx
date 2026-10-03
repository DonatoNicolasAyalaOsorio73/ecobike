import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { LinearTransition } from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import GlassIconButton from "@/components/ui/GlassIconButton";
import PressableScale from "@/components/ui/PressableScale";
import SegmentedControl from "@/components/ui/SegmentedControl";
import StoreLogo, { Avatar } from "@/components/rewards/StoreLogo";
import QrScanner from "@/components/admin/QrScanner";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import { useAuthStore } from "@/stores/authStore";
import { isImageSrc } from "@/domain/rewardsMapping";
import { ROLE_LABEL, getKpis, listStores, searchUsers, validateCode, type AdminStore, type AdminUserSummary, type Kpis } from "@/services/admin.service";

type Section = "stores" | "users" | "validate";

// Admin panel home. All writes go through /api/* which re-checks the role
// server-side and audits every change; hiding this from non-admins is only UX.
export default function AdminScreen() {
  const { colors } = useTheme();
  const role = useAuthStore((s) => s.profile?.role);
  const isAdmin = role === "admin";
  const isStaff = isAdmin || role === "partner";
  const [section, setSection] = useState<Section>(isAdmin ? "stores" : "validate");
  // The role can arrive after the first render: land admins on Tiendas then too.
  useEffect(() => {
    if (isAdmin) setSection((v) => (v === "validate" ? "stores" : v));
  }, [isAdmin]);

  return (
    <LargeTitleScreen title={isStaff && !isAdmin ? "Tienda aliada" : "Administración"} leading={<BackButton size={36} />} tabBar={false}>
      {!isStaff ? (
        <GlassCard>
          <Text style={[type.subhead, { color: colors.inkSoft, textAlign: "center" }]}>No tienes permisos de administrador.</Text>
        </GlassCard>
      ) : isAdmin ? (
        <>
          <KpiStrip />
          <SegmentedControl
            options={[
              { label: "Tiendas", value: "stores" },
              { label: "Usuarios", value: "users" },
              { label: "Validar", value: "validate" },
            ]}
            value={section}
            onChange={setSection}
            style={{ marginBottom: 16 }}
          />
          {section === "stores" && <StoresSection />}
          {section === "users" && <UsersSection />}
          {section === "validate" && <ValidateCard />}
        </>
      ) : (
        <ValidateCard />
      )}
    </LargeTitleScreen>
  );
}

function KpiStrip() {
  const { colors } = useTheme();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  useEffect(() => {
    // One retry: a cold serverless start can time out the first call.
    getKpis()
      .catch(() => getKpis())
      .then(setKpis)
      .catch(() => setKpis(null));
  }, []);
  const items: [string, number | null | undefined][] = [
    ["Usuarios", kpis?.users],
    ["Km 7 d", kpis?.kmWeek],
    ["Canjes 7 d", kpis?.redemptionsWeek],
  ];
  return (
    <View style={styles.kpis}>
      {items.map(([label, value], i) => (
        <Animated.View key={label} entering={enter(i * 50)} style={styles.kpi}>
          <Text style={[styles.kpiValue, { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>
            {value == null ? "–" : value.toLocaleString("es-CO")}
          </Text>
          <Text style={[type.caption, { color: colors.inkSoft }]}>{label}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

/** Minimal search field shared by the stores and users lists. */
function SearchField({ value, onChange, placeholder, onSubmit }: { value: string; onChange: (v: string) => void; placeholder: string; onSubmit?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: colors.chipFill }]}>
      <Ionicons name="search" size={17} color={colors.inkSoft} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        accessibilityLabel={placeholder}
        style={[styles.input, { color: colors.ink }]}
      />
      {value ? (
        <Pressable onPress={() => onChange("")} accessibilityLabel="Borrar búsqueda" hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const hasLogo = (s: AdminStore) => isImageSrc(s.logo);

function StoresSection() {
  const { colors } = useTheme();
  const [stores, setStores] = useState<AdminStore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Reload when coming back from the editor.
  useFocusEffect(
    useCallback(() => {
      listStores()
        .then((s) => {
          setStores(s);
          setError(null);
        })
        .catch((e) => setError(e.message));
    }, [])
  );

  const text = q.trim().toLowerCase();
  const shown = (stores ?? []).filter((s) => !text || (s.name ?? "").toLowerCase().includes(text));
  const missingLogos = (stores ?? []).filter((s) => !hasLogo(s)).length;

  return (
    <>
      <View style={styles.toolbar}>
        <SearchField value={q} onChange={setQ} placeholder="Buscar tienda" />
        <GlassIconButton icon="add" onPress={() => router.push({ pathname: "/settings/admin/store" })} accessibilityLabel="Nueva tienda" liquid />
      </View>
      {missingLogos > 0 && (
        <Text style={[type.footnote, { color: colors.inkSoft, marginBottom: 6, marginLeft: 4 }]}>
          {missingLogos === 1 ? "1 tienda sin logo" : `${missingLogos} tiendas sin logo`}: se muestran con sus iniciales
        </Text>
      )}
      {error && <Text style={[type.footnote, { color: colors.danger, marginBottom: 8 }]}>{error}</Text>}
      {stores === null && !error && <Text style={[type.subhead, styles.empty, { color: colors.inkSoft }]}>Cargando…</Text>}
      {shown.map((s, i) => (
        <Animated.View key={s.id} entering={enter(Math.min(i, 8) * 30)} layout={LinearTransition.springify().damping(20)}>
          <PressableScale
            depth={0.015}
            onPress={() => router.push({ pathname: "/settings/admin/store", params: { id: s.id } })}
            accessibilityLabel={`Editar ${s.name}`}
            style={[styles.row, s.isActive === false && { opacity: 0.45 }]}
          >
            <StoreLogo uri={s.logo} name={s.name ?? "?"} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.headline, { color: colors.ink }]} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={[type.footnote, { color: colors.inkSoft }]} numberOfLines={1}>
                {Number.isFinite(Number(s.pointsRequired)) ? Number(s.pointsRequired).toLocaleString("es-CO") : "–"} pts{s.isActive === false ? " · Inactiva" : ""}
                {!hasLogo(s) ? " · Sin logo" : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
          </PressableScale>
        </Animated.View>
      ))}
      {stores !== null && !shown.length && <Text style={[type.subhead, styles.empty, { color: colors.inkSoft }]}>Sin resultados</Text>}
    </>
  );
}

function UsersSection() {
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const query = useRef(q);
  query.current = q;

  const load = useCallback(async (text: string, after?: string) => {
    setLoading(true);
    try {
      const r = await searchUsers(text, after);
      if (text !== query.current.trim()) return; // a newer search is on its way
      setUsers((u) => (after ? [...(u ?? []), ...r.users] : r.users));
      setNext(r.next);
      setError(null);
    } catch (e: any) {
      if (text === query.current.trim()) setError(e.message); // ignore errors of superseded searches
    } finally {
      if (text === query.current.trim()) setLoading(false);
    }
  }, []);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, load]);
  // Fresh data after editing a user (skips the first focus; the effect above loads it).
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) load(query.current.trim());
      focused.current = true;
    }, [load])
  );

  return (
    <>
      <View style={styles.toolbar}>
        <SearchField value={q} onChange={setQ} placeholder="@usuario o correo" onSubmit={() => load(q.trim())} />
      </View>
      {error && <Text style={[type.footnote, { color: colors.danger, marginBottom: 8 }]}>{error}</Text>}
      {(users ?? []).map((u, i) => {
        const name = `${u.nombre} ${u.apellido}`.trim();
        return (
          <Animated.View key={u.uid} entering={enter(Math.min(i, 8) * 30)}>
            <PressableScale
              depth={0.015}
              onPress={() => router.push({ pathname: "/settings/admin/user", params: { id: u.uid } })}
              accessibilityLabel={`Gestionar ${u.username ? "@" + u.username : name || u.uid}`}
              style={[styles.row, !u.active && { opacity: 0.45 }]}
            >
              <Avatar name={name || u.username || "?"} photo={u.photo} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.headline, { color: colors.ink }]} numberOfLines={1}>
                  {name || (u.username ? `@${u.username}` : "Sin nombre")}
                </Text>
                <Text style={[type.footnote, { color: colors.inkSoft }]} numberOfLines={1}>
                  {u.username ? `@${u.username}` : u.email ?? ""} · {u.points.toLocaleString("es-CO")} pts
                </Text>
              </View>
              {u.role !== "user" && (
                <View style={[styles.tag, { backgroundColor: colors.chipFill }]}>
                  <Text style={[type.caption, { color: colors.ink }]}>{ROLE_LABEL[u.role]}</Text>
                </View>
              )}
              {!u.active && <Ionicons name="lock-closed" size={14} color={colors.inkSoft} accessibilityLabel="Suspendida" />}
            </PressableScale>
          </Animated.View>
        );
      })}
      {users !== null && !users.length && !loading && <Text style={[type.subhead, styles.empty, { color: colors.inkSoft }]}>Sin resultados</Text>}
      {loading && <Text style={[type.subhead, styles.empty, { color: colors.inkSoft }]}>Cargando…</Text>}
      {next && !q && !loading && <GlassButton label="Cargar más" variant="secondary" onPress={() => load("", next)} style={{ marginTop: 12 }} />}
    </>
  );
}

function ValidateCard() {
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [check, setCheck] = useState<{ code: string; store: string; status: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  const validate = async (confirm: boolean, value = code) => {
    setBusy(true);
    setMsg(null);
    try {
      setCheck(await validateCode(value, confirm));
      if (confirm) setMsg("Código marcado como usado.");
    } catch (e: any) {
      setCheck(null);
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard>
      <Text style={[type.headline, { color: colors.ink, marginBottom: 12 }]}>Validar código</Text>
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
        onSubmitEditing={() => code.trim() && validate(false)}
      />
      {check && (
        // Right after confirming, "used" is the success state, not an error.
        <Text style={[type.headline, { color: check.status === "used" && !msg ? colors.danger : colors.ink, marginBottom: 10 }]}>
          {check.store} · {check.status === "used" ? (msg ? "Canje confirmado" : "Ya usado") : "Válido, sin usar"}
        </Text>
      )}
      {msg && <Text style={[type.footnote, { color: colors.inkSoft, marginBottom: 10 }]}>{msg}</Text>}
      {check?.status === "active" ? (
        <GlassButton label="Confirmar canje" icon="checkmark-circle-outline" onPress={() => validate(true)} loading={busy} />
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <GlassButton label="Escanear" icon="qr-code-outline" onPress={() => setScanning(true)} style={{ flex: 1 }} />
          <GlassButton label="Verificar" icon="search" variant="secondary" onPress={() => validate(false)} loading={busy} disabled={!code.trim()} style={{ flex: 1 }} />
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
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpi: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  kpiValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 44, borderRadius: 999 },
  input: { flex: 1, fontSize: 15.5, minWidth: 0, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  empty: { textAlign: "center", marginTop: 20 },
});
