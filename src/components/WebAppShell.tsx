import React, { useEffect, useState } from "react";
import { ModalHostContext } from "@/components/ui/modalHost";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

const TABLET_CONTENT_WIDTH = 600;
const WIDE_BREAKPOINT = 720;

// iPhone 15 logical screen + chrome.
const SCREEN_W = 393;
const SCREEN_H = 852;
const BEZEL = 12;
const INSETS = { top: 54, bottom: 34, left: 0, right: 0 };

function useClock() {
  const fmt = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 15_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/** Status bar, Dynamic Island and home indicator drawn over the app (web device frame). */
function DeviceChrome() {
  const time = useClock();
  return (
    <>
      <View pointerEvents="none" style={styles.statusBar}>
        <Text style={styles.time}>{time}</Text>
        <View style={styles.island} />
        <View style={styles.statusIcons}>
          <Ionicons name="cellular" size={15} color="#111" />
          <Ionicons name="wifi" size={15} color="#111" />
          <Ionicons name="battery-full" size={22} color="#111" />
        </View>
      </View>
      <View pointerEvents="none" style={styles.homeIndicator} />
    </>
  );
}

/**
 * One app, every device:
 *  - phones (native or mobile browser): full screen, exactly like native
 *  - tablets (native): centered column
 *  - desktop browsers: the same app inside an iPhone frame, so the web looks
 *    and behaves like the phone app
 */
export default function WebAppShell({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const [modalHost, setModalHost] = useState<HTMLElement | null>(null);

  if (width < WIDE_BREAKPOINT) return <>{children}</>;

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.nativeBackdrop, { backgroundColor: colors.bgBottom }]}>
        <View style={{ flex: 1, width: Math.min(width, TABLET_CONTENT_WIDTH), overflow: "hidden" }}>{children}</View>
      </View>
    );
  }

  const scale = Math.min(1, (height - 40) / (SCREEN_H + BEZEL * 2));

  return (
    <View style={styles.desk}>
      <View style={{ transform: [{ scale }] }}>
        <View style={styles.device}>
          <View style={[styles.sideButton, { top: 180, height: 32, left: -4 }]} />
          <View style={[styles.sideButton, { top: 230, height: 60, left: -4 }]} />
          <View style={[styles.sideButton, { top: 300, height: 60, left: -4 }]} />
          <View style={[styles.sideButton, { top: 250, height: 96, right: -4 }]} />
          <View style={[styles.screen, { backgroundColor: colors.bgTop }]}>
            <SafeAreaInsetsContext.Provider value={INSETS}>
              <ModalHostContext.Provider value={modalHost}>{children}</ModalHostContext.Provider>
            </SafeAreaInsetsContext.Provider>
            {/* AppModal portals here so sheets stay on the phone screen, above the tab bar. */}
            <View
              ref={(el) => setModalHost((el as unknown as HTMLElement) ?? null)}
              pointerEvents="box-none"
              style={[StyleSheet.absoluteFill, { zIndex: 900 }]}
            />
            <DeviceChrome />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeBackdrop: { flex: 1, alignItems: "center" },
  desk: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF6E6",
    backgroundImage: "radial-gradient(circle at 20% 20%, #E3F9C8 0, transparent 45%), radial-gradient(circle at 80% 80%, #D8FBA6 0, transparent 40%)",
  } as any,
  device: {
    width: SCREEN_W + BEZEL * 2,
    height: SCREEN_H + BEZEL * 2,
    padding: BEZEL,
    borderRadius: 64,
    backgroundColor: "#1B1D1B",
    boxShadow: "0 40px 80px rgba(40,60,20,0.25), inset 0 0 0 2px #3A3D3A",
  } as any,
  sideButton: { position: "absolute", width: 4, borderRadius: 2, backgroundColor: "#2A2D2A" },
  // Background blobs are clipped at their source, so "hidden" here can't be
  // scrolled sideways by focusing an input.
  screen: { width: SCREEN_W, height: SCREEN_H, borderRadius: 52, overflow: "hidden" },
  statusBar: { position: "absolute", top: 0, left: 0, right: 0, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 34, zIndex: 1000 },
  time: { fontSize: 16, fontWeight: "700", color: "#111", width: 60, textAlign: "center" },
  island: { position: "absolute", top: 11, left: (SCREEN_W - 124) / 2, width: 124, height: 36, borderRadius: 20, backgroundColor: "#000" },
  statusIcons: { flexDirection: "row", alignItems: "center", gap: 5, width: 80, justifyContent: "flex-end" },
  homeIndicator: { position: "absolute", bottom: 8, left: (SCREEN_W - 134) / 2, width: 134, height: 5, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1000 },
});
