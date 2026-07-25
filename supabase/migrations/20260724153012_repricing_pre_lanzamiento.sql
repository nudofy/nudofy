-- Repricing pre-lanzamiento (jul 2026): ningún plan público debe poder costar
-- más de lo que paga. Antes, Agencia (y Agencia Pro, oculta) no tenían techo
-- en clientes/proveedores/catálogos/productos — ver análisis de riesgo
-- técnico + competencia (24 jul 2026). Estamos en fase de pruebas, sin
-- clientes reales, así que no hace falta clausula de derechos adquiridos.
--
-- Criterio aplicado: el precio por agente extra nunca debe quedar por debajo
-- de la media del plan, y el salto de recursos entre planes debe ser
-- proporcional al salto de precio (no explosivo). Catálogos y pedidos/mes se
-- dejan sin límite en todos los planes de pago: no son el recurso caro
-- (imágenes/egress), lo es `max_products`.

-- Básico: sube clientes (80), quita límite de catálogos, baja producto de
-- 2.000 a 1.500 (ajuste fino, sigue siendo generoso para el segmento de entrada).
UPDATE public.plans SET
  max_clients = 80,
  max_catalogs = NULL,
  max_products = 1500,
  features = '[
    "1 agente comercial",
    "Portal del cliente",
    "Hasta 80 clientes",
    "Hasta 2 proveedores",
    "Catálogos ilimitados",
    "Hasta 1.500 productos",
    "Pedidos ilimitados",
    "Soporte por email"
  ]'::jsonb
WHERE id = 'basic';

-- Pro: sube precio (35→39) y agente extra (8→13, ya no puede ser más barato
-- que la media del plan base). Clientes/proveedores bajan a algo proporcional
-- al salto de precio respecto a Básico (antes eran saltos de 10x/5x).
UPDATE public.plans SET
  price_monthly = 39,
  price_extra_agent = 13,
  max_clients = 200,
  max_suppliers = 6,
  max_catalogs = NULL,
  max_products = 3000,
  features = '[
    "3 agentes incluidos (+13€/agente adicional)",
    "Portal del cliente",
    "Hasta 200 clientes",
    "Hasta 6 proveedores",
    "Catálogos ilimitados",
    "Hasta 3.000 productos",
    "Variantes en matriz (talla × color)",
    "Importación por CSV",
    "Tarifas personalizadas por cliente",
    "Estadísticas avanzadas",
    "Soporte prioritario"
  ]'::jsonb
WHERE id = 'pro';

-- Agencia: sube precio (75→89) y agente extra (8→15). Pasa de "todo
-- ilimitado" a límites reales pero altos: 650 clientes, 15 proveedores,
-- 5.000 productos. Catálogos y pedidos/mes siguen sin límite.
UPDATE public.plans SET
  price_monthly = 89,
  price_extra_agent = 15,
  max_clients = 650,
  max_suppliers = 15,
  max_catalogs = NULL,
  max_products = 5000,
  features = '[
    "8 agentes incluidos (+15€/agente adicional)",
    "Portal del cliente",
    "Hasta 650 clientes",
    "Hasta 15 proveedores",
    "Catálogos ilimitados",
    "Hasta 5.000 productos",
    "Variantes en matriz (talla × color)",
    "Importación por CSV",
    "Tarifas personalizadas por cliente",
    "Estadísticas avanzadas + comparativas por año/temporada",
    "Soporte prioritario"
  ]'::jsonb
WHERE id = 'agency';

-- Agencia Pro: reactivar y reconvertir en la capa "Empresa, a medida" — ya
-- tenía el CTA correcto ("Hablar con ventas" → /contacto), solo estaba
-- apagada (is_active=false). price_monthly a NULL para que la web la muestre
-- como "A medida" y el enlace vaya a /contacto (no a /registro).
UPDATE public.plans SET
  is_active = true,
  name = 'Empresa',
  tagline = 'Para catálogos y equipos que se salen de los límites de Agencia.',
  price_monthly = NULL,
  price_extra_agent = NULL,
  agents_included = NULL,
  max_agents = NULL,
  max_clients = NULL,
  max_suppliers = NULL,
  max_catalogs = NULL,
  max_products = NULL,
  max_orders_month = NULL,
  features = '[
    "Todo lo de Agencia",
    "Más de 5.000 productos",
    "SLA y soporte dedicado",
    "Onboarding personalizado",
    "Integraciones avanzadas",
    "Cuenta multi-empresa"
  ]'::jsonb
WHERE id = 'agency_pro';
