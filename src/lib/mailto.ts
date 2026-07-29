// ─── Nudofy · src/lib/mailto.ts ─────────────────────────────────────────────
// Abre un enlace mailto: de forma segura. Si el dispositivo no tiene un
// cliente de correo configurado, Linking.openURL revienta (Sentry NUDOFY-APP-7)
// en vez de fallar en silencio — este wrapper evita el crash y muestra la
// dirección para que el usuario la copie a mano.

import { Alert, Linking, Platform } from 'react-native';

export interface MailtoOptions {
  subject?: string;
  body?: string;
}

function buildMailtoUrl(email: string, opts: MailtoOptions = {}): string {
  const params = new URLSearchParams();
  if (opts.subject) params.set('subject', opts.subject);
  if (opts.body) params.set('body', opts.body);
  const query = params.toString();
  return `mailto:${encodeURIComponent(email)}${query ? `?${query}` : ''}`;
}

export async function openMailto(email: string, opts: MailtoOptions = {}): Promise<void> {
  const url = buildMailtoUrl(email, opts);

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      showNoMailClientFallback(email);
      return;
    }
    await Linking.openURL(url);
  } catch {
    showNoMailClientFallback(email);
  }
}

function showNoMailClientFallback(email: string) {
  const message = `No se encontró una app de correo en este dispositivo. Puedes escribir a: ${email}`;
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('Sin app de correo', message);
  }
}
