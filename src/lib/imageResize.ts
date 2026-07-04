// imageResize.ts — redimensiona imágenes antes de subirlas a Supabase Storage.
// Sin esto, cada foto se sube a resolución original del móvil (varios MB),
// multiplicando el coste de almacenamiento y, sobre todo, de transferencia
// (egress) cada vez que un cliente ve el catálogo.

import { Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Redimensiona una imagen local (uri de expo-image-picker/document-picker) a un
 * ancho máximo, re-comprimida a JPEG. Devuelve la uri del fichero resultante,
 * lista para leer con fetch()/arrayBuffer() y subir a Storage.
 *
 * En web no hace nada (expo-image-manipulator no soporta redimensionar por uri
 * en ese entorno de forma fiable) — el navegador ya sirve tamaños razonables
 * y el volumen de subida manual desde web es bajo comparado con el móvil.
 */
export async function resizeForUpload(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;

  try {
    const context = ImageManipulator.manipulate(uri);
    const image = await context.resize({ width: MAX_WIDTH }).renderAsync();
    const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    // Si falla el redimensionado, subimos el original antes que bloquear al usuario.
    return uri;
  }
}
