import { glowShadowStyle, lightColors, radii, shadowStyle, spacing, type Theme } from "./colors";

// EcoBike is light-only by design (brand decision): same look on every
// device regardless of the system appearance.
const colors: Theme = lightColors;
const theme = {
  colors,
  isDark: false as const,
  radii,
  spacing,
  shadow: shadowStyle(colors),
  glowShadow: glowShadowStyle(colors),
};

/** Single source of truth for theming. */
export function useTheme() {
  return theme;
}
