// ─── LoginScreen · redesign v3 ──────────────────────────────────────────────
// Panel rojo superior + card blanca elevada. Inputs outlined, limpios.
// Mata el autofill amarillo en web.

import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Linking,
  Platform, Pressable, ScrollView, StyleSheet,
  TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { colors, radius, space, typography } from '@/theme';
import { Button, Icon, Screen, Text } from '@/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<'email' | 'password' | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Introduce tu email y contraseña');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  async function handleForgot() {
    if (!email.trim()) {
      toast.info('Introduce tu email y vuelve a pulsar "¿Olvidaste?"');
      return;
    }
    const { error } = await resetPassword(email.trim());
    if (error) toast.error(error);
    else toast.success(`Enlace de recuperación enviado a ${email.trim()}`);
  }

  return (
    <Screen background="brand" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero rojo: logo + marca ── */}
          <View style={styles.hero}>
            {/* Círculos decorativos sutiles */}
            <View style={styles.blob1} />
            <View style={styles.blob2} />

            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName} allowFontScaling={false}>nudofy</Text>
            <Text style={styles.brandTagline}>
              Catálogos y ventas para agentes comerciales
            </Text>
          </View>

          {/* ── Card blanca flotante ── */}
          <View style={styles.card}>
            <Text variant="heading" style={styles.cardTitle}>Bienvenido</Text>
            <Text variant="small" color="ink3" style={styles.cardSubtitle}>
              Accede con tus credenciales para continuar
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Icon name="CircleAlert" size={16} color={colors.danger} />
                <Text variant="small" color="danger" style={{ flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <Text variant="caption" color="ink3" style={styles.fieldLabel}>CORREO ELECTRÓNICO</Text>
            <View style={[
              styles.field,
              focus === 'email' && styles.fieldFocus,
              !!error && !email.trim() && styles.fieldError,
            ]}>
              <Icon name="Mail" size={18} color={focus === 'email' ? colors.brand : colors.ink4} />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={colors.ink4}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setFocus('email')}
                onBlur={() => setFocus(null)}
              />
            </View>

            {/* Password */}
            <View style={styles.passwordLabelRow}>
              <Text variant="caption" color="ink3" style={styles.fieldLabel}>CONTRASEÑA</Text>
              <Pressable onPress={handleForgot} hitSlop={8}>
                <Text variant="caption" color="brand" style={{ fontWeight: '600' }}>
                  ¿Olvidaste?
                </Text>
              </Pressable>
            </View>
            <View style={[
              styles.field,
              focus === 'password' && styles.fieldFocus,
              !!error && !password.trim() && styles.fieldError,
            ]}>
              <Icon name="Lock" size={18} color={focus === 'password' ? colors.brand : colors.ink4} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.ink4}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setFocus('password')}
                onBlur={() => setFocus(null)}
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                style={styles.showToggle}
              >
                <Text variant="caption" color="ink2" style={{ fontWeight: '600' }}>
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </Text>
              </Pressable>
            </View>

            <Button
              label="Entrar"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={{ marginTop: space[5] }}
            />

            {/* Footer dentro de la card */}
            <View style={styles.footer}>
              <Pressable onPress={() => Linking.openURL('https://nudofy.com/quienes-somos')} hitSlop={6}>
                <Text variant="small" color="ink3">Quiénes somos</Text>
              </Pressable>
              <View style={styles.dot} />
              <Pressable onPress={() => Linking.openURL('mailto:info@nudofy.com')} hitSlop={6}>
                <Text variant="small" color="ink3">Contacto</Text>
              </Pressable>
              <View style={styles.dot} />
              <Pressable onPress={() => Linking.openURL('https://nudofy.com')} hitSlop={6}>
                <Text variant="small" color="ink3">nudofy.com</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const HERO_HEIGHT = 300;

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.brand,
  },

  // ── Hero ──
  hero: {
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: -80, right: -60,
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  blob2: {
    position: 'absolute',
    bottom: -40, left: -50,
    width: 160, height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoWrap: {
    width: 72, height: 72,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: {
    width: 52, height: 52,
    borderRadius: 14,
  },
  brandName: {
    fontFamily: typography.title.fontFamily,
    fontSize: 36,
    lineHeight: 48,
    fontWeight: '600',
    letterSpacing: -0.8,
    color: colors.white,
    marginTop: space[4],
    paddingVertical: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  brandTagline: {
    ...typography.small,
    color: 'rgba(255,255,255,0.85)',
    marginTop: space[1],
    textAlign: 'center',
  },

  // ── Card ──
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: space[6],
    paddingTop: space[7],
    paddingBottom: space[8],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    color: colors.ink,
  },
  cardSubtitle: {
    marginTop: 4,
    marginBottom: space[6],
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: colors.dangerSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    borderRadius: radius.sm,
    padding: space[3],
    marginBottom: space[4],
  },

  // ── Campos ──
  fieldLabel: {
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: space[2],
    marginTop: space[3],
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[3],
    marginBottom: space[2],
  },
  field: {
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  fieldFocus: {
    borderColor: colors.brand,
    backgroundColor: colors.white,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    padding: 0,
    // @ts-ignore — solo web
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },

  showToggle: {
    paddingHorizontal: space[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    marginTop: space[8],
  },
  dot: {
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: colors.ink4,
  },
});
