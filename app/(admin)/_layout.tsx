import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="agentes" />
      <Stack.Screen name="agente/[id]" />
      <Stack.Screen name="empresa/[id]" />
      <Stack.Screen name="planes" />
      <Stack.Screen name="facturacion" />
      <Stack.Screen name="configuracion" />
    </Stack>
  );
}
