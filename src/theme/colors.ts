// EcoBike design tokens — Liquid Glass palette.
// Primary green anchored to the brand color (#ADF14B), keeping the original
// mockup's near-white/soft-green "glass on blobs" identity for light mode
// and adding a real dark-mode counterpart (same hues, inverted surfaces).
import { Platform } from "react-native";

export type Theme = Record<keyof typeof lightColorTokens, string>;

const lightColorTokens = {
  bgTop: "#FFFFFF",
  bgBottom: "#F2FBE9",
  blobGreen: "#C3EE7C",
  blobGreenSoft: "#E3F9C8",

  primary: "#ADF14B",
  primaryDark: "#6FA524",
  primaryLight: "#D8FBA6",
  onPrimary: "#14210A",

  ink: "#14171A",
  inkSoft: "#5B6660",
  inkFaint: "#8B958E",

  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",

  glassFill: "rgba(255,255,255,0.45)",
  glassFillStrong: "rgba(255,255,255,0.68)",
  glassBorder: "rgba(255,255,255,0.9)",
  glassBorderSoft: "rgba(255,255,255,0.55)",
  glassGreenFill: "rgba(173,241,75,0.28)",
  glassGreenBorder: "rgba(120,190,40,0.5)",
  shadow: "rgba(40, 60, 20, 0.16)",

  placeholder: "#9AA69C",
  divider: "rgba(20,23,26,0.12)",

  success: "#3FB65E",
  warning: "#E0A82E",
  danger: "#E5484D",
  info: "#3B8FE0",
};

export const lightColors: Theme = lightColorTokens;


export const radii = {
  pill: 999,
  card: 28,
  sheet: 24,
  circle: 999,
} as const;

export const spacing = (n: number) => n * 4;

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// React Native Web deprecated the shadow* props in favor of the CSS
// `boxShadow` shorthand; native RN doesn't understand boxShadow at all. One
// spec (offset/opacity/radius/color) rendered to whichever the platform
// wants, instead of two near-duplicate style objects to keep in sync.
function buildShadow(color: string, offsetY: number, blurRadius: number, elevation: number) {
  if (Platform.OS === "web") {
    return { boxShadow: `0px ${offsetY}px ${blurRadius}px ${color}` } as const;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: 1,
    shadowRadius: blurRadius,
    elevation,
  } as const;
}

export function shadowStyle(theme: Theme) {
  return buildShadow(theme.shadow, 10, 20, 6);
}

/** Colored glow for primary brand CTAs — a tinted shadow reads as "this
 * button matters" the way a flat black shadow doesn't. */
export function glowShadowStyle(theme: Theme) {
  return buildShadow(hexToRgba(theme.primaryDark, 0.35), 8, 14, 6);
}

// Backward-compatible flat export for quick imports outside the theme hook.
export const colors = lightColors;
