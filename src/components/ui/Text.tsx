// ─── Nudofy Design System v2 · Text ─────────────────────────────────────────
// Text tipado al sistema de tipografía. Úsalo SIEMPRE en vez del Text de RN.

import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { typography, colors, TypographyKey } from '@/theme';

type Variant = TypographyKey;
type ColorToken = 'ink' | 'ink2' | 'ink3' | 'ink4' | 'brand' | 'white' | 'success' | 'warning' | 'danger';

type Props = TextProps & {
  variant?: Variant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
};

export default function Text({
  variant = 'body',
  color = 'ink',
  align,
  style,
  children,
  ...rest
}: Props) {
  return (
    <RNText
      style={[
        typography[variant],
        { color: colors[color], textAlign: align },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
