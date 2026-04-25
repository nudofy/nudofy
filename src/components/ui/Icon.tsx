// ─── Nudofy Design System v2 · Icon ─────────────────────────────────────────
// Wrapper único sobre Lucide. Obliga a usar solo tamaños/trazos permitidos
// y deja el color alineado con el sistema.

import React from 'react';
import { icons, LucideProps } from 'lucide-react-native';
import { colors } from '@/theme';

export type IconName = keyof typeof icons;

type IconSize = 12 | 14 | 16 | 18 | 20 | 24 | 32 | 64;

type Props = {
  name: IconName;
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
} & Omit<LucideProps, 'size' | 'color'>;

export default function Icon({
  name,
  size = 20,
  color = colors.ink2,
  strokeWidth,
  ...rest
}: Props) {
  const LucideIcon = icons[name];
  if (!LucideIcon) {
    if (__DEV__) console.warn(`[Icon] "${name}" no existe en lucide-react-native`);
    return null;
  }
  // 1.5 para 24+, 1.75 por defecto — nunca 2 (rompe la elegancia)
  const sw = strokeWidth ?? (size >= 24 ? 1.5 : 1.75);
  return <LucideIcon size={size} color={color} strokeWidth={sw} {...rest} />;
}
