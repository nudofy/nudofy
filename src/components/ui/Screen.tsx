// ─── Nudofy Design System v2 · Screen ───────────────────────────────────────
// Contenedor base: SafeAreaView + fondo del sistema + status bar consistente.
// En web: centra el contenido con max-width para que no se vea estirado.

import React from 'react';
import { Platform, StatusBar, StyleSheet, View, ViewStyle } from 'react-native';
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

  const inner = (
    <>
      {Platform.OS !== 'web' && (
        <StatusBar barStyle={barStyle} backgroundColor="transparent" translucent />
      )}
      <SafeAreaView
        edges={edges}
        style={[styles.base, { backgroundColor: bg }, style]}
      >
        {children}
      </SafeAreaView>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webRoot}>
        <View style={[styles.webContainer, { backgroundColor: bg }]}>
          {inner}
        </View>
      </View>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  base: { flex: 1 },
  webRoot: {
    flex: 1,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});
