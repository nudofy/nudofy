// ─── Nudofy · src/lib/pushNotifications.ts ───────────────────────────────────
// Gestión de push notifications con Expo Notifications.
// - Solicita permisos al usuario
// - Registra el token en Supabase (tabla push_tokens)
// - Configura el handler de notificaciones recibidas en primer plano

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Configuración del comportamiento en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permisos y registra el token Expo Push en Supabase.
 * Llámalo tras confirmar que hay sesión activa.
 * En web no hace nada.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // Solicitar permisos
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return; // usuario rechazó

    // Obtener token Expo Push
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '40847a34-c16b-4316-a2a2-a25eb2dcafef', // EAS project ID
    });
    const token = tokenData.data;

    // Guardar en Supabase (upsert para no duplicar)
    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS as 'ios' | 'android',
      },
      { onConflict: 'user_id,token' }
    );
  } catch (e) {
    // Silenciar errores — las push no son críticas
    console.warn('[pushNotifications] registerPushToken error:', e);
  }
}

/**
 * Elimina el token del dispositivo actual de Supabase al hacer logout.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '40847a34-c16b-4316-a2a2-a25eb2dcafef',
    });
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', tokenData.data);
  } catch {
    // Silenciar
  }
}
