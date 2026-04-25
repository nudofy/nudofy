// ─── Nudofy Design System v2 · Shadows ───────────────────────────────────────
// Muy sutiles. Preferir bordes antes que sombras.

import { ViewStyle } from 'react-native';

export const shadows = {
  none: {} as ViewStyle,

  sm: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  } satisfies ViewStyle,

  md: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  } satisfies ViewStyle,

  lg: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  } satisfies ViewStyle,
} as const;

export type ShadowKey = keyof typeof shadows;
