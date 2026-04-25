// ─── Nudofy Design System v2 · Input ────────────────────────────────────────

import React, { useState } from 'react';
import {
  TextInput, TextInputProps, StyleSheet, View, ViewStyle,
} from 'react-native';
import { colors, radius, space, typography } from '@/theme';
import Text from './Text';
import Icon, { IconName } from './Icon';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
};

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ gap: space[2] }, containerStyle]}>
      {label && (
        <Text variant="caption" color="ink3">{label}</Text>
      )}
      <View
        style={[
          styles.wrapper,
          focused && styles.wrapperFocused,
          error && styles.wrapperError,
        ]}
      >
        {leftIcon && (
          <Icon name={leftIcon} size={20} color={focused ? colors.ink2 : colors.ink4} />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.ink4}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {rightIcon && (
          <Icon
            name={rightIcon}
            size={20}
            color={colors.ink3}
            onPress={onRightIconPress}
          />
        )}
      </View>
      {(error || hint) && (
        <Text variant="small" color={error ? 'danger' : 'ink3'}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  wrapperFocused: {
    backgroundColor: colors.white,
    borderColor: colors.ink,
  },
  wrapperError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    padding: 0,
  },
});
