-- Bug real reportado el 31 jul 2026: la ficha de admin (agente y empresa)
-- mostraba 0 proveedores / 0 catalogos / 0 pedidos / 0 clientes para
-- Sindiseca Toys pese a tener datos reales (confirmado por consulta directa:
-- 1 proveedor, 1 catalogo, 1 pedido). Causa: estas tablas nunca tuvieron una
-- politica de lectura para nudofy_admin, solo "el propio agente ve lo suyo" -
-- afecta a CUALQUIER agente, no solo a este cliente.
--
-- Solo SELECT (lectura) - el admin no necesita ni debe escribir directamente
-- los datos de negocio de un agente.

CREATE POLICY "nudofy_admin_read_clients" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

CREATE POLICY "nudofy_admin_read_suppliers" ON public.suppliers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

CREATE POLICY "nudofy_admin_read_catalogs" ON public.catalogs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

CREATE POLICY "nudofy_admin_read_products" ON public.products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

CREATE POLICY "nudofy_admin_read_orders" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

CREATE POLICY "nudofy_admin_read_order_items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

NOTIFY pgrst, 'reload schema';
