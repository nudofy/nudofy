// ─── Nudofy Design System v2 · Badge ────────────────────────────────────────

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, space } from '@/theme';
import Text from './Text';

type Variant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

type Props = {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
};

const map: Record<Variant, { bg: string; fg: string }> = {
  neutral: { bg: colors.line2, fg: colors.ink2 },
  brand:   { bg: colors.brandSoft, fg: colors.brand },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger:  { bg: colors.dangerSoft, fg: colors.danger },
};

export default function Badge({ label, variant = 'neutral', style }: Props) {
  const { bg, fg } = map[variant];
  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      <Text variant="caption" style={{ color: fg }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[2] + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
});
