import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTheme } from "@/theme/useTheme";

const MAX_CONTENT_WIDTH = 480;
const WIDE_BREAKPOINT = 720;

/**
 * Every screen in this app is written phone-first (fixed horizontal
 * paddings, a floating bottom tab bar, etc.) — correct for iOS/Android, but
 * on a laptop/desktop browser that layout would just stretch edge-to-edge
 * and overflow (buttons and the tab bar running off-screen). Centering it
 * in a phone-width column is the standard, low-effort fix other phone-first
 * RN-web apps use rather than maintaining a second desktop layout per
 * screen. Native platforms and narrow web viewports render unchanged.
 */
export default function WebAppShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  if (Platform.OS !== "web" || width < WIDE_BREAKPOINT) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.backdrop, { backgroundColor: colors.bgBottom }]}>
      {/* This branch only ever renders on web (see the early return above),
          so the CSS `boxShadow` shorthand is always safe here — no native
          shadow* props to keep in sync with a platform check. */}
      <View style={[styles.frame, { backgroundColor: colors.bgTop, boxShadow: `0px 0px 40px ${colors.shadow}` } as any]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    width: MAX_CONTENT_WIDTH,
    height: "100%",
    maxHeight: 960,
    overflow: "hidden",
  },
});
