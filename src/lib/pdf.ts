// ─── Nudofy · src/lib/pdf.ts ─────────────────────────────────────────────────
// Wrapper multiplataforma para generar y compartir PDFs desde HTML.
// En web: abre una nueva ventana con el HTML y lanza el diálogo de impresión
//         (el usuario puede guardar como PDF desde ahí).
// En nativo: usa expo-print para generar el PDF y expo-sharing para compartirlo.

import { Platform } from 'react-native';

export interface PrintAndShareOptions {
  html: string;
  filename?: string;
  dialogTitle?: string;
}

/**
 * Genera un PDF a partir de HTML y lo comparte/imprime según la plataforma.
 * Lanza un error si falla (manéjalo en el caller con try/catch).
 */
export async function printAndShare(opts: PrintAndShareOptions): Promise<void> {
  const { html, filename = 'documento.pdf', dialogTitle } = opts;

  if (Platform.OS === 'web') {
    // Abrir nueva ventana con el HTML y lanzar diálogo de impresión
    const win = window.open('', '_blank');
    if (!win) {
      throw new Error('El navegador bloqueó la ventana emergente. Permítela para continuar.');
    }
    win.document.write(html);
    win.document.close();
    // Pequeño delay para que el navegador termine de renderizar
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
    return;
  }

  // Nativo: expo-print + expo-sharing
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: dialogTitle ?? filename,
    });
  }
}
