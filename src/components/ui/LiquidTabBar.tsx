import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";
import { accents, type AccentName } from "@/theme/colors";

// Each tab owns a color (Duolingo-style): the icon and indicator take it when selected.
const TAB_ACCENT: Record<string, AccentName> = { map: "green", points: "gold", friends: "blue", stats: "purple", profile: "orange" };

/** Icon that pops (scale overshoot + tiny wiggle) whenever its tab becomes active. */
function TabIcon({ name, focused, color }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; color: string }) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  React.useEffect(() => {
    if (!focused) return;
    scale.value = withSequence(withSpring(1.3, SPRING.press), withSpring(1, SPRING.bouncy));
    rotate.value = withSequence(withTiming(-10, { duration: 90 }), withTiming(8, { duration: 110 }), withSpring(0, SPRING.bouncy));
  }, [focused, scale, rotate]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={23} color={color} />
    </Animated.View>
  );
}

// expo-router doesn't re-export react-navigation's BottomTabBarProps from its
// public entry point, so this is a minimal structural type covering only
// what a custom `tabBar` render prop actually needs.
interface TabBarProps {
  state: { routes: { key: string; name: string }[]; index: number };
  descriptors: Record<string, { options: { title?: string } }>;
  // react-navigation's real `navigation.emit`/`navigate` types are generic
  // over a route-specific event map that this shim intentionally doesn't
  // model — only the two calls below are ever made against it.
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

/** Floating Liquid Glass tab bar with a sliding pill indicator (iOS 26
 * style) that springs between tabs, instead of each tab drawing its own
 * static highlight.
 *
 * Every tab is flex:1, so the indicator's geometry is pure percentages —
 * one tab wide, translated by whole multiples of its own width. The
 * previous measured version rendered at width 0 in production web builds,
 * where `onLayout` never fired (see SegmentedControl for the same fix). */
export default function LiquidTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;
  const progress = useSharedValue(state.index);
  const activeAccent = accents[TAB_ACCENT[state.routes[state.index]?.name] ?? "green"];

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${progress.value * 100}%` }],
  }));

  React.useEffect(() => {
    progress.value = withSpring(state.index, SPRING.momentum);
  }, [state.index, progress]);

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 16) }]}>
      <GlassSurface intensity={60} radius={30} backgroundColor={colors.glassFillStrong} borderColor={colors.glassBorder} style={styles.bar}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { width: `${100 / tabCount}%`, backgroundColor: activeAccent.soft, borderColor: activeAccent.base },
            indicatorStyle,
          ]}
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = (options.title ?? route.name) as string;

          const onPress = () => {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const iconName = (isFocused ? ICONS_ACTIVE[route.name] : ICONS[route.name]) ?? "ellipse-outline";

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.item}
              hitSlop={8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <TabIcon name={iconName} focused={isFocused} color={isFocused ? accents[TAB_ACCENT[route.name] ?? "green"].lip : colors.inkSoft} />
              <Text style={[styles.label, { color: isFocused ? accents[TAB_ACCENT[route.name] ?? "green"].lip : colors.inkSoft }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", pointerEvents: "box-none" },
  // No horizontal padding: the indicator's percentage width must resolve
  // against the same box the equal-width tabs are laid out in.
  bar: {
    flexDirection: "row",
    paddingVertical: 10,
    width: "100%",
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4, borderRadius: 18, gap: 2, zIndex: 2 },
  indicator: { position: "absolute", top: 4, bottom: 4, left: 0, borderRadius: 20, borderWidth: 2 },
  label: { fontSize: 10.5, fontWeight: "700" },
});
