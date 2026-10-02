import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, FadeOutDown } from "react-native-reanimated";
import { enter } from "@/theme/motion";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import GlassSurface from "@/components/ui/GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { RIDE_GOAL_OPTIONS, type RideGoal } from "@/utils/rideGoals";

interface Props {
  onSelect: (goal: RideGoal | null) => void;
  onClose: () => void;
}

/**
 * The map's "focus" menu: everything behind turns translucent (frosted
 * backdrop) and the ride options spring in one after another.
 */
export default function RideOptionsMenu({ onSelect, onClose }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar opciones" onPress={onClose} style={StyleSheet.absoluteFill}>
        <GlassSurface
          radius={0}
          intensity={70}
          specular={false}
          borderColor="transparent"
          backgroundColor={isDark ? "rgba(10,14,10,0.55)" : "rgba(246,251,243,0.55)"}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>

      <View style={styles.sheet} pointerEvents="box-none">
        <Animated.Text entering={enter()} style={[styles.title, { color: colors.ink }]}>
          ¿Cómo quieres pedalear?
        </Animated.Text>
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {RIDE_GOAL_OPTIONS.map((o, i) => (
            <Animated.View
              key={o.id}
              entering={enter(40 + i * 40)}
              exiting={FadeOutDown.duration(140)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${o.label}. ${o.subtitle}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  onSelect(o.goal);
                }}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <GlassSurface radius={22} intensity={55} backgroundColor={colors.glassFillStrong} style={styles.option}>
                  <View
                    style={[
                      styles.icon,
                      { backgroundColor: o.goal ? "rgba(173,241,75,0.35)" : colors.primary },
                    ]}
                  >
                    <Ionicons name={o.icon as any} size={19} color={colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: "600", fontSize: 16, letterSpacing: -0.2 }}>{o.label}</Text>
                    <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginTop: 2 }}>{o.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                </GlassSurface>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", left: 16, right: 82, bottom: 110, top: 90 }, // right: room for the control rail
  title: { fontSize: 22, fontWeight: "700", marginBottom: 14, letterSpacing: -0.3 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
