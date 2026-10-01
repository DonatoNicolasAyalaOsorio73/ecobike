import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme/useTheme";

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 0-100, native blur strength (web derives its own CSS blur radius from this). */
  intensity?: number;
  radius?: number;
  /** Top sheen highlight that sells the "liquid" look — off for tiny controls
   * like icon buttons where it just reads as noise. */
  specular?: boolean;
  borderColor?: string;
  backgroundColor?: string;
}

/**
 * The one Liquid Glass surface primitive everything else (cards, buttons,
 * inputs, tab bar, modals) is built on. Two real implementations, not one
 * approximated for both:
 *  - native: expo-blur's BlurView (true backdrop blur)
 *  - web: CSS backdrop-filter directly (expo-blur's web shim renders as a
 *    plain semi-transparent view with no real blur, and — separately — is
 *    what conflicts with Reanimated's "entering" layout animations; going
 *    straight to CSS here sidesteps both problems and looks correct)
 */
export default function GlassSurface({
  children,
  style,
  intensity = 40,
  radius,
  specular = true,
  borderColor,
  backgroundColor,
}: Props) {
  const { colors, radii, isDark } = useTheme();
  const isWeb = Platform.OS === "web";
  const cornerRadius = radius ?? radii.card;
  const border = borderColor ?? colors.glassBorderSoft;

  return (
    <View
      style={[
        { borderRadius: cornerRadius, overflow: "hidden", borderWidth: 1, borderColor: border },
        isWeb && ({
          backgroundColor: backgroundColor ?? colors.glassFill,
          backdropFilter: `blur(${Math.round(intensity / 1.4)}px) saturate(190%) brightness(1.04)`,
          WebkitBackdropFilter: `blur(${Math.round(intensity / 1.4)}px) saturate(190%) brightness(1.04)`,
          // Specular rim: a bright inner top edge and a faint bottom edge, the
          // detail that makes iOS 26 glass read as a lens rather than a tint.
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(255,255,255,0.3)",
        } as ViewStyle),
        style,
      ]}
    >
      {!isWeb && (
        <BlurView intensity={intensity} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      )}
      {!isWeb && backgroundColor && (
        <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor }]} />
      )}
      {specular && (
        <LinearGradient
          colors={isDark ? ["rgba(255,255,255,0.10)", "rgba(255,255,255,0)"] : ["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
          style={[StyleSheet.absoluteFill, styles.noPointerEvents]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  noPointerEvents: { pointerEvents: "none" },
});
