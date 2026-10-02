// EcoBike design tokens — Liquid Glass palette.
// Primary green anchored to the brand color (#7BF510), keeping the original
// mockup's near-white/soft-green "glass on blobs" identity for light mode
// and adding a real dark-mode counterpart (same hues, inverted surfaces).
import { Platform } from "react-native";

export type Theme = Record<keyof typeof lightColorTokens, string>;

const lightColorTokens = {
  bgTop: "#FFFFFF",
  bgBottom: "#F1FCE6",
  blobGreen: "#B8F57E",
  blobGreenSoft: "#E2FCC9",

  primary: "#7BF510",
  // Not a dark green: the "on lime" ink used for text/icons that need emphasis.
  primaryDark: "#1C2410",
  primaryLight: "#CAFB9F",
  onPrimary: "#14210A",

  ink: "#14171A",
  inkSoft: "#5B6660",
  inkFaint: "#8B958E",

  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",

  glassFill: "rgba(255,255,255,0.38)",
  glassFillStrong: "rgba(255,255,255,0.56)",
  glassBorder: "rgba(255,255,255,0.9)",
  glassBorderSoft: "rgba(255,255,255,0.55)",
  // Neutral chip/icon-bubble material. Lime is reserved for functional state
  // (progress, selection, primary actions); decorative surfaces stay neutral.
  chipFill: "rgba(20,23,26,0.05)",
  chipBorder: "rgba(20,23,26,0.06)",
  shadow: "rgba(40, 60, 20, 0.16)",

  placeholder: "#9AA69C",
  divider: "rgba(20,23,26,0.12)",

  success: "#7BF510",
  warning: "#5B6660",
  danger: "#E5484D",
  info: "#1C2410",
};

export const lightColors: Theme = lightColorTokens;

/**
 * Accent palette: light lime only (the primary button's green). `base` is
 * the lime fill for functional state (progress, selection, done); `soft` is
 * deliberately neutral, so decorative bubbles never tint the UI; `lip` is
 * near-black ink for text/icons. Only destructive actions use red.
 */
export const accents = {
  green: { base: "#7BF510", soft: "#F1F2F0", lip: "#1C2410" },
  lime: { base: "#7BF510", soft: "#F1F2F0", lip: "#1C2410" },
  blue: { base: "#7BF510", soft: "#F1F2F0", lip: "#1C2410" },
  orange: { base: "#7BF510", soft: "#F1F2F0", lip: "#1C2410" },
  gold: { base: "#7BF510", soft: "#F1F2F0", lip: "#1C2410" },
  purple: { base: "#7BF510", soft: "#F1F2F0", lip: "#1C2410" },
  red: { base: "#E5484D", soft: "#FDE7E8", lip: "#B83236" },
  teal: { base: "#7BF510", soft: "#F1F2F0", lip: "#1C2410" },
} as const;
export type AccentName = keyof typeof accents;


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

/**
 * Layered elevation (iOS 26 glass): a wide, very soft neutral ambient
 * shadow plus a tight neutral contact shadow. No tint: color is reserved
 * for state, depth comes from light and motion.
 * Web stacks real layers; native RN supports one shadow, so it uses the
 * ambient glow. Apply on a wrapper WITHOUT overflow:hidden, or iOS clips it.
 */
export const ELEVATION = {
  low: { ambient: [6, 20, 0.06], contact: [1, 3, 0.05], elevation: 3 },
  mid: { ambient: [10, 30, 0.08], contact: [1, 4, 0.06], elevation: 8 },
  high: { ambient: [16, 44, 0.1], contact: [2, 8, 0.07], elevation: 14 },
} as const;
// Neutral ambient shadow: depth without tint (a colored glow on every card read as noise).
const GLOW = "20,30,15";
const CONTACT = "0,0,0";

export function elevation(level: keyof typeof ELEVATION) {
  const { ambient, contact, elevation: el } = ELEVATION[level];
  if (Platform.OS === "web") {
    return {
      boxShadow: `0px ${ambient[0]}px ${ambient[1]}px rgba(${GLOW},${ambient[2]}), 0px ${contact[0]}px ${contact[1]}px rgba(${CONTACT},${contact[2]})`,
    } as const;
  }
  return buildShadow(`rgba(${GLOW},${ambient[2] + 0.04})`, ambient[0], ambient[1] / 2, el);
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
