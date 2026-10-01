import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";
import { elevation } from "@/theme/colors";

const BAR_RADIUS = 34;
const INSET = 6; // gap between capsule edge and the active pill (concentric corners)

/** Icon that lifts slightly when its tab becomes active — critically damped,
 * no wiggle: the moving pill already carries the "something changed" signal. */
function TabIcon({ name, focused, color }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; color: string }) {
  const lift = useSharedValue(focused ? 1 : 0);
  React.useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, SPRING.momentum);
  }, [focused, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -1.5 * lift.value }, { scale: 1 + 0.1 * lift.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={22} color={color} />
    </Animated.View>
  );
}

// expo-router doesn't re-export react-navigation's BottomTabBarProps from its
// public entry point, so this is a minimal structural type covering only
// what a custom `tabBar` render prop actually needs.
interface TabBarProps {
  state: { routes: { key: string; name: string }[]; index: number };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: any) => any;
    navigate: (name: any) => void;
  };
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  map: "map-outline",
  points: "ribbon-outline",
  friends: "people-outline",
  stats: "stats-chart-outline",
  profile: "person-outline",
};
const ICONS_ACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  map: "map",
  points: "ribbon",
  friends: "people",
  stats: "stats-chart",
  profile: "person",
};

/** Floating Liquid Glass capsule (iOS 26 tab bar).
 *
 * Clipping fix: the shadow lives on an outer wrapper with no overflow, the
 * glass (which must clip its blur and sheen) lives inside it, and the active
 * pill sits INSET px inside the capsule with radius BAR_RADIUS - INSET, so
 * it can never touch — and get cut by — the capsule's rounded ends.
 *
 * Tabs are flex:1 inside the inset row, so the pill's geometry is pure
 * percentages of that row (onLayout never fired in production web builds). */
export default function LiquidTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;
  const progress = useSharedValue(state.index);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${progress.value * 100}%` }],
  }));

  React.useEffect(() => {
    progress.value = withSpring(state.index, SPRING.momentum);
  }, [state.index, progress]);

  return (
    <Animated.View
      entering={FadeInDown.duration(420).springify().damping(18)}
      style={[styles.wrap, { bottom: Math.max(insets.bottom - 6, 12) }]}
    >
      <View style={[styles.shadow, elevation("high")]}>
        <GlassSurface intensity={70} radius={BAR_RADIUS} backgroundColor="rgba(255,255,255,0.62)" borderColor="rgba(255,255,255,0.95)">
          <View style={styles.row} role="tablist">
            <Animated.View pointerEvents="none" style={[styles.indicatorSlot, { width: `${100 / tabCount}%` }, indicatorStyle]}>
              <LinearGradient
                colors={["rgba(255,255,255,0.95)", colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.indicator, elevation("low")]}
              />
            </Animated.View>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const label = (options.title ?? route.name) as string;
              const tint = isFocused ? colors.primaryDark : colors.inkSoft;

              const onPress = () => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={({ pressed, hovered, focused }: any) => [
                    styles.item,
                    { opacity: pressed ? 0.6 : hovered && !isFocused ? 0.85 : 1 },
                    focused && Platform.OS === "web" && styles.focusRing,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={label}
                >
                  <TabIcon name={(isFocused ? ICONS_ACTIVE[route.name] : ICONS[route.name]) ?? "ellipse-outline"} focused={isFocused} color={tint} />
                  <Text style={[styles.label, { color: tint, fontWeight: isFocused ? "800" : "600" }]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassSurface>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14, pointerEvents: "box-none" },
  shadow: { borderRadius: BAR_RADIUS },
  row: { flexDirection: "row", margin: INSET, height: 56 },
  indicatorSlot: { position: "absolute", top: 0, bottom: 0, left: 0, paddingHorizontal: 2 },
  indicator: { flex: 1, borderRadius: BAR_RADIUS - INSET, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: BAR_RADIUS - INSET },
  focusRing: { outlineWidth: 2, outlineColor: "#34C759", outlineStyle: "solid", outlineOffset: -2 } as any,
  label: { fontSize: 10.5, letterSpacing: -0.1 },
});
