-- Panel de Analítica para Agente — V1 punto 3 (ranking de productos)
-- Ver docs/nudofy-panel-analitica-spec.txt
--
-- Mismo criterio que agent_client_metrics (20260720095302): security_invoker=true,
-- doce meses móviles como "periodo", solo pedidos reales (confirmed/sent_to_supplier/
-- proposal_sent). El agente del producto se deriva de products→catalogs→suppliers.agent_id
-- (cada proveedor pertenece a un único agente), así aparecen también productos del
-- catálogo del agente que aún no se han vendido (unidades/facturación en 0), útil para
-- ver qué no está funcionando además de qué sí.
--
-- El desglose "qué tiendas han comprado este producto" (ficha de detalle, spec 5.3.1)
-- no necesita vista propia: se resuelve con una query directa order_items→orders→clients
-- filtrada por product_id, igual que hace el resto de la app (ver cliente/[id].tsx).

CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

CREATE OR REPLACE VIEW public.agent_product_metrics
WITH (security_invoker = true) AS
WITH real_items AS (
  SELECT
    oi.product_id,
    o.created_at,
    oi.quantity,
    oi.total
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status IN ('confirmed', 'sent_to_supplier', 'proposal_sent')
),
current_period AS (
  SELECT product_id, SUM(quantity) AS units, SUM(total) AS revenue
  FROM real_items
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY product_id
),
prev_period AS (
  SELECT product_id, SUM(quantity) AS units, SUM(total) AS revenue
  FROM real_items
  WHERE created_at >= NOW() - INTERVAL '24 months' AND created_at < NOW() - INTERVAL '12 months'
  GROUP BY product_id
),
totals AS (
  SELECT product_id, SUM(quantity) AS total_units, MAX(created_at) AS last_ordered_at
  FROM real_items
  GROUP BY product_id
)
SELECT
  p.id AS product_id,
  s.agent_id,
  p.name AS product_name,
  p.reference,
  p.image_url,
  s.id AS supplier_id,
  s.name AS supplier_name,
  COALESCE(t.total_units, 0) AS total_units_sold,
  t.last_ordered_at,
  COALESCE(cp.units, 0) AS units_sold_period,
  COALESCE(cp.revenue, 0) AS revenue_period,
  COALESCE(pp.units, 0) AS units_sold_prev_period,
  COALESCE(pp.revenue, 0) AS revenue_prev_period
FROM public.products p
JOIN public.catalogs c  ON c.id = p.catalog_id
JOIN public.suppliers s ON s.id = c.supplier_id
LEFT JOIN totals t          ON t.product_id = p.id
LEFT JOIN current_period cp ON cp.product_id = p.id
LEFT JOIN prev_period pp    ON pp.product_id = p.id;

GRANT SELECT ON public.agent_product_metrics TO authenticated;
