import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { enter } from "@/theme/motion";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import Logo from "@/components/ui/Logo";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";

interface Props {
  children: React.ReactNode;
  /** Floating back control (top-leading, outside the layout flow). */
  back?: boolean;
  /** Logo width in pt; scaled down on short screens. null hides it. */
  logo?: number | null;
  title?: string;
  subtitle?: string;
  /** Vertically center the column (short screens); otherwise top-aligned. */
  center?: boolean;
}

/**
 * The one layout every auth screen shares, so welcome → login → register →
 * recovery read as one continuous place (the stack cross-fades and the logo
 * sits in the same spot):
 *  - logo as the protagonist, generous negative space, a 400pt column
 *  - no wrapping card: fields and buttons sit on the page itself
 *  - safe areas, keyboard avoidance, and short-screen scaling in one place
 */
export default function AuthScaffold({ children, back, logo = 200, title, subtitle, center = true }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const short = useWindowDimensions().height < 740; // iPhone SE / small Androids
  const logoSize = logo ? Math.round(short ? logo * 0.72 : logo) : null;

  return (
    <View style={styles.screen}>
      <BackgroundBlobs variant="auth" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scroll, center && { justifyContent: "center" }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.column}>
              {logoSize ? (
                <View style={styles.logo}>
                  <Logo size={logoSize} />
                </View>
              ) : null}
              {title ? (
                <Rise index={0}>
                  <Text style={[type.title1, styles.title, { color: colors.ink }]} accessibilityRole="header">
                    {title}
                  </Text>
                  {subtitle ? <Text style={[type.subhead, styles.subtitle, { color: colors.inkSoft }]}>{subtitle}</Text> : null}
                </Rise>
              ) : null}
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {back && (
        <View style={[styles.back, { top: insets.top + 8 }]}>
          <BackButton size={40} />
        </View>
      )}
    </View>
  );
}

/** Staggered entrance: each block rises in a beat after the previous one. Short, so it never delays input. */
export function Rise({ index, children, style }: { index: number; children: React.ReactNode; style?: any }) {
  return (
    <Animated.View entering={enter(120 + index * 70)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Quiet text link (neutral ink, never accent-colored). */
export function AuthLink({ children, onPress, align = "center", role = "link" }: { children: React.ReactNode; onPress: () => void; align?: "center" | "right"; /** "button" when it performs an action instead of navigating. */ role?: "link" | "button" }) {
  const { colors } = useTheme();
  return (
    <Text onPress={onPress} accessibilityRole={role} style={[type.footnote, { color: colors.ink, fontWeight: "600", textAlign: align }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 56, paddingBottom: 28 },
  column: { width: "100%", maxWidth: 400, alignSelf: "center" },
  logo: { alignItems: "center", marginBottom: 8 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 6, marginBottom: 28 },
  back: { position: "absolute", left: 16 },
});
