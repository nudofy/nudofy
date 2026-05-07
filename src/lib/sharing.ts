// ─── Nudofy · src/lib/sharing.ts ────────────────────────────────────────────
// Wrapper multiplataforma para compartir / descargar archivos.
// En web: abre la URL en nueva pestaña o dispara descarga.
// En nativo (iOS/Android): usa expo-file-system + expo-sharing.

import { Platform } from 'react-native';

export interface ShareFileOptions {
  /** URL pública o firmada del archivo */
  url: string;
  /** Nombre de archivo sugerido (ej. "factura-001.pdf") */
  filename: string;
  mimeType?: string;
  /** Título del diálogo nativo */
  dialogTitle?: string;
}

/**
 * Comparte o descarga un archivo según la plataforma.
 * Devuelve true si tuvo éxito, false si se canceló o falló.
 */
export async function shareFile(opts: ShareFileOptions): Promise<boolean> {
  const { url, filename, mimeType = 'application/pdf', dialogTitle } = opts;

  if (Platform.OS === 'web') {
    // En web: crear un <a> temporal y hacer clic para descargar
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch {
      // Fallback: abrir en nueva pestaña
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
  }

  // Nativo: descargar a caché y compartir
  try {
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');

    const localUri = (FileSystem.cacheDirectory ?? '') + filename;
    const { uri } = await FileSystem.downloadAsync(url, localUri);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType, dialogTitle });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
