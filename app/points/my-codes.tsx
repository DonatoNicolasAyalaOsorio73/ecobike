import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
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
  const { redemptions } = useRewards(userId, isRealAccount);

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
          ListEmptyComponent={
            <GlassCard>
              <Text style={{ color: colors.inkSoft, textAlign: "center" }}>
                Todavía no has canjeado ninguna recompensa.
              </Text>
            </GlassCard>
          }
          renderItem={({ item, index }) => (
            <GlassCard style={{ marginBottom: 12 }} entranceDelay={Math.min(index, 8) * 40}>
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
                  <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 13, letterSpacing: 1 }}>{item.code}</Text>
                </View>
              </View>
            </GlassCard>
          )}
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
  codePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
});
