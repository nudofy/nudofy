-- Panel de Analítica para Agente — multiplicador de riesgo de fuga configurable
-- Ver docs/nudofy-panel-analitica-spec.txt sección 7 ("¿es configurable por el agente?" → sí)
--
-- Antes vivía como constante fija (RISK_MULTIPLIER=1.5) en src/hooks/useAgentAnalytics.ts.
-- Ahora cada agente lo guarda en su propia fila para poder ajustar cuándo salta la
-- alerta de "riesgo de fuga" en Mi cartera (spec sección 3):
--   days_since_last_order > avg_order_frequency_days * risk_multiplier
-- Rango acotado a 1.1–3.0 para que no se pueda dejar en un valor sin sentido
-- (ej. 1.0 dispararía la alarma con solo llegar puntual).

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS risk_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.5
  CHECK (risk_multiplier BETWEEN 1.1 AND 3.0);
