import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Paleta de colores para los avatares (mismos que los mockups)
const AVATAR_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FAECE7', text: '#712B13' },
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FCEBEB', text: '#791F1F' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return hash % AVATAR_COLORS.length;
}

interface AvatarProps {
  name: string;
  size?: number;
  fontSize?: number;
  style?: object;
}

export default function Avatar({ name, size = 40, fontSize = 13, style }: AvatarProps) {
  const idx = getColorIndex(name);
  const { bg, text } = AVATAR_COLORS[idx];
  const initials = getInitials(name);

  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      style,
    ]}>
      <Text style={[styles.text, { fontSize, color: text }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '500',
  },
});
