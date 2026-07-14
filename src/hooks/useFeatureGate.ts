// useFeatureGate — comprueba si el plan del agente desbloquea una funcionalidad
// cualitativa (no basada en conteos, para eso está usePlanLimits).
//
// Orden de planes de menor a mayor: free/free_pro (trial) se tratan como 'pro'
// (el trial da acceso completo), luego basic < pro < agency.

import { useAgentContext } from '@/contexts/AgentContext';

const TIER_RANK: Record<string, number> = {
  free: 2,       // trial da acceso de nivel Pro
  free_pro: 2,   // trial da acceso de nivel Pro
  basic: 1,
  pro: 2,
  agency: 3,
};

export type Feature = 'variants_matrix' | 'csv_import' | 'custom_tariffs' | 'advanced_stats' | 'stats_comparatives';

const FEATURE_MIN_TIER: Record<Feature, number> = {
  variants_matrix: 2,      // Pro+
  csv_import: 2,           // Pro+
  custom_tariffs: 2,       // Pro+
  advanced_stats: 2,       // Pro+
  stats_comparatives: 3,   // Agency only
};

export function useFeatureGate(feature: Feature): { allowed: boolean; loading: boolean; requiredPlan: string } {
  const { agent, loading } = useAgentContext();
  const rank = agent ? (TIER_RANK[agent.plan] ?? 1) : 0;
  const minRank = FEATURE_MIN_TIER[feature];
  const requiredPlan = minRank >= 3 ? 'Agencia' : 'Pro';
  return { allowed: rank >= minRank, loading, requiredPlan };
}
