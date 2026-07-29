import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { authStorage } from './secureStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sesión (access_token/refresh_token) cifrada en reposo vía
    // Keychain/Keystore (expo-secure-store) en vez de AsyncStorage en claro.
    // Ver src/lib/secureStorage.ts — auditoría de seguridad 28 jul 2026.
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
