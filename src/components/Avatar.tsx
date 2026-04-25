// ─── Avatar · redesign v2 ───────────────────────────────────────────────────
// Iniciales sobre surface2. Sin colores aleatorios por usuario — minimalismo.

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, typography } from '@/theme';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: number;
  fontSize?: number;
  style?: object;
}

export default function Avatar({ name, size = 40, fontSize = 13, style }: AvatarProps) {
  const initials = getInitials(name || '?');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  text: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: '500',
    color: colors.ink2,
  },
});
