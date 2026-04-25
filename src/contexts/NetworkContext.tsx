// ─── NetworkContext — detección de red + reintento ──────────────────────────
// Sin dependencias nativas (no usa @react-native-community/netinfo).
//   · Web: navigator.onLine + eventos online/offline.
//   · Native: ping periódico al endpoint de salud de Supabase.
// Expone:
//   const { isOnline, retry, lastChange } = useNetwork();

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { Platform } from 'react-native';

type NetworkApi = {
  isOnline: boolean;
  lastChange: number;             // timestamp del último cambio
  retry: () => Promise<boolean>;  // reintento manual (útil para banners/botones)
};

const NetworkContext = createContext<NetworkApi | null>(null);

export function useNetwork(): NetworkApi {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork debe usarse dentro de NetworkProvider');
  return ctx;
}

// Endpoint barato y siempre disponible si Supabase responde.
const PING_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/auth/v1/health`;
const PING_TIMEOUT_MS = 5000;
const PING_INTERVAL_OFFLINE = 5000;   // 5s mientras esté caído
const PING_INTERVAL_ONLINE = 30000;   // 30s en estado normal

async function pingNetwork(): Promise<boolean> {
  if (!PING_URL || PING_URL === '/auth/v1/health') return true; // sin URL configurada → asumimos online
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
    const res = await fetch(PING_URL, { method: 'GET', signal: ctrl.signal });
    clearTimeout(timer);
    // Cualquier respuesta < 500 implica que el servidor nos contestó.
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastChange, setLastChange] = useState(() => Date.now());
  const lastStatus = useRef(true);

  const update = useCallback((next: boolean) => {
    if (lastStatus.current === next) return;
    lastStatus.current = next;
    setIsOnline(next);
    setLastChange(Date.now());
  }, []);

  const retry = useCallback(async (): Promise<boolean> => {
    // En web preferimos confiar en navigator.onLine para no bloquear al usuario.
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
      update(false);
      return false;
    }
    const ok = await pingNetwork();
    update(ok);
    return ok;
  }, [update]);

  // Web: usar API del navegador.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onOnline = () => update(true);
    const onOffline = () => update(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    update(typeof navigator !== 'undefined' ? navigator.onLine : true);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [update]);

  // Nativo (iOS/Android): ping periódico.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function loop() {
      while (!cancelled) {
        const ok = await pingNetwork();
        if (cancelled) return;
        update(ok);
        const wait = ok ? PING_INTERVAL_ONLINE : PING_INTERVAL_OFFLINE;
        await new Promise<void>((resolve) => {
          timer = setTimeout(() => resolve(), wait);
        });
      }
    }

    loop();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [update]);

  const api = useMemo<NetworkApi>(() => ({ isOnline, lastChange, retry }), [isOnline, lastChange, retry]);

  return <NetworkContext.Provider value={api}>{children}</NetworkContext.Provider>;
}
