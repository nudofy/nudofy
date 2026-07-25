-- Corrige el texto de `features` (bullets de la web/app), que no se
-- actualizó al aplicar 20260725063745_ajustes_repricing_pro_proveedores.sql.

UPDATE public.plans SET
  features = '[
    "1 agente incluido",
    "Portal del cliente",
    "Hasta 300 clientes",
    "Hasta 10 proveedores",
    "Catálogos ilimitados",
    "Hasta 3.000 productos",
    "Variantes en matriz (talla × color)",
    "Importación por CSV",
    "Tarifas personalizadas por cliente",
    "Estadísticas avanzadas",
    "Soporte prioritario"
  ]'::jsonb
WHERE id = 'pro';

UPDATE public.plans SET
  features = '[
    "8 agentes incluidos (+15€/agente adicional)",
    "Portal del cliente",
    "Hasta 650 clientes",
    "Proveedores ilimitados",
    "Catálogos ilimitados",
    "Hasta 5.000 productos",
    "Variantes en matriz (talla × color)",
    "Importación por CSV",
    "Tarifas personalizadas por cliente",
    "Estadísticas avanzadas + comparativas por año/temporada",
    "Soporte prioritario"
  ]'::jsonb
WHERE id = 'agency';

NOTIFY pgrst, 'reload schema';
