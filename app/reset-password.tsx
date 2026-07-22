// reset-password.tsx — Pantalla para establecer nueva contraseña
// Se abre desde el deep link nudofy:///reset-password#access_token=...&type=recovery

import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, TextInput, View, Image,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { colors, radius, space, typography } from '@/theme';
import { Button, Icon, Screen, Text } from '@/components/ui';

type Status = 'loading' | 'form' | 'success' | 'error';

function parseHashParams(url: string): Record<string, string> {
  const hash = url.split('#')[1];
  if (!hash) return {};
  return Object.fromEntries(new URLSearchParams(hash).entries());
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation('auth');

  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState<'password' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Al montar: intentar establecer sesión desde el hash del deep link
  useEffect(() => {
    async function init(url: string | null) {
      if (!url) { setStatus('error'); return; }

      const params = parseHashParams(url);
      const accessToken = params['access_token'];
      const refreshToken = params['refresh_token'];
      const type = params['type'];

      if (type === 'recovery' && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.warn('[reset-password] setSession error:', error.message);
          setStatus('error');
          return;
        }
        setStatus('form');
        return;
      }

      // Si ya hay sesión activa con type=recovery (onAuthStateChange la procesó antes)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('form');
        return;
      }

      setStatus('error');
    }

    // 1. URL inicial (app estaba cerrada)
    Linking.getInitialURL().then(url => {
      if (url?.includes('reset-password')) {
        init(url);
      } else {
        // 2. Puede que _layout ya procesó el token y hay sesión
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) setStatus('form');
          else setStatus('error');
        });
      }
    });

    // 3. URL en caliente (app estaba abierta en segundo plano)
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url?.includes('reset-password')) init(url);
    });
    return () => sub.remove();
  }, []);

  async function handleSave() {
    setError(null);
    if (password.length < 8) {
      setError(t('reset_password.min_length_error'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('reset_password.mismatch_error'));
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(t('reset_password.update_error'));
      return;
    }
    setStatus('success');
  }

  // ── Pantalla: cargando ───────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Screen background="brand" edges={['top']}>
        <View style={styles.center}>
          <Text variant="body" color="white" align="center">{t('reset_password.verifying_link')}</Text>
        </View>
      </Screen>
    );
  }

  // ── Pantalla: enlace inválido ────────────────────────────────────────────
  if (status === 'error') {
    return (
      <Screen background="brand" edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.brandName} allowFontScaling={false}>nudofy</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.iconRow}>
              <Icon name="CircleAlert" size={32} color={colors.danger} />
            </View>
            <Text variant="heading" align="center" style={{ marginBottom: space[2] }}>
              {t('reset_password.expired_title')}
            </Text>
            <Text variant="small" color="ink3" align="center" style={{ marginBottom: space[6] }}>
              {t('reset_password.expired_body')}
            </Text>
            <Button label={t('reset_password.back_to_home')} onPress={() => router.replace('/')} fullWidth />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ── Pantalla: contraseña actualizada ────────────────────────────────────
  if (status === 'success') {
    return (
      <Screen background="brand" edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.brandName} allowFontScaling={false}>nudofy</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.iconRow}>
              <View style={styles.successIcon}>
                <Icon name="Check" size={24} color={colors.success} />
              </View>
            </View>
            <Text variant="heading" align="center" style={{ marginBottom: space[2] }}>
              {t('reset_password.success_title')}
            </Text>
            <Text variant="small" color="ink3" align="center" style={{ marginBottom: space[6] }}>
              {t('reset_password.success_body')}
            </Text>
            <Button label={t('reset_password.enter_app')} onPress={() => router.replace('/')} fullWidth />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ── Pantalla: formulario ─────────────────────────────────────────────────
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
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.brandName} allowFontScaling={false}>nudofy</Text>
          </View>

          <View style={styles.card}>
            <Text variant="heading" style={{ marginBottom: 4 }}>{t('reset_password.title')}</Text>
            <Text variant="small" color="ink3" style={{ marginBottom: space[6] }}>
              {t('reset_password.subtitle')}
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Icon name="CircleAlert" size={16} color={colors.danger} />
                <Text variant="small" color="danger" style={{ flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Nueva contraseña */}
            <Text variant="caption" color="ink3" style={styles.fieldLabel}>{t('reset_password.new_password_label')}</Text>
            <View style={[styles.field, focus === 'password' && styles.fieldFocus]}>
              <Icon name="Lock" size={18} color={focus === 'password' ? colors.brand : colors.ink4} />
              <TextInput
                style={styles.input}
                placeholder={t('reset_password.new_password_placeholder')}
                placeholderTextColor={colors.ink4}
                value={password}
                onChangeText={v => { setPassword(v); setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                onFocus={() => setFocus('password')}
                onBlur={() => setFocus(null)}
              />
              <Button
                label={showPassword ? t('reset_password.hide') : t('reset_password.show')}
                variant="ghost"
                onPress={() => setShowPassword(!showPassword)}
                style={{ paddingHorizontal: space[2] }}
              />
            </View>

            {/* Confirmar contraseña */}
            <Text variant="caption" color="ink3" style={[styles.fieldLabel, { marginTop: space[3] }]}>
              {t('reset_password.confirm_password_label')}
            </Text>
            <View style={[styles.field, focus === 'confirm' && styles.fieldFocus]}>
              <Icon name="Lock" size={18} color={focus === 'confirm' ? colors.brand : colors.ink4} />
              <TextInput
                style={styles.input}
                placeholder={t('reset_password.confirm_password_placeholder')}
                placeholderTextColor={colors.ink4}
                value={confirmPassword}
                onChangeText={v => { setConfirmPassword(v); setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                onFocus={() => setFocus('confirm')}
                onBlur={() => setFocus(null)}
                onSubmitEditing={handleSave}
              />
            </View>

            <Button
              label={t('reset_password.save_password')}
              onPress={handleSave}
              loading={saving}
              fullWidth
              style={{ marginTop: space[5] }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.brand,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
  },
  hero: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
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
  logo: { width: 52, height: 52, borderRadius: 14 },
  brandName: {
    fontFamily: typography.title.fontFamily,
    fontSize: 32,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -0.8,
    color: colors.white,
    marginTop: space[3],
    includeFontPadding: false,
  },
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
  iconRow: {
    alignItems: 'center',
    marginBottom: space[4],
  },
  successIcon: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: colors.successSoft ?? '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
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
  fieldLabel: {
    letterSpacing: 0.5,
    fontWeight: '600',
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
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
  },
});
