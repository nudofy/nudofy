import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';

// Logo SVG como componente React Native (usando View shapes)
function NudofyLogo() {
  return (
    <View style={styles.logoMark}>
      {/* Punto izquierdo */}
      <View style={[styles.logoDot, { left: 8, top: 17 }]} />
      {/* Punto superior derecho */}
      <View style={[styles.logoDot, { right: 6, top: 5 }]} />
      {/* Punto inferior derecho */}
      <View style={[styles.logoDot, { right: 6, bottom: 5 }]} />
    </View>
  );
}

export default function SplashScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <NudofyLogo />
        <Text style={styles.appName}>Nudofy</Text>
        <Text style={styles.appSlogan}>Catalogs and sales</Text>

        {/* Dots de onboarding (preparados para futuro) */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      {/* Botón */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Entrar</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => Linking.openURL('https://nudofy.com/quienes-somos')}>
          <Text style={styles.footerLink}>Quiénes somos</Text>
        </TouchableOpacity>
        <View style={styles.footerSep} />
        <TouchableOpacity onPress={() => Linking.openURL('mailto:info@nudofy.com')}>
          <Text style={styles.footerLink}>Contacto</Text>
        </TouchableOpacity>
        <View style={styles.footerSep} />
        <TouchableOpacity onPress={() => Linking.openURL('https://nudofy.com')}>
          <Text style={styles.footerLink}>nudofy.com</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 24,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.purple,
    marginBottom: 20,
    position: 'relative',
  },
  logoDot: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.white,
  },
  appName: {
    fontSize: 32,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  appSlogan: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 240,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 32,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.purple,
  },
  actions: {
    paddingHorizontal: 28,
    paddingBottom: 12,
    gap: 12,
  },
  btnPrimary: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.purple,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 28,
    paddingVertical: 16,
    paddingBottom: 28,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
  },
  footerLink: {
    fontSize: 12,
    color: colors.textMuted,
  },
  footerSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#d0d0d0',
  },
});
