import { Stack } from 'expo-router';
import { CartProvider } from '@/contexts/CartContext';

export default function ClientLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="catalogo" />
        <Stack.Screen name="carrito" />
        <Stack.Screen name="confirmacion/[id]" />
        <Stack.Screen name="pedidos" />
        <Stack.Screen name="pedido/[id]" />
        <Stack.Screen name="perfil" />
      </Stack>
    </CartProvider>
  );
}
