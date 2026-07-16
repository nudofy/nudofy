// Mockeado para no crear un cliente Supabase real en tests (necesitaría env
// vars reales) — getPlan()/getPlanConfigsSync() son puramente síncronas y no
// llegan a tocar el cliente.
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { getPlan, getPlanConfigsSync, PLAN_FALLBACK } from '@/lib/planConfig';

describe('PLAN_FALLBACK', () => {
  it('no tiene ids de plan duplicados', () => {
    const ids = PLAN_FALLBACK.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos los planes tienen nombre y precio no negativo', () => {
    for (const plan of PLAN_FALLBACK) {
      expect(plan.name.length).toBeGreaterThan(0);
      expect(plan.price_monthly).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getPlan()', () => {
  it('devuelve la config correcta para un plan conocido', () => {
    const plan = getPlan('pro');
    expect(plan.id).toBe('pro');
    expect(plan.name).toBe('Pro');
  });

  it('cae al primer plan del fallback si el id no existe', () => {
    const plan = getPlan('plan-que-no-existe');
    expect(plan.id).toBe(PLAN_FALLBACK[0].id);
  });
});

describe('getPlanConfigsSync()', () => {
  it('devuelve el fallback cuando no hay caché cargada aún', () => {
    const plans = getPlanConfigsSync();
    expect(plans).toEqual(PLAN_FALLBACK);
  });
});
