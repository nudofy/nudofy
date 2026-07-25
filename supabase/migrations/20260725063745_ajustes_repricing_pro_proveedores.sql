-- Ajustes tras revisión del repricing del 24 jul 2026:
-- 1. Revertir el límite de proveedores en Pro y Agencia (no era parte del
--    acuerdo original, solo se pidió limitar clientes/productos).
-- 2. Pro pasa a ser un plan de un único agente (como Básico) — el jump de
--    3 agentes incluidos + 13€/extra no compensaba frente a Agencia (89€
--    incluye 8 agentes: cambiar de agente en Pro siempre salía más caro y
--    más limitado que Agencia). Ahora "equipos" = Agencia, sin ambigüedad.
-- 3. Pro sube el límite de clientes de 200 a 300: los clientes no generan
--    coste técnico real (a diferencia de productos/imágenes), así que no
--    hay motivo de riesgo para ser más generoso aquí.

UPDATE public.plans SET
  max_suppliers = 10
WHERE id = 'pro';

UPDATE public.plans SET
  max_suppliers = NULL
WHERE id = 'agency';

UPDATE public.plans SET
  agents_included = 1,
  max_agents = 1,
  price_extra_agent = NULL,
  max_clients = 300
WHERE id = 'pro';

NOTIFY pgrst, 'reload schema';
