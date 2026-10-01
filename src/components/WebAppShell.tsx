import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTheme } from "@/theme/useTheme";

const WEB_CONTENT_WIDTH = 480;
const TABLET_CONTENT_WIDTH = 600;
const WIDE_BREAKPOINT = 720;

/**
 * The app is designed phone-first (one column, floating tab bar). On wide
 * screens — desktop browsers and tablets — the same app is shown in a
 * centered column instead of stretching edge to edge, so every device sees
 * the same layout and features. Phones and narrow browsers render unchanged.
 */
export default function WebAppShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  if (width < WIDE_BREAKPOINT) return <>{children}</>;

  if (Platform.OS !== "web") {
    // Tablets: a wider centered column, full height.
    return (
      <View style={[styles.nativeBackdrop, { backgroundColor: colors.bgBottom }]}>
        <View style={{ flex: 1, width: Math.min(width, TABLET_CONTENT_WIDTH), overflow: "hidden" }}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.backdrop, { backgroundColor: colors.bgBottom }]}>
      {/* Web only: CSS boxShadow is safe here. overflow "clip" (unlike
          "hidden") can't be scrolled by focus/scrollIntoView, so decorative
          overflow never shifts the app sideways. */}
      <View style={[styles.frame, { backgroundColor: colors.bgTop, boxShadow: `0px 0px 40px ${colors.shadow}`, overflow: "clip" } as any]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center" },
  nativeBackdrop: { flex: 1, alignItems: "center" },
  frame: {
    width: WEB_CONTENT_WIDTH,
    height: "100%",
    maxHeight: 960,
  },
});
