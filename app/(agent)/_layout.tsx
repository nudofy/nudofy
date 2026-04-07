import { Stack } from 'expo-router';

export default function AgentLayout() {
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
    </Stack>
  );
}
