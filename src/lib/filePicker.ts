// ─── Nudofy · src/lib/filePicker.ts ─────────────────────────────────────────
// Wrapper multiplataforma para seleccionar archivos.
// En web: usa <input type="file"> del DOM.
// En nativo: usa expo-document-picker.

import { Platform } from 'react-native';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface PickFileOptions {
  /** MIME type, ej. 'application/pdf', 'text/csv', 'image/*' */
  type?: string;
  multiple?: boolean;
}

/** Selección de un único archivo. Devuelve null si cancela. */
export async function pickFile(opts: PickFileOptions = {}): Promise<PickedFile | null> {
  const files = await pickFiles({ ...opts, multiple: false });
  return files?.[0] ?? null;
}

/** Selección de uno o varios archivos. Devuelve null si cancela. */
export async function pickFiles(opts: PickFileOptions = {}): Promise<PickedFile[] | null> {
  const { type = '*/*', multiple = false } = opts;

  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = type;
      if (multiple) input.multiple = true;

      input.onchange = () => {
        const fileList = input.files;
        if (!fileList || fileList.length === 0) { resolve(null); return; }

        const result: PickedFile[] = Array.from(fileList).map(file => ({
          uri: URL.createObjectURL(file),
          name: file.name,
          mimeType: file.type || type,
          size: file.size,
        }));
        resolve(result);
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // Nativo: expo-document-picker
  try {
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type,
      multiple,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return null;

    return result.assets.map(asset => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? type,
      size: asset.size,
    }));
  } catch {
    return null;
  }
}
