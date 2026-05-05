import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AgentProvider, useAgentContext } from '@/contexts/AgentContext';

function AgentLayoutNav() {
  const { agent, loading, trialExpired } = useAgentContext();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading || !agent) return;
    const onTrialScreen = segments[1] === 'trial-vencido';
    const onDpaScreen   = segments[1] === 'dpa-aceptar';

    if (trialExpired && !onTrialScreen) {
      router.replace('/(agent)/trial-vencido');
      return;
    }
    if (!agent.accepted_dpa_at && !onDpaScreen && !onTrialScreen) {
      router.replace('/(agent)/dpa-aceptar');
    }
  }, [agent, loading, trialExpired, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="clientes" />
      <Stack.Screen name="cliente/[id]" />
      <Stack.Screen name="cliente/nuevo" />
      <Stack.Screen name="catalogos" />
      <Stack.Screen name="proveedor/[id]" />
      <Stack.Screen name="catalogo/[id]" />
      <Stack.Screen name="producto/[id]" />
      <Stack.Screen name="pedidos" />
      <Stack.Screen name="pedido/nuevo" />
      <Stack.Screen name="pedido/[id]" />
      <Stack.Screen name="mas" />
      <Stack.Screen name="tarifas" />
      <Stack.Screen name="dpa-aceptar" options={{ gestureEnabled: false }} />
      <Stack.Screen name="trial-vencido" options={{ gestureEnabled: false }} />
      <Stack.Screen name="notificaciones" />
      <Stack.Screen name="mis-facturas" />
    </Stack>
  );
}

export default function AgentLayout() {
  return (
    <AgentProvider>
      <AgentLayoutNav />
    </AgentProvider>
  );
}
