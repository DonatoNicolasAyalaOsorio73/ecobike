import React from "react";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "./PressableScale";
import { AntDesign } from "@expo/vector-icons";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";

function SocialCircle({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <PressableScale depth={0.08} onPress={onPress} accessibilityLabel={label} style={styles.circleWrap}>
      <GlassSurface
        radius={28}
        intensity={45}
        specular={false}
        backgroundColor={colors.glassFillStrong}
        borderColor={colors.glassBorder}
        style={styles.circleInner}
      >
        {children}
      </GlassSurface>
    </PressableScale>
  );
}

interface Props {
  onGoogle?: () => void;
  onApple?: () => void;
}

// Only renders the providers that are actually wired up (see useGoogleAuth /
// isAppleAuthAvailable) — a button with no working handler is worse than no
// button (rule: never ship a control that looks functional but isn't).
export default function SocialRow({ onGoogle, onApple }: Props) {
  const { colors } = useTheme();
  if (!onGoogle && !onApple) return null;

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
        <Text style={{ color: colors.inkFaint, fontSize: 12.5 }}>O continúa con</Text>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      </View>

      <View style={styles.row}>
        {onGoogle && (
          <SocialCircle onPress={onGoogle} label="Continuar con Google">
            <AntDesign name="google" size={20} color="#EA4335" />
          </SocialCircle>
        )}
        {onApple && (
          <SocialCircle onPress={onApple} label="Continuar con Apple">
            <AntDesign name="apple" size={22} color={colors.ink} />
          </SocialCircle>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18, gap: 12 },
  line: { flex: 1, height: 1 },
  row: { flexDirection: "row", justifyContent: "center", gap: 20 },
  circleWrap: { width: 56, height: 56, borderRadius: 28, overflow: "hidden" },
  circleInner: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
