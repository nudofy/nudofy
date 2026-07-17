// ─── Nudofy · src/lib/csvImport.ts ──────────────────────────────────────────
// Helpers compartidos por las pantallas de importación CSV (catálogo,
// clientes, pedidos): lectura de fichero con fallback de encoding y
// normalización de cabeceras.

import { Platform } from 'react-native';

export async function readFileText(uri: string): Promise<string> {
  let buffer: ArrayBuffer;

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    buffer = await response.arrayBuffer();
  } else {
    const FileSystem = await import('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    buffer = bytes.buffer;
  }

  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (utf8.includes('�')) {
    return new TextDecoder('windows-1252').decode(buffer);
  }
  return utf8;
}

export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9_]/g, '_');
}
