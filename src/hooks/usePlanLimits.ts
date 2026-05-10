// usePlanLimits — comprueba si el agente ha llegado al límite de su plan.
// Soporta: clientes (por ahora). Fácil de extender a pedidos, productos, etc.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAgentContext } from '@/contexts/AgentContext';

export type PlanKey = 'free' | 'free_pro' | 'basic' | 'pro' | 'agency' | 'agency_pro';

// null = ilimitado
const CLIENT_LIMITS: Record<PlanKey, number | null> = {
  free:       null,
  free_pro:   null,
  basic:      50,
  pro:        150,
  agency:     null,
  agency_pro: null,
};

interface PlanLimitsResult {
  loading: boolean;
  clientCount: number;
  clientLimit: number | null;   // null = ilimitado
  canAddClient: boolean;
  usageLabel: string;           // "32 / 50" o "32 / ∞"
}

export function usePlanLimits(): PlanLimitsResult {
  const { agent, loading: agentLoading } = useAgentContext();
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent) { setLoading(false); return; }

    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .then(({ count }) => {
        setClientCount(count ?? 0);
        setLoading(false);
      });
  }, [agent]);

  const plan = (agent?.plan ?? 'free') as PlanKey;
  const clientLimit = CLIENT_LIMITS[plan] ?? null;
  const canAddClient = clientLimit === null || clientCount < clientLimit;
  const usageLabel = `${clientCount} / ${clientLimit !== null ? clientLimit : '∞'}`;

  return {
    loading: agentLoading || loading,
    clientCount,
    clientLimit,
    canAddClient,
    usageLabel,
  };
}
