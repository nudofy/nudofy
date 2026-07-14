import { useEffect } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import NetworkBanner from '@/components/NetworkBanner';
import { supabase } from '@/lib/supabase';
import { initSentry, setSentryUser, clearSentryUser } from '@/lib/sentry';
import { registerPushToken, unregisterPushToken } from '@/lib/pushNotifications';

// Inicializar Sentry al arrancar la app
initSentry();

// ─── CSS global (solo web) — mata el amarillo del autofill del navegador ───
// Se inyecta a nivel de módulo, antes del primer render, para ganarle a Chrome.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const id = '__nudofy_global_css';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active,
      textarea:-webkit-autofill,
      select:-webkit-autofill {
        -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
        box-shadow: 0 0 0 1000px #ffffff inset !important;
        -webkit-text-fill-color: #0A0A0A !important;
        caret-color: #0A0A0A !important;
        transition: background-color 9999s ease-in-out 0s !important;
        background-clip: content-box !important;
      }
      input, textarea, select {
        outline: none !important;
        background-color: transparent;
      }
      /* Scrollbars sutiles en web */
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: #E0E0E0; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #C0C0C0; }
    `;
    document.head.appendChild(style);
  }
}

function RootLayoutNav() {
  const { session, profile, loading, profileError, retryProfile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Procesar deep links (magic link de invitación al portal)
  useEffect(() => {
    async function handleUrl(url: string) {
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code as string | undefined;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.warn('[DeepLink] exchangeCodeForSession error:', error.message);
      }
    }

    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Sincronizar usuario con Sentry y registrar push token al cambiar sesión
  useEffect(() => {
    if (session?.user) {
      setSentryUser(session.user.id, session.user.email);
      registerPushToken(session.user.id);
    } else {
      clearSentryUser();
    }
  }, [session]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAgentGroup = segments[0] === '(agent)';
    const inClientGroup = segments[0] === '(client)';
    const inAdminGroup = segments[0] === '(admin)';

    if (!session) {
      // Sin sesión → splash
      if (inAuthGroup || inAgentGroup || inClientGroup || inAdminGroup) {
        router.replace('/');
      }
      return;
    }

    // Con sesión → redirigir según rol
    if (profile?.role === 'agent' || profile?.role === 'company_admin') {
      if (!inAgentGroup) router.replace('/(agent)/home');
    } else if (profile?.role === 'client') {
      if (!inClientGroup) router.replace('/(client)/home');
    } else if (profile?.role === 'nudofy_admin') {
      if (!inAdminGroup) router.replace('/(admin)/dashboard');
    }
  }, [session, profile, loading, segments]);

  // Hay sesión pero el perfil no cargó tras varios reintentos: mostrar una
  // pantalla de recuperación en vez de dejar la app colgada sin enrutado.
  if (session && profileError) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>No hemos podido cargar tu cuenta</Text>
        <Text style={styles.errorBody}>
          Comprueba tu conexión a internet e inténtalo de nuevo.
        </Text>
        <Pressable style={styles.retryBtn} onPress={retryProfile}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </Pressable>
        <Pressable style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(agent)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(admin)" />
      </Stack>
      <NetworkBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>
          <ToastProvider>
            <RootLayoutNav />
          </ToastProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0A0A',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#0A0A0A',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginBottom: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logoutBtnText: {
    color: '#999',
    fontSize: 14,
  },
});
