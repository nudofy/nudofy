import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import NetworkBanner from '@/components/NetworkBanner';
import { supabase } from '@/lib/supabase';

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
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Procesar deep links (magic link de invitación al portal)
  useEffect(() => {
    async function handleUrl(url: string) {
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code as string | undefined;
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    }

    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

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

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
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
