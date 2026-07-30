-- Cristina (crisferrico@gmail.com) tenía agents.plan = 'agency' pero su
-- empresa ("Agente Prueba") en plan 'pro' — un desajuste real que hacía que
-- desapareciera de las dos vistas del admin (Agentes y Agencias), porque
-- ambas asumen que agente y empresa están sincronizados.
--
-- Hasta ahora esa sincronización se hacía a mano en dos sitios del código
-- (app/(admin)/empresa/[id].tsx y supabase/functions/stripe-webhook) — si
-- cualquier otro camino cambia el plan (o si alguno de esos dos tiene un
-- bug) el desajuste puede volver a pasar. Estos triggers lo hacen imposible
-- a nivel de base de datos, sea cual sea el código que escriba.

CREATE OR REPLACE FUNCTION public.sync_agent_plan_from_company()
RETURNS TRIGGER AS $$
DECLARE
  v_company_plan TEXT;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT plan INTO v_company_plan FROM public.companies WHERE id = NEW.company_id;
    IF v_company_plan IS NOT NULL THEN
      -- agents.plan no admite 'agency_pro' (solo companies.plan lo hace) —
      -- Empresa se traduce a 'agency' para el agente individual.
      NEW.plan := CASE WHEN v_company_plan = 'agency_pro' THEN 'agency' ELSE v_company_plan END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_agent_plan ON public.agents;
CREATE TRIGGER trg_sync_agent_plan
  BEFORE INSERT OR UPDATE OF plan, company_id ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_agent_plan_from_company();

CREATE OR REPLACE FUNCTION public.sync_agents_plan_from_company_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    UPDATE public.agents
    SET plan = CASE WHEN NEW.plan = 'agency_pro' THEN 'agency' ELSE NEW.plan END
    WHERE company_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_agents_on_company_plan_change ON public.companies;
CREATE TRIGGER trg_sync_agents_on_company_plan_change
  AFTER UPDATE OF plan ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_agents_plan_from_company_change();

NOTIFY pgrst, 'reload schema';
