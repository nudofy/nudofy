import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootLayoutNav() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
