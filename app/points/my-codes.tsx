import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import { useTheme } from "@/theme/useTheme";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRewards } from "@/hooks/useRewards";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";

export default function MyCodesScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const { isRealAccount } = useAvailablePoints(userId);
  const { redemptions, refresh, loading } = useRewards(userId, isRealAccount);
  const [openId, setOpenId] = useState<string | null>(null);
  // Status changes when a store validates the code, so re-read on focus.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.header, { color: colors.ink }]}>Mis códigos</Text>
          <View style={{ width: 44 }} />
        </View>

        <FlatList
          data={redemptions}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            redemptions.length > 0 ? (
              <Text style={{ color: colors.inkSoft, fontSize: 12.5, textAlign: "center", marginBottom: 12 }}>
                Toca un código para mostrar su QR en la tienda.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <GlassCard>
              <Text style={{ color: colors.inkSoft, textAlign: "center" }}>
                Todavía no has canjeado ninguna recompensa.
              </Text>
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
                <View style={[styles.iconWrap, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.ink }]}>{item.rewardTitle}</Text>
                  <Text style={[styles.meta, { color: colors.inkSoft }]}>
                    {format(new Date(item.redeemedAt), "d 'de' MMMM, yyyy", { locale: es })} · -{item.pointsSpent} pts
                  </Text>
                </View>
                <View style={[styles.codePill, { backgroundColor: colors.glassFillStrong, borderColor: colors.glassBorder }]}>
                  <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 13, letterSpacing: 1, textDecorationLine: used ? "line-through" : "none" }}>
                    {item.code}
                  </Text>
                </View>
              </View>
              {used && <Text style={[styles.meta, { color: colors.inkSoft, marginTop: 8 }]}>Usado en tienda</Text>}
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 4, marginBottom: 8 },
  header: { fontSize: 17, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 14.5, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  qrWrap: { alignItems: "center", marginTop: 16 },
  qrBox: { padding: 12, backgroundColor: "#fff", borderRadius: 16 },
  codePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
});
