import type { TextStyle } from "react-native";

/**
 * iOS 26 type ramp (SF Pro sizes, tightened tracking on large sizes). One
 * place to change it instead of ad-hoc fontSize/letterSpacing per screen.
 */
export const type = {
  largeTitle: { fontSize: 34, fontWeight: "700", letterSpacing: -0.8 },
  title1: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  title2: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  title3: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: "400" },
  callout: { fontSize: 15, fontWeight: "500" },
  subhead: { fontSize: 14, fontWeight: "400" },
  footnote: { fontSize: 13, fontWeight: "400" },
  caption: { fontSize: 12, fontWeight: "600" },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  display: { fontSize: 44, fontWeight: "700", letterSpacing: -1.4 },
} satisfies Record<string, TextStyle>;
