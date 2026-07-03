// planConfig.ts — Configuración de planes desde Supabase, con fallback hardcodeado.
// Se cachea en memoria para no hacer fetch repetidos.
// La tabla `plans` es la fuente de verdad compartida entre app y web.

import { supabase } from '@/lib/supabase';

export interface PlanConfig {
  id: string;
  name: string;
  price_monthly: number;
  max_clients: number | null;    // null = ilimitado
  max_suppliers: number | null;  // null = ilimitado
  max_catalogs: number | null;   // null = ilimitado
  max_agents: number | null;
}

// Fallback por si la BD falla — DEBE coincidir con la tabla `plans` en Supabase.
// Última sincronización: julio 2026 (ver app-ventas/actualizar-precios.sql).
export const PLAN_FALLBACK: PlanConfig[] = [
  { id: 'free',       name: 'Free',        price_monthly: 0,  max_clients: null, max_suppliers: null, max_catalogs: null, max_agents: null },
  { id: 'free_pro',   name: 'Free Pro',    price_monthly: 0,  max_clients: null, max_suppliers: null, max_catalogs: null, max_agents: null },
  { id: 'basic',      name: 'Básico',      price_monthly: 15, max_clients: 50,   max_suppliers: 2,    max_catalogs: 5,    max_agents: 1    },
  { id: 'pro',        name: 'Pro',         price_monthly: 35, max_clients: 500,  max_suppliers: 10,   max_catalogs: 20,   max_agents: 3    },
  { id: 'agency',     name: 'Agencia',     price_monthly: 75, max_clients: null, max_suppliers: null, max_catalogs: null, max_agents: 8    },
];

let _cache: PlanConfig[] | null = null;
let _promise: Promise<PlanConfig[]> | null = null;

/** Devuelve la configuración de planes. Se cachea tras la primera llamada. */
export async function getPlanConfigs(): Promise<PlanConfig[]> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = Promise.resolve(
    supabase
      .from('plans')
      .select('id, name, price_monthly, max_clients, max_suppliers, max_catalogs, max_agents')
      .eq('is_active', true)
      .order('sort_order'),
  ).then(({ data, error }) => {
    if (error || !data?.length) {
      console.warn('[planConfig] Usando fallback:', error?.message);
      _cache = PLAN_FALLBACK;
    } else {
      _cache = data as PlanConfig[];
    }
    _promise = null;
    return _cache!;
  });

  return _promise;
}

/** Versión síncrona — usa el caché si existe, o el fallback. */
export function getPlanConfigsSync(): PlanConfig[] {
  return _cache ?? PLAN_FALLBACK;
}

/** Obtiene la config de un plan concreto. */
export function getPlan(key: string): PlanConfig {
  const plans = getPlanConfigsSync();
  return plans.find(p => p.id === key) ?? PLAN_FALLBACK.find(p => p.id === key) ?? PLAN_FALLBACK[0];
}

/** Invalida el caché (útil cuando el admin actualiza un plan). */
export function invalidatePlanCache() {
  _cache = null;
  _promise = null;
}
