import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTheme } from "@/theme/useTheme";

const TABLET_CONTENT_WIDTH = 600;
const WIDE_BREAKPOINT = 720;

/**
 * One app, every device:
 *  - phones (native or mobile browser): full screen
 *  - tablets (native): centered column
 *  - web: full window. Desktop gets its own layout (sidebar navigation and
 *    readable columns, see useLayout) instead of a phone mock-up.
 */
export default function WebAppShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  if (Platform.OS === "web") return <View style={[styles.web, { backgroundColor: colors.bgBottom }]}>{children}</View>;
  if (width < WIDE_BREAKPOINT) return <>{children}</>;
  return (
    <View style={[styles.nativeBackdrop, { backgroundColor: colors.bgBottom }]}>
      <View style={{ flex: 1, width: Math.min(width, TABLET_CONTENT_WIDTH), overflow: "hidden" }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeBackdrop: { flex: 1, alignItems: "center" },
  // Clip so blurred background blobs can never cause sideways scroll.
  web: { flex: 1, overflow: "hidden" },
});
