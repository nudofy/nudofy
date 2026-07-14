import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout() {
  const { session, profile, loading } = useAuth();

  // Mientras carga la sesión/perfil, no montamos las pantallas admin
  // (evita que disparen sus queries antes de conocer el rol).
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Guard de rol: solo nudofy_admin puede entrar al panel. Cualquier otro
  // usuario (o sesión ausente) se redirige fuera antes de renderizar nada.
  if (!session || profile?.role !== 'nudofy_admin') {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="agentes" />
      <Stack.Screen name="agente/[id]" />
      <Stack.Screen name="agente/[id]/pedidos" />
      <Stack.Screen name="empresa/[id]" />
      <Stack.Screen name="planes" />
      <Stack.Screen name="facturacion" />
      <Stack.Screen name="configuracion" />
    </Stack>
  );
}
