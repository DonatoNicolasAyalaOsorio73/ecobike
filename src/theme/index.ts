// EcoBike design system — single source of truth for colors, spacing, radius,
// shadows, glass surfaces and typography. Values match the existing UI exactly:
// this centralizes tokens without changing the look. Import what you need:
//   import { colors, radius, spacing, shadows, glass } from '../theme';

/* ── Colors ────────────────────────────────────────────────────────────── */
export const colors = {
  // Brand
  brand: '#ADF14B',        // primary green (buttons, accents, avatar ring)
  brandShadow: '#7db82c',  // green glow used in shadows
  onBrand: '#1a2e10',      // text/icon on top of brand-green surfaces
  accent: '#2a5209',       // dark-green accent (icons, secondary emphasis)

  // Feedback
  success: '#54CD64',
  danger: '#e03030',

  // Text (green app screens)
  textDark: '#1a2e10',     // primary headings
  textBody: '#3d5030',     // body copy on light-green
  textMuted: '#5a7050',    // labels
  textMuted2: '#7a8a70',   // icons / tertiary
  textMuted3: '#8a9a80',   // captions / disabled
  placeholder: '#a0a8a0',

  // Text (auth screens keep their purple-grey identity)
  textAuth: '#353147',

  // Surfaces
  screenBg: '#f4f7f2',     // opaque light-green screen background
  surface: '#ffffff',
  white: '#ffffff',
  black: '#000000',

  // QR / ink
  ink: '#12250a',
} as const;

/* ── Spacing (4pt scale) ───────────────────────────────────────────────── */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/* ── Border radius ─────────────────────────────────────────────────────── */
export const radius = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  pill: 999,
} as const;

/* ── Shadows (spread into a style object) ──────────────────────────────── */
export const shadows = {
  // Soft neutral card shadow
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  // Elevated card / modal
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  // Small list-item shadow
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  // Brand-green glow under primary buttons
  brandGlow: {
    shadowColor: colors.brandShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;

/* ── Glass surfaces (liquid-glass presets, spread into a style) ────────── */
export const glass = {
  // Standard frosted card used across app screens
  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    ...shadows.card,
  },
  // Denser card for auth screens
  authCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    ...shadows.modal,
  },
  // Opaque-ish modal surface
  modal: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(28px) saturate(160%)',
    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    ...shadows.modal,
  },
  // Translucent input field
  input: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  // Brand-tinted glass (level pill, menu icons, gender options)
  brandTint: {
    backgroundColor: 'rgba(173,241,75,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(173,241,75,0.5)',
  },
  // Scrim behind centered modals
  scrim: 'rgba(0,0,0,0.5)',
} as const;

/* ── Typography ────────────────────────────────────────────────────────── */
export const typography = {
  // Web font stack matching the iOS look of the demo frame
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, title: 26, hero: 32 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' },
} as const;

export const theme = { colors, spacing, radius, shadows, glass, typography } as const;
export default theme;
