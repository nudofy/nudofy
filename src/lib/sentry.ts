// ─── Nudofy · src/lib/sentry.ts ──────────────────────────────────────────────
// Inicialización de Sentry para React Native (Expo).
// Importar este archivo UNA sola vez, al inicio de la app (_layout.tsx).

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

const DSN = 'https://f84845f2c8015122420a36555a861996@o4511525838520320.ingest.de.sentry.io/4511525851627600';

export function initSentry() {
  // En web no usamos este SDK (se gestiona en nudofy-web con @sentry/nextjs)
  if (Platform.OS === 'web') return;

  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // ExpoUpdates integration crashes en Android cuando el módulo nativo de Sentry
    // no está enlazado (usamos Sentry en modo JS-only)
    integrations: (integrations) => integrations.filter((i) => i.name !== 'ExpoUpdatesListener'),
  });
}

/** Identifica al usuario en Sentry para poder asociar errores a cuentas. */
export function setSentryUser(id: string, email?: string) {
  if (Platform.OS === 'web') return;
  Sentry.setUser({ id, email });
}

/** Limpia el usuario al hacer logout. */
export function clearSentryUser() {
  if (Platform.OS === 'web') return;
  Sentry.setUser(null);
}

export { Sentry };
