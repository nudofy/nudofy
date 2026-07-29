-- Auditoría de seguridad 28 jul 2026
--
-- Las políticas "nudofy_admin_update_agents" y "nudofy_admin_delete_agents"
-- comprobaban el rol leyendo auth.jwt()->'user_metadata'->>'role', mientras
-- que la política de SELECT ("nudofy_admin puede ver todos los agentes")
-- comprueba public.users.role. Son dos formas distintas de responder "¿es
-- nudofy_admin?" que pueden desincronizarse: si a alguien se le quita el rol
-- nudofy_admin en public.users pero sigue con un JWT ya emitido (no ha
-- vuelto a hacer login / el token no se ha refrescado con metadata nueva),
-- conservaría permiso para actualizar/borrar CUALQUIER agente hasta que ese
-- JWT expire. Esto ya estaba anotado como riesgo conocido en schema.sql sin
-- corregir ("fuera del alcance de este fix puntual") — se corrige aquí
-- unificando las tres políticas contra la misma fuente de verdad
-- (public.users.role), igual que ya hace SELECT.

DROP POLICY IF EXISTS "nudofy_admin_update_agents" ON public.agents;
CREATE POLICY "nudofy_admin_update_agents" ON public.agents
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'nudofy_admin'
  );

DROP POLICY IF EXISTS "nudofy_admin_delete_agents" ON public.agents;
CREATE POLICY "nudofy_admin_delete_agents" ON public.agents
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'nudofy_admin'
  );

NOTIFY pgrst, 'reload schema';
