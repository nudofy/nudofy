// ─── Nudofy Design System v2 · Spacing ───────────────────────────────────────
// Escala de 4px. Usar SIEMPRE los tokens, nunca valores arbitrarios.

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  none: 0,
  sm: 6,    // chips, badges
  md: 10,   // inputs, botones, cards pequeñas
  lg: 14,   // cards estándar
  xl: 20,   // modales, sheets
  full: 999,
} as const;

export type SpaceKey = keyof typeof space;
export type RadiusKey = keyof typeof radius;
