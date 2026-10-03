import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { spring, SPRING } from "@/theme/motion";
import { elevation } from "@/theme/colors";
import { LIQUID_FILL } from "@/theme/glass";

const BAR_RADIUS = 27;
const INSET = 3; // lens sits inside the capsule with concentric corners

// SwiftUI's `.bouncy` (response 0.5s, bounce 0.3 → damping ratio 0.7): the
// spring iOS 26 uses for Liquid Glass selection moves.
const LENS_SPRING = spring(0.7, 0.5);

// Keyboard-only focus ring. RN-web's `focused` is also true after a mouse
// click, which left a permanent colored outline on the tapped tab.
// Shared Liquid Glass material (theme/glass.ts).
const BAR_FILL = LIQUID_FILL;

if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("tabbar-focus")) {
  const css = document.createElement("style");
  css.id = "tabbar-focus";
  css.textContent =
    "[data-tabbar] [role=tab]{outline:none;-webkit-tap-highlight-color:transparent}[data-tabbar] [role=tab]:focus-visible{outline:2px solid rgba(28,36,16,.35);outline-offset:-4px;border-radius:24px}";
  document.head.appendChild(css);
}

// expo-router doesn't re-export react-navigation's BottomTabBarProps from its
// public entry point, so this is a minimal structural type covering only
// what a custom `tabBar` render prop actually needs.
export interface TabBarProps {
  state: { routes: { key: string; name: string }[]; index: number };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: any) => any;
    navigate: (name: any) => void;
  };
}

export const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  home: ["home-outline", "home"],
  map: ["map-outline", "map"],
  points: ["ribbon-outline", "ribbon"],
  friends: ["people-outline", "people"],
  stats: ["stats-chart-outline", "stats-chart"],
  profile: ["person-outline", "person"],
};

function Tab({ index, progress, name, label, focused, ink, soft }: { index: number; progress: { value: number }; name: string; label: string; focused: boolean; ink: string; soft: string }) {
  // Color follows the lens position continuously instead of flipping at the end.
  const color = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(progress.value - index));
    return { color: interpolateColor(near, [0, 1], [soft, ink]) };
  });
  const [outline, filled] = ICONS[name] ?? ["ellipse-outline", "ellipse"];
  return (
    <>
      <Ionicons name={focused ? filled : outline} size={20} color={focused ? ink : soft} />
      <Animated.Text style={[styles.label, { fontWeight: focused ? "600" : "500" }, color]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </>
  );
}

/** iOS 26 Liquid Glass tab bar.
 *
 * - Capsule: Liquid Glass "regular" variant: translucent enough to show
 *   color through, opaque enough that labels stay legible where blur is
 *   unavailable (Android, older browsers); strong blur + saturation and a
 *   specular rim; shadow on an unclipped wrapper so it is never cut.
 * - Selection is a lime glass "lens" (brand color = selected state). It slides with
 *   the `.bouncy` spring and stretches like liquid while travelling
 *   (scaleX grows with the distance to the nearest tab, scaleY gives a bit).
 * - Pressing any tab swells the lens slightly (the iOS 26 magnify feel).
 *
 * Tabs are flex:1 inside the inset row, so geometry is pure percentages of
 * that row (onLayout never fired in production web builds). */
export default function LiquidTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Profile lives behind the avatar on phones (iOS 26 pattern), not in the bar.
  const routes = state.routes.filter((r) => r.name !== "profile");
  const focusedKey = state.routes[state.index]?.key;
  const activeIndex = routes.findIndex((r) => r.key === focusedKey);
  const tabCount = routes.length;
  const progress = useSharedValue(Math.max(0, activeIndex));
  const press = useSharedValue(0);
  const lensVisible = useSharedValue(activeIndex >= 0 ? 1 : 0);

  React.useEffect(() => {
    if (activeIndex >= 0) progress.value = withSpring(activeIndex, LENS_SPRING);
    lensVisible.value = withSpring(activeIndex >= 0 ? 1 : 0, SPRING.default);
  }, [activeIndex, progress, lensVisible]);

  // 0 when resting on a tab, up to 0.5 halfway between two tabs.
  const travel = useDerivedValue(() => Math.abs(progress.value - Math.round(progress.value)));

  const lensStyle = useAnimatedStyle(() => ({
    opacity: lensVisible.value,
    transform: [
      { translateX: `${progress.value * 100}%` },
      { scaleX: 1 + travel.value * 0.5 + press.value * 0.06 },
      { scaleY: 1 - travel.value * 0.14 + press.value * 0.06 },
    ],
  }));


  return (
    <Animated.View
      entering={FadeInDown.duration(420).springify().damping(18)}
      style={[styles.wrap, { bottom: Math.max(insets.bottom - 6, 12) }]}
    >
      <View style={[styles.shadow, elevation("low")]}>
        <GlassSurface intensity={100} radius={BAR_RADIUS} specular={false} backgroundColor={BAR_FILL} borderColor="rgba(255,255,255,0.5)">
          <View style={styles.row} role="tablist" {...({ dataSet: { tabbar: "" } } as object)}>
            <Animated.View pointerEvents="none" style={[styles.lensSlot, { width: `${100 / tabCount}%` }, lensStyle]}>
              <View style={[styles.lens, LENS_WEB]} />
            </Animated.View>
            {routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = activeIndex === index;
              const label = (options.title ?? route.name) as string;

              const onPress = () => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onPressIn={() => (press.value = withSpring(1, SPRING.press))}
                  onPressOut={() => (press.value = withSpring(0, SPRING.default))}
                  style={({ hovered }: any) => [styles.item, { opacity: hovered && !isFocused ? 0.75 : 1 }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  aria-selected={isFocused}
                  accessibilityLabel={label}
                >
                  <Tab index={index} progress={progress} name={route.name} label={label} focused={isFocused} ink={colors.ink} soft={colors.inkSoft} />
                </Pressable>
              );
            })}
          </View>
        </GlassSurface>
      </View>
    </Animated.View>
  );
}

// Lens: lime glass with a top highlight and a soft neutral shadow (web
// renders the inset highlight; native gets the translucent fill).
const LENS_WEB =
  Platform.OS === "web"
    ? ({ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 1px 4px rgba(0,0,0,0.08)" } as object)
    : elevation("low");

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 22, right: 22, pointerEvents: "box-none" },
  shadow: { borderRadius: BAR_RADIUS },
  row: { flexDirection: "row", margin: INSET, height: 46 },
  lensSlot: { position: "absolute", top: 0, bottom: 0, left: 0 },
  // Brand lime lens (selection is functional state); ink icon/label on top, as on the primary button.
  lens: { flex: 1, marginHorizontal: 3, zIndex: 1, borderRadius: BAR_RADIUS - INSET, backgroundColor: "rgba(123,245,16,0.92)" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 1, paddingHorizontal: 2 },
  label: { fontSize: 10, letterSpacing: -0.1 },
});
