import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(agent)" />
      <Stack.Screen name="(client)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
