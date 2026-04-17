// ─── Nudofy Design System ────────────────────────────────────────────────────
// Brand color: #E73121 (Nudofy Red)
// Philosophy: bold, warm, minimal — red as the single dominant accent

export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brand:      '#E73121',   // Nudofy Red — color principal
  brandDark:  '#C4260F',   // pressed / hover
  brandDeep:  '#9E1D08',   // énfasis profundo, sombras
  brandLight: '#FDECEA',   // fondos tintados, chips, badges

  // ── Neutros cálidos (armonizan con el rojo) ────────────────────────────────
  bg:          '#FAFAF8',  // fondo principal de la app
  bgCard:      '#FFFFFF',  // tarjetas y modales
  surface:     '#F5F3F2',  // superficies secundarias
  border:      '#E8E5E3',  // bordes estándar
  borderLight: '#F0EDEB',  // bordes muy sutiles

  // ── Texto ──────────────────────────────────────────────────────────────────
  text:          '#1C1210',  // casi negro, tono cálido
  textSecondary: '#514E4C',  // gris oscuro cálido
  textLight:     '#8B8886',  // gris medio
  textMuted:     '#B4B2B0',  // placeholder, hints

  // ── Estados ────────────────────────────────────────────────────────────────
  green:       '#1A7645',
  greenLight:  '#E3F5EC',
  amber:       '#B86D0F',
  amberLight:  '#FEF2DF',
  red:         '#C82B1E',  // error (distinto del brand para no confundir)
  redLight:    '#FDECEB',

  // ── Básicos ────────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  dark:  '#111827',

  // ── Aliases de compatibilidad (no usar en código nuevo) ───────────────────
  purple:      '#E73121',  // → brand
  purpleLight: '#FDECEA',  // → brandLight
  purpleDark:  '#C4260F',  // → brandDark
} as const;

export type ColorKey = keyof typeof colors;
