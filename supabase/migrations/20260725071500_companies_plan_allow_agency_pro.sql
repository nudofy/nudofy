-- companies.plan no permitía 'agency_pro' (Empresa) — bug descubierto al
-- añadir el selector de cambio de plan en (admin)/empresa/[id].tsx: seleccionar
-- "Empresa" para una empresa habría fallado por la CHECK constraint.

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_plan_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_plan_check
  CHECK (plan IN ('basic', 'pro', 'agency', 'agency_pro'));

NOTIFY pgrst, 'reload schema';
