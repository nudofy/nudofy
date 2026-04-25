// ─── Nudofy Design System v2 · Typography ────────────────────────────────────
// Familia única: Inter. Solo 3 pesos: 400 / 500 / 600.

import { Platform, TextStyle } from 'react-native';

// Usar la familia del sistema en iOS/Android/Web por defecto.
// Si se carga Inter con expo-font, reemplazar aquí.
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}) as string;

export const weights = {
  regular: '400' as TextStyle['fontWeight'],
  medium:  '500' as TextStyle['fontWeight'],
  semi:    '600' as TextStyle['fontWeight'],
};

export const typography = {
  display: {
    fontFamily,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: weights.semi,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  title: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: weights.semi,
    letterSpacing: -0.3,
  } satisfies TextStyle,

  heading: {
    fontFamily,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: weights.semi,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  body: {
    fontFamily,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: weights.regular,
  } satisfies TextStyle,

  bodyMedium: {
    fontFamily,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: weights.medium,
  } satisfies TextStyle,

  small: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: weights.regular,
  } satisfies TextStyle,

  smallMedium: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: weights.medium,
  } satisfies TextStyle,

  caption: {
    fontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: weights.medium,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
