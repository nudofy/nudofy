// usePlanLimits — comprueba si el agente ha llegado al límite de su plan.
// Los límites se leen desde la tabla `plans` en Supabase (con fallback hardcodeado).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAgentContext } from '@/contexts/AgentContext';
import { getPlanConfigs } from '@/lib/planConfig';

interface PlanLimitsResult {
  loading: boolean;
  // Clientes
  clientCount: number;
  clientLimit: number | null;
  canAddClient: boolean;
  clientUsageLabel: string;
  // Proveedores
  supplierCount: number;
  supplierLimit: number | null;
  canAddSupplier: boolean;
  supplierUsageLabel: string;
}

export function usePlanLimits(): PlanLimitsResult {
  const { agent, loading: agentLoading } = useAgentContext();
  const [clientCount, setClientCount] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [clientLimit, setClientLimit] = useState<number | null>(null);
  const [supplierLimit, setSupplierLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent) { setLoading(false); return; }

    Promise.all([
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id),
      supabase
        .from('suppliers')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id),
      getPlanConfigs(),
    ]).then(([clientsRes, suppliersRes, plans]) => {
      setClientCount(clientsRes.count ?? 0);
      setSupplierCount(suppliersRes.count ?? 0);
      const plan = plans.find(p => p.id === agent.plan);
      setClientLimit(plan?.max_clients ?? null);
      setSupplierLimit(plan?.max_suppliers ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [agent]);

  const canAddClient = clientLimit === null || clientCount < clientLimit;
  const canAddSupplier = supplierLimit === null || supplierCount < supplierLimit;
  const clientUsageLabel = `${clientCount} / ${clientLimit ?? '∞'}`;
  const supplierUsageLabel = `${supplierCount} / ${supplierLimit ?? '∞'}`;

  return {
    loading: agentLoading || loading,
    clientCount, clientLimit, canAddClient, clientUsageLabel,
    supplierCount, supplierLimit, canAddSupplier, supplierUsageLabel,
  };
}
