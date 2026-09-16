// EcoBike — design tokens
// Palette derived from the mockups: near-white background, soft green
// "liquid glass" blobs, a leafy primary green, and near-black ink text.

export const colors = {
  // Backgrounds
  bgTop: "#FFFFFF",
  bgBottom: "#F3FBF0",
  blobGreen: "#B7E68C",
  blobGreenSoft: "#DFF5CE",

  // Brand
  primary: "#7FC241", // wheel / leaf green
  primaryDark: "#5FA22B",
  primaryLight: "#C7EFA4",

  // Ink
  ink: "#14171A",
  inkSoft: "#5B6660",
  inkFaint: "#8B958E",

  // Glass surfaces
  glassFill: "rgba(255,255,255,0.45)",
  glassFillStrong: "rgba(255,255,255,0.65)",
  glassBorder: "rgba(255,255,255,0.9)",
  glassBorderSoft: "rgba(255,255,255,0.55)",
  glassGreenFill: "rgba(180,230,130,0.35)",
  glassGreenBorder: "rgba(140,210,90,0.55)",
  shadow: "rgba(60, 90, 50, 0.18)",

  placeholder: "#9AA69C",
  divider: "rgba(20,23,26,0.12)",
};

export const radii = {
  pill: 999,
  card: 30,
  circle: 999,
};

export const shadowStyle = {
  shadowColor: "#3C5A32",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 6,
};
