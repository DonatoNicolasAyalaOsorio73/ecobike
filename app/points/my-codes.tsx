import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns/format";
import { es } from "date-fns/locale/es";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import { columnStyle, useLargeTitle } from "@/components/ui/LargeTitleScreen";
import Animated from "react-native-reanimated";
import GlassCard from "@/components/ui/GlassCard";
import { useTheme } from "@/theme/useTheme";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRewards } from "@/hooks/useRewards";
import GlassButton from "@/components/ui/GlassButton";
import { accents, elevation, type AccentName } from "@/theme/colors";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";

export default function MyCodesScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const { isRealAccount } = useAvailablePoints(userId);
  const { redemptions, refresh, loading } = useRewards(userId, isRealAccount);
  const [openId, setOpenId] = useState<string | null>(null);
  const lt = useLargeTitle({ title: "Mis códigos", leading: <BackButton size={36} />, tabBar: false });
  // Status changes when a store validates the code, so re-read on focus.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
        <Animated.FlatList
          data={redemptions}
          keyExtractor={(r) => r.id}
          onScroll={lt.onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={lt.showsVerticalScrollIndicator}
          contentContainerStyle={[lt.contentContainerStyle, { paddingHorizontal: 20 }, columnStyle]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <>
              <View style={{ marginHorizontal: -20 }}>{lt.header}</View>
              {redemptions.length > 0 ? (
              <>
                <View style={styles.summary}>
                  <SummaryPill accent="green" icon="ticket" value={redemptions.filter((r) => r.status !== "used").length} label="Activos" />
                  <SummaryPill accent="purple" icon="checkmark-done" value={redemptions.filter((r) => r.status === "used").length} label="Usados" />
                  <SummaryPill accent="gold" icon="ribbon" value={redemptions.reduce((s, r) => s + r.pointsSpent, 0)} label="Pts canjeados" />
                </View>
                <Text style={{ color: colors.inkSoft, fontSize: 12.5, textAlign: "center", marginBottom: 12 }}>
                  Toca un código para mostrar su QR en la tienda.
                </Text>
              </>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <GlassCard style={{ alignItems: "center" }}>
              <View style={[styles.emptyIcon, { backgroundColor: accents.gold.soft, borderColor: "transparent" }]}>
                <Ionicons name="gift" size={34} color={accents.gold.lip} />
              </View>
              <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 17, marginTop: 12 }}>Aún no tienes códigos</Text>
              <Text style={{ color: colors.inkSoft, textAlign: "center", marginTop: 4, marginBottom: 14 }}>
                Canjea tus puntos por recompensas en tiendas aliadas.
              </Text>
              <GlassButton label="Ver recompensas" icon="gift-outline" onPress={() => router.replace("/points")} style={{ alignSelf: "stretch" }} />
            </GlassCard>
          }
          renderItem={({ item, index }) => {
            const used = item.status === "used";
            const open = openId === item.id && !used;
            return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={used ? `${item.rewardTitle}, código usado` : `Mostrar QR de ${item.rewardTitle}`}
              onPress={() => setOpenId(open ? null : item.id)}
              disabled={used}
            >
            <GlassCard style={{ marginBottom: 12, opacity: used ? 0.55 : 1 }} entranceDelay={Math.min(index, 8) * 40}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.chipFill, borderColor: colors.chipBorder }]}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.ink }]}>{item.rewardTitle}</Text>
                  <Text style={[styles.meta, { color: colors.inkSoft }]}>
                    {format(new Date(item.redeemedAt), "d 'de' MMMM, yyyy", { locale: es })} · -{item.pointsSpent} pts
                  </Text>
                </View>
                <View style={[styles.codePill, { backgroundColor: colors.glassFillStrong, borderColor: colors.glassBorder }]}>
                  <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13, letterSpacing: 1, textDecorationLine: used ? "line-through" : "none" }}>
                    {item.code}
                  </Text>
                </View>
              </View>
              <View style={[styles.status, { backgroundColor: used ? "#EEF1EC" : accents.green.base }]}>
                <Ionicons name={used ? "checkmark-done" : "ticket"} size={12} color={used ? colors.inkSoft : accents.green.lip} />
                <Text style={{ color: used ? colors.inkSoft : accents.green.lip, fontSize: 11, fontWeight: "700" }}>{used ? "USADO" : "ACTIVO"}</Text>
              </View>
              {open && (
                <View style={styles.qrWrap}>
                  <View style={styles.qrBox}>
                    <QRCode value={item.code} size={180} />
                  </View>
                  <Text style={[styles.meta, { color: colors.inkSoft, marginTop: 10, textAlign: "center" }]}>
                    Muestra este QR o el código en la caja. Solo se puede usar una vez.
                  </Text>
                </View>
              )}
            </GlassCard>
            </Pressable>
            );
          }}
        />
        {lt.navBar}
    </View>
  );
}

function SummaryPill({ accent, icon, value, label }: { accent: AccentName; icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  const a = accents[accent];
  return (
    <View style={[styles.pill, elevation("low")]}>
      <Ionicons name={icon} size={16} color={a.lip} />
      <Text style={styles.pillValue}>{value.toLocaleString("es-CO")}</Text>
      <Text style={styles.pillLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pill: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.78)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  pillValue: { fontSize: 18, fontWeight: "700", color: "#1F2A22" },
  pillLabel: { fontSize: 11.5, fontWeight: "500", color: "#6B776F" },
  status: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", borderWidth: 3 },
  screen: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 14.5, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  qrWrap: { alignItems: "center", marginTop: 16 },
  qrBox: { padding: 12, backgroundColor: "#fff", borderRadius: 16 },
  codePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
});
