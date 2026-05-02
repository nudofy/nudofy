import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Order } from '@/hooks/useAgent';

// ——————————————————————————————
// Tipos
// ——————————————————————————————
export interface ClientProfile {
  id: string;
  agent_id: string;
  name: string;
  fiscal_name?: string;
  nif?: string;
  email?: string;
  phone?: string;
  address?: string;
  client_type?: string;
  payment_method?: string;
  notes?: string;
  tariff_id?: string | null;
  created_at: string;
}

export interface ClientAgent {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface PortalSupplier {
  id: string;
  name: string;
  access_id: string;
  catalog_id?: string; // null = todos los catálogos del proveedor
  logo_url?: string | null;
}

export interface PortalCatalog {
  id: string;
  name: string;
  season?: string;
  supplier_id: string;
  status: string;
  product_count?: number;
}

export interface PortalProduct {
  id: string;
  catalog_id: string;
  name: string;
  reference?: string;
  barcode?: string;
  price: number;
  description?: string;
  image_url?: string;
  stock?: number | null;
}

// ——————————————————————————————
// Datos del cliente autenticado
// ——————————————————————————————
export function useClientData() {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [agent, setAgent] = useState<ClientAgent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('clients')
      .select('*, agent:agents(id, name, email, phone)')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const { agent: agentData, ...clientData } = data as any;
          setClient(clientData);
          setAgent(agentData);
        }
        setLoading(false);
      });
  }, [user]);

  return { client, agent, loading };
}

// ——————————————————————————————
// Proveedores accesibles en el portal
// ——————————————————————————————
export function useClientPortalSuppliers(clientId?: string) {
  const [suppliers, setSuppliers] = useState<PortalSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('client_portal_access')
      .select('id, supplier_id, catalog_id, supplier:suppliers(id, name, logo_url)')
      .eq('client_id', clientId)
      .eq('enabled', true);

    const mapped = (data ?? []).map((row: any) => ({
      id: row.supplier?.id,
      name: row.supplier?.name,
      access_id: row.id,
      catalog_id: row.catalog_id ?? undefined,
      logo_url: row.supplier?.logo_url ?? null,
    }));
    setSuppliers(mapped);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  return { suppliers, loading, refetch: fetchSuppliers };
}

// ——————————————————————————————
// Catálogos de un proveedor (portal cliente)
// ——————————————————————————————
export function useClientCatalogs(supplierId?: string, restrictCatalogId?: string) {
  const [catalogs, setCatalogs] = useState<PortalCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalogs = useCallback(async () => {
    if (!supplierId) { setLoading(false); return; }
    let query = supabase
      .from('catalogs')
      .select('id, supplier_id, name, season, status, products(count)')
      .eq('supplier_id', supplierId)
      .eq('status', 'active');

    if (restrictCatalogId) query = query.eq('id', restrictCatalogId);

    const { data } = await query.order('name');
    const mapped = (data ?? []).map((c: any) => ({
      ...c,
      product_count: c.products?.[0]?.count ?? 0,
    }));
    setCatalogs(mapped);
    setLoading(false);
  }, [supplierId, restrictCatalogId]);

  useEffect(() => { fetchCatalogs(); }, [fetchCatalogs]);

  return { catalogs, loading };
}

// ——————————————————————————————
// Productos de un catálogo (portal cliente)
// tariffId se pasa desde el llamador (useClientData ya lo tiene via client.tariff_id)
// para evitar queries redundantes de auth y clients dentro del hook.
// ——————————————————————————————
export function useClientProducts(catalogId?: string, search?: string, tariffId?: string | null) {
  const [products, setProducts] = useState<PortalProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!catalogId) { setLoading(false); return; }

    // 1) Productos publicados del catálogo
    const { data } = await supabase
      .from('products')
      .select('id, catalog_id, name, reference, barcode, price, description, image_url, stock')
      .eq('catalog_id', catalogId)
      .eq('active', true)
      .eq('published', true)
      .order('name');

    const list: PortalProduct[] = (data ?? []) as any;

    // 2) Aplicar tarifa si se proporcionó
    if (tariffId && list.length > 0) {
      const ids = list.map(p => p.id);
      const [{ data: pps }, { data: tariff }] = await Promise.all([
        supabase
          .from('product_prices')
          .select('product_id, price')
          .eq('tariff_id', tariffId)
          .in('product_id', ids),
        supabase
          .from('tariffs')
          .select('discount_percent')
          .eq('id', tariffId)
          .maybeSingle(),
      ]);
      const map = new Map<string, number>();
      for (const pp of pps ?? []) map.set(pp.product_id, pp.price);
      const disc = (tariff as any)?.discount_percent;
      for (const p of list) {
        const tp = map.get(p.id);
        if (tp != null) {
          p.price = tp;
        } else if (disc != null && disc > 0) {
          p.price = Math.round(p.price * (1 - disc / 100) * 100) / 100;
        }
      }
    }

    setProducts(list);
    setLoading(false);
  }, [catalogId, tariffId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = search
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').includes(search)
      )
    : products;

  return { products: filtered, loading };
}

// ——————————————————————————————
// Pedidos del cliente
// ——————————————————————————————
export function useClientOrders(clientId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total, discount_code, notes, created_at, sent_at,
        supplier:suppliers(id, name),
        catalog:catalogs(id, name)
      `)
      .eq('client_id', clientId)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    setOrders((data as any[]) ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}

// ——————————————————————————————
// Confirmar pedido desde el carrito del cliente
// ——————————————————————————————
export async function confirmClientOrder(params: {
  agentId: string;
  clientId: string;
  supplierId: string;
  catalogId: string;
  items: {
    product_id: string;
    unit_price: number;
    quantity: number;
    attributes?: Record<string, string> | null;
    variant_id?: string | null;
  }[];
  notes?: string;
}) {
  const { agentId, clientId, supplierId, catalogId, items, notes } = params;

  // Crear pedido
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      agent_id: agentId,
      client_id: clientId,
      supplier_id: supplierId,
      catalog_id: catalogId,
      status: 'confirmed',
      total,
      notes,
    })
    .select()
    .single();

  if (orderError || !order) return { error: orderError?.message ?? 'Error al crear pedido', data: null };

  // Insertar líneas
  const lines = items.map(i => ({
    order_id: order.id,
    product_id: i.product_id,
    unit_price: i.unit_price,
    quantity: i.quantity,
    attributes: i.attributes ?? null,
    variant_id: i.variant_id ?? null,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(lines);
  if (itemsError) return { error: itemsError.message, data: null };

  return { error: null, data: order };
}
