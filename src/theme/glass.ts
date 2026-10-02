import { Platform } from "react-native";

/**
 * The Liquid Glass "regular" material shared by floating controls (tab bar,
 * map launcher, points badge): clear glass where a real backdrop blur
 * exists; a denser fill where it doesn't (Android, browsers without
 * backdrop-filter) so content on top stays legible.
 */
export const HAS_BACKDROP_BLUR =
  Platform.OS === "ios" ||
  (Platform.OS === "web" && typeof CSS !== "undefined" && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)")));

export const LIQUID_FILL = HAS_BACKDROP_BLUR ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.86)";
/** A touch denser, for small controls that carry text (badges). */
export const LIQUID_FILL_STRONG = HAS_BACKDROP_BLUR ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.9)";
export const LIQUID_BORDER = "rgba(255,255,255,0.55)";
/** Specular rim on web (bright top edge), the detail that makes glass read as a lens. */
export const LIQUID_RIM = Platform.OS === "web" ? ({ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(255,255,255,0.25)" } as object) : null;
/** Prominent glass for a primary control over busy content (the map launcher): frosted enough that its content always reads. */
export const LIQUID_FILL_PROMINENT = HAS_BACKDROP_BLUR ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.94)";
