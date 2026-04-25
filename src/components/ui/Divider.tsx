import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors } from '@/theme';

export default function Divider({
  color = colors.line,
  style,
}: { color?: string; style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: color }, style]} />;
}
