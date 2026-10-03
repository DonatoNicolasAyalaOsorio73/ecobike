import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { ICONS, type TabBarProps } from "./LiquidTabBar";
import { useTheme } from "@/theme/useTheme";
import { spring } from "@/theme/motion";
import { type } from "@/theme/typography";
import { SIDEBAR_WIDTH } from "@/hooks/useLayout";

const LOGO = require("../../../assets/logo.png");
const ITEM_H = 44;
const GAP = 4;
const SELECT_SPRING = spring(0.8, 0.4);

// Keyboard-only focus ring (RN-web's `focused` is also true after a click).
if (typeof document !== "undefined" && !document.getElementById("sidebar-focus")) {
  const css = document.createElement("style");
  css.id = "sidebar-focus";
  css.textContent =
    "[data-sidebar] [role=tab],[data-sidebar] [role=link]{outline:none}[data-sidebar] [role=tab]:focus-visible,[data-sidebar] [role=link]:focus-visible{outline:2px solid rgba(28,36,16,.45);outline-offset:2px}";
  document.head.appendChild(css);
}

/**
 * Desktop web navigation: a persistent glass sidebar (the iPadOS / macOS 26
 * pattern) instead of a phone tab bar stretched across a monitor. Same
 * routes and tabPress semantics as LiquidTabBar; the selection pill slides
 * between rows with the same spring family. Rows are real links for
 * keyboard users (Tab to move, Enter to open, visible focus ring).
 */
export default function DesktopSidebar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const y = useSharedValue(state.index * (ITEM_H + GAP));

  React.useEffect(() => {
    y.value = withSpring(state.index * (ITEM_H + GAP), SELECT_SPRING);
  }, [state.index, y]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View style={styles.wrap} {...({ dataSet: { sidebar: "" } } as object)}>
      <GlassSurface radius={0} intensity={60} specular={false} backgroundColor="rgba(255,255,255,0.6)" borderColor="transparent" style={styles.panel}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="EcoBike" />

        <View role="tablist" aria-orientation="vertical" style={styles.list}>
          <Animated.View style={[styles.pill, { backgroundColor: colors.primary }, pillStyle, { pointerEvents: "none" }]} />
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = (descriptors[route.key].options.title ?? route.name) as string;
            const [outline, filled] = ICONS[route.name] ?? ["ellipse-outline", "ellipse"];
            return (
              <Pressable
                key={route.key}
                role="tab"
                aria-selected={focused}
                accessibilityLabel={label}
                onPress={() => {
                  const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
                }}
                style={({ hovered }: any) => [styles.item, hovered && !focused && { backgroundColor: "rgba(20,23,26,0.05)" }]}
              >
                <Ionicons name={focused ? filled : outline} size={19} color={focused ? colors.onPrimary : colors.inkSoft} />
                <Text style={[type.callout, { color: focused ? colors.onPrimary : colors.ink, fontWeight: focused ? "700" : "500" }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/settings")}
          style={({ hovered }: any) => [styles.item, styles.footer, hovered && { backgroundColor: "rgba(20,23,26,0.05)" }]}
        >
          <Ionicons name="settings-outline" size={19} color={colors.inkSoft} />
          <Text style={[type.callout, { color: colors.ink }]}>Ajustes</Text>
        </Pressable>
      </GlassSurface>
      <View style={[styles.edge, { backgroundColor: colors.divider }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIDEBAR_WIDTH, height: "100%" },
  panel: { flex: 1, paddingHorizontal: 14, paddingTop: 20, paddingBottom: 18, borderWidth: 0 },
  logo: { width: 132, height: 70, marginLeft: 6, marginBottom: 18 },
  list: { gap: GAP },
  pill: { position: "absolute", left: 0, right: 0, top: 0, height: ITEM_H, borderRadius: 14 },
  item: { height: ITEM_H, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderRadius: 14, cursor: "pointer" } as any,
  footer: { marginTop: "auto" },
  edge: { position: "absolute", top: 0, bottom: 0, right: 0, width: StyleSheet.hairlineWidth },
});
