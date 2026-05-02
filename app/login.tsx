// Redirige a la raíz donde está LoginScreen.
// Mantener este archivo evita rutas 404 si alguien llega a /login por un deep link antiguo.
import { Redirect } from 'expo-router';
export default function LoginRedirect() {
  return <Redirect href="/" />;
}
