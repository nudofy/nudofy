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
  Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';

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

    // La navegación la gestiona el AuthContext en el layout raíz
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
      Alert.alert(
        'Email enviado',
        `Hemos enviado un enlace de recuperación a ${email.trim()}`,
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Volver */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          {/* Título */}
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Accede con tus credenciales para continuar</Text>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Email */}
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

          {/* Contraseña */}
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
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          {/* Botón entrar */}
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnPrimaryText}>Entrar</Text>
            )}
          </TouchableOpacity>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.white },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28 },
  backBtn: {
    marginBottom: 32,
    alignSelf: 'flex-start' },
  backText: {
    fontSize: 14,
    color: colors.purple },
  title: {
    fontSize: 26,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 6 },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 36,
    lineHeight: 20 },
  errorBox: {
    backgroundColor: colors.redLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16 },
  errorText: {
    fontSize: 13,
    color: colors.red },
  formGroup: {
    marginBottom: 18 },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 7 },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white },
  inputActive: {
    borderColor: colors.purple },
  inputWrap: {
    position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center' },
  eyeIcon: {
    fontSize: 16 },
  forgot: {
    fontSize: 13,
    color: colors.purple,
    textAlign: 'right',
    marginTop: 8 },
  btnPrimary: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.purple,
    alignItems: 'center',
    marginTop: 8 },
  btnDisabled: {
    opacity: 0.7 },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 'auto',
    paddingTop: 24 },
  footerLink: {
    fontSize: 12,
    color: colors.textMuted },
  footerSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#dddddd' } });
