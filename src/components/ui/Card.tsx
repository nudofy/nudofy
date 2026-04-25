// ─── Nudofy Design System v2 · Card ─────────────────────────────────────────

import React from 'react';
import {
  Pressable, PressableProps, View, ViewProps,
  StyleSheet, ViewStyle,
} from 'react-native';
import { colors, radius, space } from '@/theme';

type BaseProps = {
  padding?: keyof typeof paddingMap;
  style?: ViewStyle;
  children?: React.ReactNode;
};

const paddingMap = {
  none: 0,
  sm: space[3],
  md: space[4],
  lg: space[5],
} as const;

export function Card({
  padding = 'lg',
  style,
  children,
  ...rest
}: BaseProps & Omit<ViewProps, 'style' | 'children'>) {
  return (
    <View style={[styles.base, { padding: paddingMap[padding] }, style]} {...rest}>
      {children}
    </View>
  );
}

export function PressableCard({
  padding = 'lg',
  style,
  children,
  ...rest
}: BaseProps & Omit<PressableProps, 'style' | 'children'>) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { padding: paddingMap[padding] },
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { backgroundColor: colors.surface },
});

export default Card;
