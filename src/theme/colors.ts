// ─── Nudofy Design System v2 · Colors ────────────────────────────────────────
// Filosofía: silencio visual. El rojo #E73121 solo para CTAs y acentos únicos.
// Grises cálidos hacen el 99% del trabajo.

export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brand:      '#E73121',   // CTA primario, acento único
  brandHover: '#D22818',   // pressed
  brandSoft:  '#FEF2F1',   // tintado muy sutil (badges, highlights)

  // ── Neutros cálidos (la base del sistema) ─────────────────────────────────
  ink:      '#0A0A0A',   // texto principal
  ink2:     '#3F3F3F',   // texto secundario
  ink3:     '#737373',   // metadatos, terciario
  ink4:     '#A3A3A3',   // placeholders, iconos inactivos

  line:     '#EAEAEA',   // bordes, divisores
  line2:    '#F4F4F4',   // divisores muy sutiles, hover

  surface:  '#FAFAFA',   // fondo app
  surface2: '#F5F5F5',   // inputs, chips
  white:    '#FFFFFF',   // cards, modales

  // ── Semánticos ────────────────────────────────────────────────────────────
  success:     '#047857',
  successSoft: '#ECFDF5',
  warning:     '#B45309',
  warningSoft: '#FFFBEB',
  danger:      '#B91C1C',
  dangerSoft:  '#FEF2F2',

  // ── Básicos ───────────────────────────────────────────────────────────────
  black: '#000000',
} as const;

export type ColorKey = keyof typeof colors;
