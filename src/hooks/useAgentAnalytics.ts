// Panel de Analítica para Agente — V1 (ranking de clientes + riesgo de fuga)
// Ver docs/nudofy-panel-analitica-spec.txt y supabase/migrations/20260720095302_agent_client_metrics.sql
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAgentContext } from '@/contexts/AgentContext';

export interface ClientMetric {
  client_id: string;
  agent_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  total_orders: number;
  last_order_date: string | null;
  days_since_last_order: number | null;
  avg_order_frequency_days: number | null;
  has_enough_history: boolean;
  total_revenue_period: number;
  total_revenue_prev_period: number;
  avg_ticket: number | null;
}

export type RiskLevel = 'sin_historico' | 'al_dia' | 'atencion' | 'riesgo';

// Multiplicador de riesgo de fuga (spec sección 3): en riesgo si
// days_since_last_order > avg_order_frequency_days * multiplier.
// Configurable por agente — ver agents.risk_multiplier (perfil.tsx) y
// supabase/migrations/20260720103324_agent_risk_multiplier.sql.
export const DEFAULT_RISK_MULTIPLIER = 1.5;

export function getRiskLevel(m: ClientMetric, multiplier: number = DEFAULT_RISK_MULTIPLIER): RiskLevel {
  if (!m.has_enough_history || m.avg_order_frequency_days == null || m.days_since_last_order == null) {
    return 'sin_historico';
  }
  const threshold = m.avg_order_frequency_days * multiplier;
  if (m.days_since_last_order > threshold) return 'riesgo';
  if (m.days_since_last_order > m.avg_order_frequency_days) return 'atencion';
  return 'al_dia';
}

export function revenueVariationPct(m: ClientMetric): number | null {
  if (!m.total_revenue_prev_period) return null;
  return ((m.total_revenue_period - m.total_revenue_prev_period) / m.total_revenue_prev_period) * 100;
}

export function riskReasonLabel(m: ClientMetric): string {
  if (m.days_since_last_order == null) return 'Sin pedidos todavía';
  const days = Math.floor(m.days_since_last_order);
  const ticket = m.avg_ticket ? `, ticket medio ${Math.round(m.avg_ticket)}€` : '';
  return `${days} día${days !== 1 ? 's' : ''} sin pedir${ticket}`;
}

export function useClientMetrics() {
  const { agent } = useAgentContext();
  const [metrics, setMetrics] = useState<ClientMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    const { data } = await supabase
      .from('agent_client_metrics')
      .select('*')
      .eq('agent_id', agent.id);
    setMetrics((data as ClientMetric[]) ?? []);
    setLoading(false);
  }, [agent]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}

// Lista priorizada de acción: combina riesgo de fuga + valor histórico del cliente
// (spec sección 4, endpoint priority-actions — aquí resuelto client-side sobre la
// misma vista, sin necesidad de un endpoint separado).
export function buildPriorityList(metrics: ClientMetric[], multiplier: number = DEFAULT_RISK_MULTIPLIER, topN = 5): ClientMetric[] {
  const weight: Record<RiskLevel, number> = { riesgo: 3, atencion: 2, sin_historico: 0, al_dia: 0 };
  return [...metrics]
    .filter(m => m.total_orders > 0)
    .sort((a, b) => {
      const w = weight[getRiskLevel(b, multiplier)] - weight[getRiskLevel(a, multiplier)];
      if (w !== 0) return w;
      return b.total_revenue_period - a.total_revenue_period;
    })
    .slice(0, topN);
}

// ——————————————————————————————
// Ranking de productos (spec sección 2, punto 3 / supabase/migrations/20260720101935_agent_product_metrics.sql)
// ——————————————————————————————
export interface ProductMetric {
  product_id: string;
  agent_id: string;
  product_name: string;
  reference?: string | null;
  image_url?: string | null;
  supplier_id: string;
  supplier_name: string;
  total_units_sold: number;
  last_ordered_at: string | null;
  units_sold_period: number;
  revenue_period: number;
  units_sold_prev_period: number;
  revenue_prev_period: number;
}

export function useProductMetrics() {
  const { agent } = useAgentContext();
  const [metrics, setMetrics] = useState<ProductMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    const { data } = await supabase
      .from('agent_product_metrics')
      .select('*')
      .eq('agent_id', agent.id);
    setMetrics((data as ProductMetric[]) ?? []);
    setLoading(false);
  }, [agent]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}

export function unitsVariationPct(m: ProductMetric): number | null {
  if (!m.units_sold_prev_period) return null;
  return ((m.units_sold_period - m.units_sold_prev_period) / m.units_sold_prev_period) * 100;
}

export function productRevenueVariationPct(m: ProductMetric): number | null {
  if (!m.revenue_prev_period) return null;
  return ((m.revenue_period - m.revenue_prev_period) / m.revenue_prev_period) * 100;
}

// Ficha de producto (spec sección 5.3.1): qué tiendas lo han comprado.
// Query directa, no necesita vista propia — el volumen por producto es bajo.
const REAL_ORDER_STATUSES = ['confirmed', 'sent_to_supplier', 'proposal_sent'];

export interface ProductClientRow {
  client_id: string;
  client_name: string;
  units: number;
  revenue: number;
  last_ordered_at: string;
}

export function useProductClientBreakdown(productId: string | undefined) {
  const [rows, setRows] = useState<ProductClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    const { data } = await supabase
      .from('order_items')
      .select('quantity, total, order:orders(status, created_at, client:clients(id, name))')
      .eq('product_id', productId);

    const byClient: Record<string, ProductClientRow> = {};
    ((data as any[]) ?? []).forEach(row => {
      const order = row.order;
      const client = order?.client;
      if (!client || !REAL_ORDER_STATUSES.includes(order.status)) return;
      const existing = byClient[client.id];
      if (existing) {
        existing.units += row.quantity ?? 0;
        existing.revenue += row.total ?? 0;
        if (order.created_at > existing.last_ordered_at) existing.last_ordered_at = order.created_at;
      } else {
        byClient[client.id] = {
          client_id: client.id, client_name: client.name,
          units: row.quantity ?? 0, revenue: row.total ?? 0,
          last_ordered_at: order.created_at,
        };
      }
    });
    setRows(Object.values(byClient));
    setLoading(false);
  }, [productId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  return { rows, loading };
}
