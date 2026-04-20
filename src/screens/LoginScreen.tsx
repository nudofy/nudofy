import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';

const BRAND = '#E73121';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Por favor introduce tu email y contraseña');
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

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Recuperar contraseña', 'Introduce tu email primero y pulsa "¿Olvidaste tu contraseña?"');
      return;
    }
    const { error } = await resetPassword(email.trim());
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Email enviado', `Hemos enviado un enlace de recuperación a ${email.trim()}`);
    }
  }

  return (
    <View style={styles.root}>
      {/* ── Hero rojo ── */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.wordmark}>nudofy</Text>
            <Text style={styles.tagline}>Catálogos y ventas para{'\n'}agentes comerciales</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Formulario blanco ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formOuter}
      >
        <ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Accede con tus credenciales para continuar</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={[styles.input, email.length > 0 && styles.inputActive]}
              placeholder="tu@email.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 48 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnPrimaryText}>Entrar</Text>
            }
          </TouchableOpacity>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND,
  },

  // ── Hero rojo ──
  hero: {
    flex: 2,
    backgroundColor: BRAND,
  },
  heroSafe: {
    flex: 1,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    gap: 0,
  },
  logoImg: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  wordmark: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 19,
  },

  // ── Formulario blanco ──
  formOuter: {
    flex: 3,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  formScroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 24,
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: colors.redLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.red,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputActive: {
    borderColor: colors.brand,
  },
  inputWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 16,
  },
  forgot: {
    fontSize: 13,
    color: colors.brand,
    textAlign: 'right',
    marginTop: 8,
  },
  btnPrimary: {
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 'auto',
    paddingTop: 20,
  },
  footerLink: {
    fontSize: 11,
    color: colors.textMuted,
  },
  footerSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#dddddd',
  },
});
