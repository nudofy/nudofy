-- Panel de Analítica para Agente — V1 puntos 1+2 (ranking de clientes + riesgo de fuga)
-- Ver docs/nudofy-panel-analitica-spec.txt
--
-- Vista agregada sobre orders/clients (no requiere nuevas tablas ni cron: el volumen
-- actual — ~168 clientes — es bajo, así que se calcula on-demand con índices de apoyo).
-- security_invoker=true hace que la vista respete las políticas RLS de las tablas base
-- con el usuario que consulta (mismo criterio que clients_by_agent/orders_by_agent),
-- así que no hace falta política RLS propia ni exponer service_role.
--
-- Notas de diseño (ver spec sección 7):
--   - Solo cuentan como "pedido real" los estados que ya usa el resto de la app
--     (confirmed, sent_to_supplier, proposal_sent) — igual que useStats()/estadisticas.tsx.
--   - avg_order_frequency_days se calcula sobre los huecos entre los últimos 6 pedidos.
--   - Se exige un mínimo de 3 pedidos (has_enough_history) antes de dar por fiable la
--     frecuencia media, tal y como pide la spec para clientes nuevos.
--   - Periodo de facturación = doce meses móviles (no año natural), para que la
--     comparativa "vs periodo anterior" tenga sentido en cualquier mes del año.
--   - El multiplicador de riesgo (1.5x) NO vive aquí: se aplica en la app para poder
--     hacerlo configurable más adelante sin tocar la vista.

-- Índices de apoyo para el cálculo de frecuencia/facturación por cliente
CREATE INDEX IF NOT EXISTS idx_orders_client_created ON public.orders(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_agent_status_created ON public.orders(agent_id, status, created_at);

CREATE OR REPLACE VIEW public.agent_client_metrics
WITH (security_invoker = true) AS
WITH real_orders AS (
  SELECT
    o.id,
    o.client_id,
    o.agent_id,
    o.created_at,
    o.total,
    ROW_NUMBER() OVER (PARTITION BY o.client_id ORDER BY o.created_at DESC) AS rn_desc,
    LAG(o.created_at) OVER (PARTITION BY o.client_id ORDER BY o.created_at) AS prev_created_at
  FROM public.orders o
  WHERE o.status IN ('confirmed', 'sent_to_supplier', 'proposal_sent')
    AND o.client_id IS NOT NULL
),
gaps AS (
  SELECT
    client_id,
    EXTRACT(EPOCH FROM (created_at - prev_created_at)) / 86400.0 AS gap_days
  FROM real_orders
  WHERE prev_created_at IS NOT NULL AND rn_desc <= 6
),
frequency AS (
  SELECT client_id, AVG(gap_days) AS avg_order_frequency_days
  FROM gaps
  GROUP BY client_id
),
totals AS (
  SELECT client_id, COUNT(*) AS total_orders, MAX(created_at) AS last_order_date
  FROM real_orders
  GROUP BY client_id
),
revenue_current AS (
  SELECT client_id, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders_count
  FROM real_orders
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY client_id
),
revenue_prev AS (
  SELECT client_id, COALESCE(SUM(total), 0) AS revenue
  FROM real_orders
  WHERE created_at >= NOW() - INTERVAL '24 months' AND created_at < NOW() - INTERVAL '12 months'
  GROUP BY client_id
)
SELECT
  c.id AS client_id,
  c.agent_id,
  c.name,
  c.phone,
  c.email,
  COALESCE(t.total_orders, 0) AS total_orders,
  t.last_order_date,
  CASE WHEN t.last_order_date IS NULL THEN NULL
       ELSE EXTRACT(EPOCH FROM (NOW() - t.last_order_date)) / 86400.0
  END AS days_since_last_order,
  CASE WHEN COALESCE(t.total_orders, 0) >= 3 THEN f.avg_order_frequency_days ELSE NULL END AS avg_order_frequency_days,
  COALESCE(t.total_orders, 0) >= 3 AS has_enough_history,
  COALESCE(rc.revenue, 0) AS total_revenue_period,
  COALESCE(rp.revenue, 0) AS total_revenue_prev_period,
  CASE WHEN COALESCE(rc.orders_count, 0) > 0 THEN rc.revenue / rc.orders_count ELSE NULL END AS avg_ticket
FROM public.clients c
LEFT JOIN totals t          ON t.client_id = c.id
LEFT JOIN frequency f       ON f.client_id = c.id
LEFT JOIN revenue_current rc ON rc.client_id = c.id
LEFT JOIN revenue_prev rp    ON rp.client_id = c.id;

GRANT SELECT ON public.agent_client_metrics TO authenticated;
