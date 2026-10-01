import { useColorScheme } from "react-native";
import { darkColors, glowShadowStyle, lightColors, radii, shadowStyle, spacing, type Theme } from "./colors";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Single source of truth for theming. Respects the user's system appearance
 * unless they've pinned Light/Dark in Settings > Apariencia.
 */
export function useTheme() {
  const system = useColorScheme();
  const override = useSettingsStore((s) => s.appearance);
  const scheme = override === "system" ? system : override;
  const isDark = scheme === "dark";
  const colors: Theme = isDark ? darkColors : lightColors;

  return {
    colors,
    isDark,
    radii,
    spacing,
    shadow: shadowStyle(colors),
    glowShadow: glowShadowStyle(colors),
  };
}
