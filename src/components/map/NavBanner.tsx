import React from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import GlassSurface from "@/components/ui/GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { type } from "@/theme/typography";
import { LIQUID_BORDER, LIQUID_FILL_STRONG, LIQUID_RIM } from "@/theme/glass";
import { distanceLabel, remainingLabel, maneuverIcon, type NavState } from "@/domain/navigation";

interface Props {
  nav: NavState;
  destination: string;
  recalculating: boolean;
  onRecalculate: () => void;
}

/**
 * Turn-by-turn banner while riding an Eco ruta: the next turn (icon, distance
 * along the route, instruction) and what's left to the destination. Off the
 * route it says so and offers to recalculate; at the end it celebrates.
 */
export default function NavBanner({ nav, destination, recalculating, onRecalculate }: Props) {
  const { colors } = useTheme();
  const remaining = remainingLabel(nav.remainingM);

  let icon = maneuverIcon(nav.next?.type ?? 8);
  let title = distanceLabel(nav.distanceM);
  let line = nav.next?.instruction ?? `Sigue hasta ${destination}`;
  if (nav.arrived) {
    icon = "flag";
    title = "¡Llegaste!";
    line = destination;
  } else if (nav.offRoute) {
    icon = "alert";
    title = "Fuera de la ruta";
    line = "Vuelve a la línea verde o recalcula desde aquí.";
  }

  // iOS ignores accessibilityLiveRegion: announce each new turn / state explicitly.
  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}. ${line}`);
  }, [title, line]);

  return (
    <Animated.View entering={FadeInDown.duration(320)} layout={LinearTransition.springify().damping(20)} style={[styles.wrap, elevation("mid")]}>
      <GlassSurface radius={22} intensity={100} specular backgroundColor={LIQUID_FILL_STRONG} borderColor={LIQUID_BORDER} style={[styles.card, LIQUID_RIM]}>
        <View style={[styles.icon, { backgroundColor: nav.offRoute && !nav.arrived ? colors.ink : colors.primary }]}>
          <Ionicons name={icon as any} size={26} color={nav.offRoute && !nav.arrived ? "#FFFFFF" : colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }} accessibilityLiveRegion="polite">
          <Animated.Text key={title} entering={FadeIn.duration(200)} style={[type.title2, { color: colors.ink }]} numberOfLines={1}>
            {title}
          </Animated.Text>
          <Text style={[type.subhead, { color: colors.ink }]} numberOfLines={2}>
            {line}
          </Text>
          {!nav.arrived && !nav.offRoute && <Text style={[type.caption, { color: colors.inkSoft, marginTop: 2 }]}>Quedan {remaining}</Text>}
        </View>
        {nav.offRoute && !nav.arrived && (
          <Pressable onPress={onRecalculate} disabled={recalculating} accessibilityRole="button" accessibilityLabel="Recalcular ruta" style={[styles.recalc, { backgroundColor: colors.primary }]}>
            {recalculating ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Ionicons name="refresh" size={18} color={colors.onPrimary} />}
          </Pressable>
        )}
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 22, marginHorizontal: 16 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14 },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  recalc: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
