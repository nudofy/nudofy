// ─── Nudofy Design System v2 · Screen ───────────────────────────────────────
// Contenedor base: SafeAreaView + fondo del sistema + status bar consistente.

import React from 'react';
import { StatusBar, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';

type Props = {
  children: React.ReactNode;
  background?: 'surface' | 'white' | 'brand';
  edges?: Edge[];
  style?: ViewStyle;
};

export default function Screen({
  children,
  background = 'surface',
  edges = ['top', 'left', 'right'],
  style,
}: Props) {
  const bg =
    background === 'white' ? colors.white :
    background === 'brand' ? colors.brand :
    colors.surface;
  const barStyle = background === 'brand' ? 'light-content' : 'dark-content';
  return (
    <>
      <StatusBar barStyle={barStyle} backgroundColor="transparent" translucent />
      <SafeAreaView
        edges={edges}
        style={[styles.base, { backgroundColor: bg }, style]}
      >
        {children}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
});
