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

-- ============================================================
-- EMPRESAS (Plan Agencia)
-- ============================================================
CREATE TABLE public.companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  nif         TEXT,
  address     TEXT,
  plan        TEXT NOT NULL DEFAULT 'agency' CHECK (plan IN ('agency', 'agency_pro')),
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
  plan                TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'agency', 'agency_pro')),
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
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.orders
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
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
