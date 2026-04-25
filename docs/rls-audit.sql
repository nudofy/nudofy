-- ─── Nudofy · Auditoría RLS ────────────────────────────────────────────────
-- Ejecutar en Supabase SQL Editor para verificar que cada tabla tiene RLS
-- activado y políticas razonables. Cada bloque es independiente.
--
-- Tablas críticas (datos privados de cada agente / cliente):
--   agents, clients, suppliers, catalogs, products,
--   orders, order_items, product_images, client_addresses
--
-- Cada agente solo debe ver SUS clientes/proveedores/etc.
-- Cada cliente del portal solo debe ver SUS pedidos y los catálogos del agente
-- que le invitó.
-- Los nudofy_admin pueden ver todo.

-- ─── 1) Verificar que RLS está activado en todas las tablas ─────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'agents', 'clients', 'suppliers', 'catalogs', 'products',
    'orders', 'order_items', 'product_images', 'client_addresses'
  )
ORDER BY tablename;
-- Esperado: rls_enabled = true en TODAS

-- ─── 2) Listar políticas existentes por tabla ───────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,            -- SELECT / INSERT / UPDATE / DELETE / ALL
  qual,           -- USING (...)
  with_check      -- WITH CHECK (...)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'agents', 'clients', 'suppliers', 'catalogs', 'products',
    'orders', 'order_items', 'product_images', 'client_addresses'
  )
ORDER BY tablename, cmd, policyname;

-- ─── 3) Tablas SIN ninguna política ─────────────────────────────────────────
-- (con RLS activo y sin políticas → nadie puede leer/escribir, normalmente
--  un bug de configuración).
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = t.tablename
  )
  AND t.tablename IN (
    'agents', 'clients', 'suppliers', 'catalogs', 'products',
    'orders', 'order_items', 'product_images', 'client_addresses'
  );

-- ─── 4) Plantillas de políticas mínimas recomendadas ────────────────────────
-- (Solo aplicar si la auditoría muestra que faltan)
--
-- 4.1 agents: cada usuario ve solo su fila; nudofy_admin ve todas.
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY agents_self_select ON agents
--   FOR SELECT USING (id = auth.uid() OR EXISTS (
--     SELECT 1 FROM agents a WHERE a.id = auth.uid() AND a.role = 'nudofy_admin'
--   ));
-- CREATE POLICY agents_self_update ON agents
--   FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
--
-- 4.2 clients: solo el agente dueño + el cliente con user_id = auth.uid().
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY clients_owner_all ON clients
--   FOR ALL USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());
-- CREATE POLICY clients_self_select ON clients
--   FOR SELECT USING (user_id = auth.uid());
--
-- 4.3 suppliers / catalogs / products: solo el agente dueño.
-- ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY suppliers_owner_all ON suppliers
--   FOR ALL USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());
--
-- ALTER TABLE catalogs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY catalogs_owner_all ON catalogs
--   FOR ALL USING (EXISTS (
--     SELECT 1 FROM suppliers s WHERE s.id = catalogs.supplier_id AND s.agent_id = auth.uid()
--   ));
--
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY products_owner_all ON products
--   FOR ALL USING (EXISTS (
--     SELECT 1 FROM catalogs c JOIN suppliers s ON s.id = c.supplier_id
--     WHERE c.id = products.catalog_id AND s.agent_id = auth.uid()
--   ));
-- -- Lectura pública para clientes invitados (el portal accede como anon)
-- CREATE POLICY products_client_select ON products
--   FOR SELECT USING (EXISTS (
--     SELECT 1 FROM clients cl WHERE cl.user_id = auth.uid()
--   ));
--
-- 4.4 orders + order_items: dueño es el agente; el cliente solo lee los suyos.
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY orders_agent_all ON orders
--   FOR ALL USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());
-- CREATE POLICY orders_client_select ON orders
--   FOR SELECT USING (EXISTS (
--     SELECT 1 FROM clients cl WHERE cl.id = orders.client_id AND cl.user_id = auth.uid()
--   ));
-- CREATE POLICY orders_client_insert ON orders
--   FOR INSERT WITH CHECK (EXISTS (
--     SELECT 1 FROM clients cl WHERE cl.id = orders.client_id AND cl.user_id = auth.uid()
--   ));
--
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY order_items_via_order ON order_items
--   FOR ALL USING (EXISTS (
--     SELECT 1 FROM orders o WHERE o.id = order_items.order_id
--       AND (o.agent_id = auth.uid() OR EXISTS (
--         SELECT 1 FROM clients cl WHERE cl.id = o.client_id AND cl.user_id = auth.uid()
--       ))
--   ));
--
-- 4.5 client_addresses: vía cliente.
-- ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY client_addresses_via_client ON client_addresses
--   FOR ALL USING (EXISTS (
--     SELECT 1 FROM clients cl WHERE cl.id = client_addresses.client_id
--       AND (cl.agent_id = auth.uid() OR cl.user_id = auth.uid())
--   ));
--
-- 4.6 product_images: vía producto.
-- ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY product_images_via_product ON product_images
--   FOR ALL USING (EXISTS (
--     SELECT 1 FROM products p
--     JOIN catalogs c ON c.id = p.catalog_id
--     JOIN suppliers s ON s.id = c.supplier_id
--     WHERE p.id = product_images.product_id AND s.agent_id = auth.uid()
--   ));

-- ─── 5) Storage buckets ─────────────────────────────────────────────────────
-- Verificar políticas en storage.objects para buckets:
--   supplier-logos, product-images
-- Lectura pública debe estar OK; escritura solo authenticated.
SELECT
  bucket_id,
  name,
  definition
FROM storage.policies
WHERE bucket_id IN ('supplier-logos', 'product-images')
ORDER BY bucket_id, name;
