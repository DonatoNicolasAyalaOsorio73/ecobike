import { Platform, useWindowDimensions } from "react-native";

/** Desktop browsers get a sidebar instead of the floating phone tab bar. */
export const DESKTOP_BREAKPOINT = 1024;
export const SIDEBAR_WIDTH = 248;
/** Readable column for scrolling screens on wide windows. */
export const CONTENT_MAX_WIDTH = 720;

/**
 * Single source for platform/size layout decisions, so screens don't each
 * sprinkle Platform.OS + width checks.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;
  return {
    desktop,
    /** Space a screen must leave at the bottom so content clears the tab bar. */
    bottomInset: desktop ? 32 : 112,
  };
}
