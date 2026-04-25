import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Text } from '@/components/ui';
import { LoginSchema, validate } from '@/lib/validation';

const BRAND = '#E73121';
const BRAND_DARK = '#C4260F';

export default function SplashScreen() {
  const { signIn, resetPassword } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    const v = validate(LoginSchema, { email, password });
    if (!v.ok) {
      setError(v.firstError);
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signIn(v.data.email, v.data.password);
    if (error) {
      setError(error);
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email.trim()) {
      toast.info('Introduce tu email y vuelve a pulsar "¿Olvidaste tu contraseña?"');
      return;
    }
    const { error } = await resetPassword(email.trim());
    if (error) toast.error(error);
    else toast.success(`Enlace de recuperación enviado a ${email.trim()}`);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Hero ── */}
            <View style={styles.hero}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
              <Text style={styles.wordmark}>nudofy</Text>
              <Text style={styles.tagline}>Catálogos y ventas para agentes comerciales</Text>
            </View>

            {/* ── Formulario ── */}
            <View style={styles.form}>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>

              <Pressable onPress={handleForgot} hitSlop={8} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={styles.btnText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Footer ── */}
            <View style={styles.footer}>
              <Pressable onPress={() => Linking.openURL('https://nudofy.com/quienes-somos')} hitSlop={6}>
                <Text style={styles.footerLink}>Quiénes somos</Text>
              </Pressable>
              <View style={styles.footerSep} />
              <Pressable onPress={() => Linking.openURL('mailto:info@nudofy.com')} hitSlop={6}>
                <Text style={styles.footerLink}>Contacto</Text>
              </Pressable>
              <View style={styles.footerSep} />
              <Pressable onPress={() => Linking.openURL('https://nudofy.com')} hitSlop={6}>
                <Text style={styles.footerLink}>nudofy.com</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 48,
  },
  logoImg: {
    width: 90,
    height: 90,
  },
  wordmark: {
    marginTop: 16,
    fontSize: 32,
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 220,
  },

  // ── Formulario ──
  form: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#ffffff',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 16,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 4,
  },
  forgotText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
  },
  btn: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: BRAND_DARK,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  errorBox: {
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 13,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 40,
  },
  footerLink: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
  },
  footerSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
});
