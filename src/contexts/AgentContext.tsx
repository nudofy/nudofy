// AgentContext — un único fetch del registro agents para todas las pantallas del agente.
// Envuelve el layout (agent)/_layout.tsx para que cualquier pantalla hija use
// useAgentContext() en lugar de instanciar useAgent() individualmente.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Agent } from '@/hooks/useAgent';

interface AgentContextType {
  agent: Agent | null;
  loading: boolean;
  trialExpired: boolean;
  refreshAgent: () => void;
}

export const AgentContext = createContext<AgentContextType | null>(null);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAgent(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('agents')
      .select('id, name, email, phone, plan, active, plan_expires_at, accepted_dpa_at')
      .eq('user_id', userId)
      .single();
    setAgent(data ?? null);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) { setAgent(null); setLoading(false); return; }
    fetchAgent(user.id);
  }, [user]);

  function refreshAgent() {
    if (user) fetchAgent(user.id);
  }

  // El trial está vencido si: el agente tiene plan free/free_pro,
  // tiene plan_expires_at en el pasado, o su cuenta está desactivada.
  const trialExpired = !loading && agent != null && (
    agent.active === false ||
    (
      ['free', 'free_pro'].includes(agent.plan) &&
      agent.plan_expires_at != null &&
      new Date(agent.plan_expires_at) < new Date()
    )
  );

  return (
    <AgentContext.Provider value={{ agent, loading, trialExpired, refreshAgent }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext(): AgentContextType {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgentContext debe usarse dentro de AgentProvider');
  return ctx;
}
