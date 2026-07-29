-- Auditoría de seguridad 28 jul 2026
--
-- client_portal_access tiene RLS activado (ver schema.sql) pero la ÚNICA
-- política existente era "portal_access_by_client" (FOR SELECT, el cliente
-- ve sus propios accesos). No existía NINGUNA política que permitiera al
-- AGENTE gestionar (dar de alta/quitar) el acceso al portal de sus propios
-- clientes — y sin embargo app/(agent)/cliente/[id].tsx (PortalAccessSection)
-- hace insert/delete directos sobre esta tabla desde el cliente RN.
--
-- Con RLS activo y sin política de escritura para el agente, esos
-- insert/delete deberían estar fallando silenciosamente por RLS (fail-safe:
-- no es una fuga de datos, es una función rota). Se añade aquí la política
-- que faltaba, con el mismo alcance que usa el resto del esquema: el agente
-- solo puede gestionar accesos de SUS clientes hacia SUS proveedores (nunca
-- clientes o proveedores de otro agente).

CREATE POLICY "client_portal_access_agent_manage" ON public.client_portal_access
  FOR ALL USING (
    client_id IN (
      SELECT id FROM public.clients
      WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
    AND supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients
      WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
    AND supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
  );

NOTIFY pgrst, 'reload schema';
