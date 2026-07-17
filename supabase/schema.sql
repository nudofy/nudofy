-- ============================================================
-- NUDOFY — Esquema de base de datos
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USUARIOS Y ROLES
-- ============================================================
-- Nota: Supabase crea auth.users automáticamente.
-- Esta tabla extiende los datos del usuario autenticado.

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('nudofy_admin', 'company_admin', 'agent', 'client')),
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear registro en public.users tras registro en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'agent'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: cuando un cliente invitado (portal) crea su cuenta, enlazar su
-- fila en public.clients (creada de antemano por el agente, sin user_id)
-- con el nuevo auth.users.id, buscando por email.
CREATE OR REPLACE FUNCTION public.handle_client_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clients
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_auth_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_client_invitation_accepted();

-- ============================================================
-- PLANES (tabla de precios pública — leída por la web y la app)
-- ============================================================
CREATE TABLE public.plans (
  id                  TEXT PRIMARY KEY, -- 'basic' | 'pro' | 'agency' | ...
  name                TEXT NOT NULL,
  tagline             TEXT,
  price_monthly       NUMERIC,
  price_extra_agent   NUMERIC,
  currency            TEXT NOT NULL DEFAULT 'EUR',
  billing_period      TEXT NOT NULL DEFAULT 'monthly',
  trial_days          INTEGER NOT NULL DEFAULT 15,
  max_agents          INTEGER,
  agents_included      INTEGER DEFAULT 1,
  max_catalogs        INTEGER,
  max_products        INTEGER,
  max_clients         INTEGER,
  max_orders_month    INTEGER,
  max_suppliers       INTEGER,
  features            JSONB NOT NULL DEFAULT '[]',
  -- Flags de la tabla comparativa de precios (nudofy-web). Antes vivían
  -- hardcodeados en un mapa aparte en precios/page.tsx ("si cambias
  -- features de los planes, ajusta aquí también") — desincronización real
  -- encontrada en la auditoría del 14 jul. Añadido 2026-07-15.
  portal_cliente      BOOLEAN NOT NULL DEFAULT TRUE,
  csv_import          BOOLEAN NOT NULL DEFAULT FALSE,
  stats_avanzadas     BOOLEAN NOT NULL DEFAULT FALSE,
  soporte             TEXT NOT NULL DEFAULT 'Email',
  cta_label           TEXT NOT NULL DEFAULT 'Empezar 15 días gratis',
  cta_href            TEXT,
  highlighted         BOOLEAN NOT NULL DEFAULT FALSE,
  is_public           BOOLEAN NOT NULL DEFAULT TRUE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EMPRESAS (Plan Agencia)
-- ============================================================
CREATE TABLE public.companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  nif         TEXT,
  address     TEXT,
  phone       TEXT,
  -- Toda cuenta con equipo tiene empresa propia (creada por register-agent),
  -- así que el plan puede ser cualquiera de los planes de pago actuales.
  plan        TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'agency')),
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.company_users (
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
  PRIMARY KEY (company_id, user_id)
);

-- ============================================================
-- AGENTES
-- ============================================================
CREATE TABLE public.agents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id          UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  business_name       TEXT,
  nif                 TEXT,
  plan                TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('free', 'free_pro', 'basic', 'pro', 'agency')),
  stripe_customer_id  TEXT,
  active              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE public.clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL, -- null si no tiene acceso al portal
  name            TEXT NOT NULL,
  fiscal_name     TEXT,
  nif             TEXT,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  client_type     TEXT, -- campo libre definido por el agente
  payment_method  TEXT,
  iban            TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROVEEDORES
-- ============================================================
CREATE TABLE public.suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id    UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  contact     TEXT,
  conditions  TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATÁLOGOS
-- ============================================================
CREATE TABLE public.catalogs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  season      TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTOS
-- ============================================================
CREATE TABLE public.products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_id  UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  reference   TEXT,
  barcode     TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  image_url   TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_catalog ON public.products(catalog_id);

-- ============================================================
-- ACCESO CLIENTE AL PORTAL
-- ============================================================
CREATE TABLE public.client_portal_access (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  catalog_id  UUID REFERENCES public.catalogs(id) ON DELETE CASCADE, -- null = todos los catálogos del proveedor
  enabled     BOOLEAN DEFAULT TRUE,
  invited_at  TIMESTAMPTZ,
  last_access TIMESTAMPTZ
);

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE public.orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id      UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id),
  catalog_id    UUID REFERENCES public.catalogs(id),
  order_number  TEXT UNIQUE, -- formato NUD-YYYY-XXXX
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent_to_supplier', 'cancelled')),
  total         NUMERIC(10,2) DEFAULT 0,
  discount_code TEXT,
  notes         TEXT,
  pdf_url       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  sent_at       TIMESTAMPTZ
);

CREATE INDEX idx_orders_agent ON public.orders(agent_id);
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- Función para generar número de pedido NUD-YYYY-XXXX
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num  INT;
  order_num TEXT;
BEGIN
  -- Los borradores no necesitan order_number
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;
  -- Si ya tiene order_number (borrador que se confirma), no sobreescribir
  IF NEW.order_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  year_str := TO_CHAR(NOW(), 'YYYY');

  -- Bloqueo de transacción por año para serializar confirmaciones concurrentes
  -- (evita que dos inserts casi simultáneos calculen el mismo número)
  PERFORM pg_advisory_xact_lock(hashtext('order_number_' || year_str));

  -- MAX en vez de COUNT: inmune a huecos por pedidos borrados
  SELECT COALESCE(MAX(SUBSTRING(order_number FROM 'NUD-\d{4}-(\d+)')::INT), 0) + 1
  INTO seq_num
  FROM public.orders
  WHERE order_number LIKE 'NUD-' || year_str || '-%';

  order_num := 'NUD-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.order_number := order_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- LÍNEAS DE PEDIDO
-- ============================================================
CREATE TABLE public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id),
  quantity    INT NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,
  total       NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
-- FACTURAS (Nudofy → Agentes)
-- ============================================================
CREATE TABLE public.invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id            UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  company_id          UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  invoice_number      TEXT UNIQUE, -- formato NUD-FAC-YYYY-XXXX
  plan                TEXT NOT NULL,
  amount              NUMERIC(10,2) NOT NULL,
  iva                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  stripe_payment_id   TEXT,
  period              TEXT NOT NULL, -- ej. "2026-04"
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL, -- 'new_order' | 'plan_limit' | 'payment_failed' | etc.
  title       TEXT NOT NULL,
  body        TEXT,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- ============================================================
-- CONFIGURACIÓN DE PLATAFORMA (panel admin → Configuración)
-- ============================================================
-- Solo para ajustes NO sensibles (nombre de app, modo mantenimiento, etc.).
-- Los secretos (Stripe secret key, Stripe webhook secret, Resend API key)
-- NUNCA van aquí: esta tabla es legible por el cliente de nudofy_admin
-- (aunque restringida por RLS), así que cualquier valor guardado aquí viaja
-- al dispositivo del admin. Van como Edge Function secrets
-- (`supabase secrets set NOMBRE=valor`), leídos solo server-side con
-- Deno.env.get(). El CHECK de abajo bloquea insertar esas claves por error.
CREATE TABLE public.app_config (
  key         TEXT PRIMARY KEY
                CHECK (key NOT IN ('stripe_sk', 'stripe_webhook', 'resend_api_key')),
  value       TEXT
);

-- ============================================================
-- LEADS DE CONTACTO (nudofy-web /contacto)
-- ============================================================
-- Antes /contacto solo abría un mailto: (sin backend, sin registro).
-- Se inserta exclusivamente desde la edge function contact-lead (service
-- role) — no hay política de INSERT para el cliente.
CREATE TABLE public.contact_leads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  reason      TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuarios: solo pueden leer su propio perfil
CREATE POLICY "users_own_profile" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Agentes: acceso a sus propios datos
CREATE POLICY "agents_own_data" ON public.agents
  FOR ALL USING (user_id = auth.uid());

-- Función auxiliar SECURITY DEFINER: evita la recursión infinita de RLS
-- que se produce si la policy de "agents" consulta "agents" directamente.
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT company_id FROM public.agents WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Agentes: ver (solo lectura) a los compañeros de su misma empresa,
-- necesario para que "Mi empresa" liste a los agentes invitados.
CREATE POLICY "agents_same_company_select" ON public.agents
  FOR SELECT USING (
    company_id IS NOT NULL AND company_id = public.my_company_id()
  );

-- Empresas: un agente puede leer los datos de su propia empresa
-- (necesario para que "Mi empresa" resuelva el plan y los límites).
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_own_select" ON public.companies
  FOR SELECT USING (id = public.my_company_id());

-- ============================================================
-- NOTA: reconciliado 2026-07-14 contra el estado REAL de producción
-- (schema.sql llevaba tiempo desincronizado de la BD viva — ver auditoría).
-- Estas políticas de "invoices"/"company_users"/admin YA estaban aplicadas
-- en producción (probablemente pegadas a mano en el SQL Editor en su día)
-- pero nunca se habían vuelto a copiar aquí. Se documentan tal cual están
-- en vivo, sin re-ejecutarlas, para que este archivo deje de mentir.
-- ============================================================

-- Empresas: nudofy_admin tiene acceso total (además de companies_own_select).
CREATE POLICY "companies_admin_only" ON public.companies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

-- Agentes: nudofy_admin tiene acceso total (además de agents_own_data /
-- agents_same_company_select). Nota: las políticas de DELETE/UPDATE usan
-- auth.jwt()->'user_metadata'->>'role' en vez de consultar public.users
-- como la de SELECT — son dos formas distintas de comprobar "es admin" que
-- pueden desincronizarse si el rol se cambia en public.users sin refrescar
-- el JWT. Fuera del alcance de este fix puntual, pero queda anotado.
CREATE POLICY "nudofy_admin puede ver todos los agentes" ON public.agents
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'nudofy_admin'
  );
CREATE POLICY "nudofy_admin_update_agents" ON public.agents
  FOR UPDATE USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'nudofy_admin'
  );
CREATE POLICY "nudofy_admin_delete_agents" ON public.agents
  FOR DELETE USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'nudofy_admin'
  );

-- company_users: SOLO nudofy_admin (ni siquiera el propio company_admin
-- puede leer su equipo por esta vía — ver "Mi empresa": ese flujo lee la
-- lista de compañeros a través de agents_same_company_select, no de aquí).
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_users_admin_only" ON public.company_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

-- invoices: el agente ve solo sus propias facturas; nudofy_admin gestiona todas.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_own_agent" ON public.invoices
  FOR SELECT USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );
CREATE POLICY "invoices_admin_all" ON public.invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

-- plans: lectura pública de planes activos y publicados (web de precios y
-- selector de plan en el registro). Nota: en producción hay dos políticas
-- de SELECT duplicadas con el mismo efecto ("anon puede leer planes
-- publicos" y "plans_public_read") — inofensivo, se documenta solo una.
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans
  FOR SELECT USING (is_active = TRUE AND is_public = TRUE);

-- Bug real encontrado y arreglado el 2026-07-15 (no solo desincronización):
-- app/(admin)/planes.tsx hace insert/update/delete directo sobre esta tabla
-- desde el cliente, pero no existía NINGUNA política de escritura — el
-- editor de planes del panel admin estaba roto (todo insert/update/delete
-- fallaba por RLS). Aplicado en prod y verificado.
CREATE POLICY "plans_admin_all" ON public.plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

-- contact_leads: solo nudofy_admin puede leerlos (el INSERT es solo vía
-- edge function con service role, no hay política de INSERT para el cliente).
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_leads_admin_read" ON public.contact_leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

-- app_config: solo nudofy_admin (nunca contiene secretos, ver CHECK arriba).
-- Nota: en producción hay dos políticas duplicadas con el mismo efecto
-- ("Solo nudofy_admin" y "admin_all") — inofensivo pero redundante, se deja
-- solo una documentada aquí; limpiar la duplicada es opcional.
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON public.app_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'nudofy_admin')
  );

-- Clientes: el agente ve sus propios clientes
CREATE POLICY "clients_by_agent" ON public.clients
  FOR ALL USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Proveedores: el agente ve sus proveedores
CREATE POLICY "suppliers_by_agent" ON public.suppliers
  FOR ALL USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Catálogos: el agente ve catálogos de sus proveedores
CREATE POLICY "catalogs_by_agent" ON public.catalogs
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM public.suppliers
      WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
  );

-- Productos: el agente ve productos de sus catálogos
CREATE POLICY "products_by_agent" ON public.products
  FOR ALL USING (
    catalog_id IN (
      SELECT c.id FROM public.catalogs c
      JOIN public.suppliers s ON c.supplier_id = s.id
      WHERE s.agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
  );

-- Pedidos: el agente ve sus pedidos
CREATE POLICY "orders_by_agent" ON public.orders
  FOR ALL USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Líneas de pedido: acceso a través del pedido
CREATE POLICY "order_items_by_agent" ON public.order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
  );

-- Notificaciones: solo el propio usuario
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- POLÍTICAS ADICIONALES — Portal del cliente (Fase 3)
-- ============================================================

-- Clientes: el propio cliente ve y edita su ficha
CREATE POLICY "clients_own_profile" ON public.clients
  FOR ALL USING (user_id = auth.uid());

-- Acceso al portal: el cliente ve sus propios accesos
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_access_by_client" ON public.client_portal_access
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Proveedores: el cliente ve los proveedores a los que tiene acceso
CREATE POLICY "suppliers_by_client" ON public.suppliers
  FOR SELECT USING (
    id IN (
      SELECT cpa.supplier_id FROM public.client_portal_access cpa
      JOIN public.clients c ON cpa.client_id = c.id
      WHERE c.user_id = auth.uid() AND cpa.enabled = TRUE
    )
  );

-- Catálogos: el cliente ve los catálogos permitidos
CREATE POLICY "catalogs_by_client" ON public.catalogs
  FOR SELECT USING (
    supplier_id IN (
      SELECT cpa.supplier_id FROM public.client_portal_access cpa
      JOIN public.clients c ON cpa.client_id = c.id
      WHERE c.user_id = auth.uid() AND cpa.enabled = TRUE
        AND (cpa.catalog_id IS NULL OR cpa.catalog_id = catalogs.id)
    )
  );

-- Productos: el cliente ve productos de los catálogos permitidos
CREATE POLICY "products_by_client" ON public.products
  FOR SELECT USING (
    catalog_id IN (
      SELECT cat.id FROM public.catalogs cat
      JOIN public.client_portal_access cpa ON cpa.supplier_id = cat.supplier_id
      JOIN public.clients c ON cpa.client_id = c.id
      WHERE c.user_id = auth.uid() AND cpa.enabled = TRUE
        AND (cpa.catalog_id IS NULL OR cpa.catalog_id = cat.id)
    )
  );

-- Pedidos: el cliente ve sus propios pedidos
CREATE POLICY "orders_by_client" ON public.orders
  FOR ALL USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Líneas de pedido: el cliente ve las líneas de sus pedidos
CREATE POLICY "order_items_by_client" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Agentes: el cliente puede ver el agente que le gestiona
CREATE POLICY "agents_visible_to_client" ON public.agents
  FOR SELECT USING (
    id IN (
      SELECT agent_id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- NOTA IMPORTANTE sobre el alta de usuarios
-- ============================================================
-- El trigger handle_new_user() (definido más arriba) SOLO inserta en
-- public.users. La fila de public.agents la crea la edge function
-- `register-agent`, que también crea la empresa y asigna el plan/rol reales.
--
-- NO añadir aquí un segundo trigger que inserte en public.agents: hacerlo
-- duplica la fila del agente y provoca que los .single() del alta devuelvan
-- 406 "not exactly one row", bloqueando TODOS los registros nuevos.
-- (Este bug ya ocurrió una vez en producción — ver historial.)
