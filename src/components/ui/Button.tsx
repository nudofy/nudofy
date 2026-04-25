// ─── Nudofy Design System v2 · Button ───────────────────────────────────────

import React from 'react';
import {
  ActivityIndicator, Pressable, PressableProps,
  StyleSheet, View, ViewStyle,
} from 'react-native';
import { colors, radius, space, typography } from '@/theme';
import Text from './Text';
import Icon, { IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export default function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles[`pressed_${variant}`],
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.ink}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} size={size === 'sm' ? 16 : 20} color={labelColor(variant)} />
          )}
          <Text
            variant="bodyMedium"
            style={[styles.label, { color: labelColor(variant) }]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} size={size === 'sm' ? 16 : 20} color={labelColor(variant)} />
          )}
        </View>
      )}
    </Pressable>
  );
}

function labelColor(variant: Variant) {
  switch (variant) {
    case 'primary': return colors.white;
    case 'secondary': return colors.ink;
    case 'ghost': return colors.ink2;
    case 'danger': return colors.danger;
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },

  size_md: { height: 48, paddingHorizontal: space[5] },
  size_sm: { height: 36, paddingHorizontal: space[4] },

  variant_primary: { backgroundColor: colors.brand },
  variant_secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  variant_ghost: { backgroundColor: 'transparent' },
  variant_danger: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.dangerSoft },

  pressed_primary: { backgroundColor: colors.brandHover },
  pressed_secondary: { backgroundColor: colors.surface2 },
  pressed_ghost: { backgroundColor: colors.line2 },
  pressed_danger: { backgroundColor: colors.dangerSoft },

  disabled: { opacity: 0.45 },
});
