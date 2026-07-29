// secureStorage.ts — Adaptador de almacenamiento para la sesión de Supabase.
//
// AUDITORÍA DE SEGURIDAD (28 jul 2026): antes de esto, src/lib/supabase.ts
// guardaba la sesión (access_token + refresh_token) en AsyncStorage sin
// cifrar. AsyncStorage en RN es solo un fichero/SQLite dentro del sandbox de
// la app: en Android puede acabar en copias de seguridad (adb backup / cloud
// backup) o quedar legible si el dispositivo está rooteado; en iOS no está
// respaldado por el Keychain. Si alguien accede al almacenamiento del
// dispositivo (backup, malware con permisos, dispositivo perdido sin PIN),
// puede leer el token de sesión de un agente/cliente y suplantarlo contra
// Supabase.
//
// Fix: usar expo-secure-store (Keychain en iOS, Keystore-backed
// EncryptedSharedPreferences en Android) — ya estaba como dependencia
// instalada pero sin usar. SecureStore limita cada valor a ~2048 bytes, y
// una sesión de Supabase completa (JWT + refresh_token + metadata de
// usuario) suele superarlo, así que aquí se trocea el valor en varias claves
// y se reconstruye al leer. No hace falta añadir una librería de cifrado
// aparte: el cifrado en reposo lo da el propio Keychain/Keystore del SO.
//
// En web no existe Keychain/Keystore — expo-secure-store no funciona ahí
// (lanza error), así que en esa plataforma se mantiene AsyncStorage tal
// cual (mismo criterio que la documentación oficial de Supabase + Expo).

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHUNK_SIZE = 1800; // margen bajo el límite de ~2048 bytes de SecureStore
const CHUNK_COUNT_SUFFIX = '_chunks';

function sanitizeKey(key: string): string {
  // SecureStore solo admite [A-Za-z0-9._-]; supabase-js ya genera claves de
  // ese tipo (ej. "sb-<ref>-auth-token"), pero se normaliza por robustez.
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function getChunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

const chunkedSecureStore = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = sanitizeKey(rawKey);
    const chunkCount = await getChunkCount(key);
    if (chunkCount > 0) {
      const parts: string[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const part = await SecureStore.getItemAsync(`${key}_${i}`);
        if (part == null) return null; // chunk corrupto/incompleto
        parts.push(part);
      }
      return parts.join('');
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(rawKey: string, value: string): Promise<void> {
    const key = sanitizeKey(rawKey);
    // Limpiar cualquier estado previo (single-value o chunks) antes de escribir
    await chunkedSecureStore.removeItem(rawKey);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const numChunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < numChunks; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_${i}`, chunk);
    }
    await SecureStore.setItemAsync(key + CHUNK_COUNT_SUFFIX, String(numChunks));
  },

  async removeItem(rawKey: string): Promise<void> {
    const key = sanitizeKey(rawKey);
    const chunkCount = await getChunkCount(key);
    if (chunkCount > 0) {
      for (let i = 0; i < chunkCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_${i}`);
      }
      await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// En web no hay Keychain/Keystore: expo-secure-store no está disponible.
export const authStorage = Platform.OS === 'web' ? AsyncStorage : chunkedSecureStore;
