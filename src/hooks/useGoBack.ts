import { useRouter } from 'expo-router';

// router.back() no hace nada si no hay historial de navegación en memoria —
// en web, refrescar la página lo vacía, así que el botón "volver" quedaba
// muerto en cualquier pantalla a la que se llegara tras un refresh. Este
// hook comprueba primero si hay a dónde volver, y si no, navega a una
// pantalla de referencia conocida en vez de no hacer nada.
export function useGoBack(fallback: string) {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as any);
    }
  };
}
