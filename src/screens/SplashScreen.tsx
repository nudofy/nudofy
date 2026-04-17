import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const BRAND = '#E73121';

export default function SplashScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>nudofy</Text>
          <Text style={styles.tagline}>Catálogos y ventas para agentes comerciales</Text>

          {/* Dots */}
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* ── CTA ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.push('/login')}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>Entrar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND,
  },
  safe: {
    flex: 1,
  },
  logoImg: {
    width: 120,
    height: 120,
  },

  // ── Hero ──
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 16,
    gap: 0,
  },
  wordmark: {
    marginTop: 20,
    fontSize: 34,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 220,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 36,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#ffffff',
  },

  // ── CTA ──
  actions: {
    paddingHorizontal: 28,
    paddingBottom: 12,
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    color: BRAND,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 28,
    paddingBottom: 24,
    paddingTop: 8,
  },
  footerLink: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  footerSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
});
