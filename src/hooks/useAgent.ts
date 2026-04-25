import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ——————————————————————————————
// Tipos
// ——————————————————————————————
export interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: string;
}

export interface Client {
  id: string;
  name: string;
  fiscal_name?: string;
  nif?: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_name?: string;
  client_type?: string;
  payment_method?: string;
  iban?: string;
  notes?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  conditions?: string;
  logo_url?: string;
  active: boolean;
  catalog_count?: number;
}

export interface Catalog {
  id: string;
  supplier_id: string;
  name: string;
  season?: string;
  status: 'active' | 'archived';
  created_at: string;
  product_count?: number;
}

export interface Product {
  id: string;
  catalog_id: string;
  name: string;
  reference?: string;
  reference_2?: string;
  barcode?: string;
  familia?: string;
  subfamilia?: string;
  price: number;
  pvpr?: number;
  description?: string;
  measures?: string;
  stock?: number;
  standard_box?: number;
  min_units?: number;
  image_url?: string;
  vat_rate?: number | null;
  active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  position: number;
}

export interface Order {
  id: string;
  client_id?: string;
  supplier_id: string;
  catalog_id?: string;
  order_number?: string;
  status: 'draft' | 'confirmed' | 'sent_to_supplier' | 'cancelled';
  total: number;
  discount_code?: string;
  notes?: string;
  pdf_url?: string;
  created_at: string;
  sent_at?: string;
  client?: Pick<Client, 'id' | 'name'>;
  supplier?: Pick<Supplier, 'id' | 'name'>;
  catalog?: Pick<Catalog, 'id' | 'name'>;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  product?: Pick<Product, 'id' | 'name' | 'reference'>;
}

// ——————————————————————————————
// Hook principal del agente
// ——————————————————————————————
export function useAgent() {
  const { user } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('agents')
      .select('id, name, email, phone, plan')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setAgent(data);
        setLoading(false);
      });
  }, [user]);

  return { agent, loading };
}

// ——————————————————————————————
// Clientes
// ——————————————————————————————
export function useClients() {
  const { agent } = useAgent();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!agent) return;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('agent_id', agent.id)
      .order('name');
    setClients(data ?? []);
    setLoading(false);
  }, [agent]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function createClient(values: Omit<Client, 'id' | 'created_at'>) {
    if (!agent) return { error: 'No hay agente' };
    const { error } = await supabase
      .from('clients')
      .insert({ ...values, agent_id: agent.id });
    if (!error) fetchClients();
    return { error: error?.message ?? null };
  }

  async function updateClient(id: string, values: Partial<Client>) {
    const { error } = await supabase.from('clients').update(values).eq('id', id);
    if (!error) fetchClients();
    return { error: error?.message ?? null };
  }

  return { clients, loading, createClient, updateClient, refetch: fetchClients };
}

// ——————————————————————————————
// Proveedores
// ——————————————————————————————
export function useSuppliers() {
  const { agent } = useAgent();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    if (!agent) return;
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, contact, conditions, logo_url, active, catalogs(count)')
      .eq('agent_id', agent.id)
      .order('name');

    const mapped = (data ?? []).map((s: any) => ({
      ...s,
      catalog_count: s.catalogs?.[0]?.count ?? 0,
    }));
    setSuppliers(mapped);
    setLoading(false);
  }, [agent]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  async function createSupplier(values: Omit<Supplier, 'id' | 'catalog_count'>) {
    if (!agent) return { error: 'No hay agente', data: null };
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...values, agent_id: agent.id })
      .select('id')
      .single();
    if (!error) fetchSuppliers();
    return { error: error?.message ?? null, data };
  }

  async function updateSupplier(id: string, values: Partial<Supplier>) {
    const { error } = await supabase.from('suppliers').update(values).eq('id', id);
    if (!error) fetchSuppliers();
    return { error: error?.message ?? null };
  }

  return { suppliers, loading, createSupplier, updateSupplier, refetch: fetchSuppliers };
}

// ——————————————————————————————
// Catálogos
// ——————————————————————————————
export function useCatalogs(supplierId?: string) {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalogs = useCallback(async () => {
    if (!supplierId) { setLoading(false); return; }
    const { data } = await supabase
      .from('catalogs')
      .select('id, supplier_id, name, season, status, created_at, products(count)')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    const mapped = (data ?? []).map((c: any) => ({
      ...c,
      product_count: c.products?.[0]?.count ?? 0,
    }));
    setCatalogs(mapped);
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { fetchCatalogs(); }, [fetchCatalogs]);

  async function createCatalog(values: Omit<Catalog, 'id' | 'created_at' | 'product_count'>) {
    const { error } = await supabase.from('catalogs').insert(values);
    if (!error) fetchCatalogs();
    return { error: error?.message ?? null };
  }

  return { catalogs, loading, createCatalog, refetch: fetchCatalogs };
}

// ——————————————————————————————
// Productos
// ——————————————————————————————
export function useProducts(catalogId?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!catalogId) { setLoading(false); return; }
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('catalog_id', catalogId)
      .eq('active', true)
      .order('name');
    setProducts(data ?? []);
    setLoading(false);
  }, [catalogId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function createProduct(values: Omit<Product, 'id' | 'catalog_id' | 'active'>) {
    if (!catalogId) return { error: 'Sin catálogo', data: null };
    const { data, error } = await supabase
      .from('products')
      .insert({ ...values, catalog_id: catalogId, active: true })
      .select('id')
      .single();
    if (!error) fetchProducts();
    return { error: error?.message ?? null, data };
  }

  async function updateProduct(productId: string, values: Partial<Product>) {
    const { error } = await supabase.from('products').update(values).eq('id', productId);
    if (!error) fetchProducts();
    return { error: error?.message ?? null };
  }

  return { products, loading, createProduct, updateProduct, refetch: fetchProducts };
}

// ——————————————————————————————
// Pedidos
// ——————————————————————————————
export function useOrders(status?: Order['status'] | Order['status'][]) {
  const { agent } = useAgent();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!agent) return;
    let query = supabase
      .from('orders')
      .select(`
        id, client_id, supplier_id, catalog_id, order_number,
        status, total, discount_code, notes, pdf_url, created_at, sent_at,
        client:clients(id, name),
        supplier:suppliers(id, name),
        catalog:catalogs(id, name)
      `)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (status) {
      if (Array.isArray(status)) query = query.in('status', status);
      else query = query.eq('status', status);
    }

    const { data } = await query;
    setOrders((data as any[]) ?? []);
    setLoading(false);
  }, [agent, status]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function createOrder(values: {
    client_id?: string;
    supplier_id: string;
    catalog_id?: string;
  }) {
    if (!agent) return { error: 'No hay agente', data: null };
    const { data, error } = await supabase
      .from('orders')
      .insert({ ...values, agent_id: agent.id, status: 'draft' })
      .select()
      .single();
    if (!error) fetchOrders();
    return { error: error?.message ?? null, data };
  }

  async function updateOrderStatus(id: string, newStatus: Order['status']) {
    const update: any = { status: newStatus };
    if (newStatus === 'sent_to_supplier') update.sent_at = new Date().toISOString();
    const { error } = await supabase.from('orders').update(update).eq('id', id);
    if (!error) fetchOrders();
    return { error: error?.message ?? null };
  }

  async function deleteOrder(id: string) {
    // Borra los items primero (foreign key), luego el pedido
    await supabase.from('order_items').delete().eq('order_id', id);
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) fetchOrders();
    return { error: error?.message ?? null };
  }

  return { orders, loading, createOrder, updateOrderStatus, deleteOrder, refetch: fetchOrders };
}

// ——————————————————————————————
// Estadísticas
// ——————————————————————————————
export interface MonthStat { month: number; year: number; orders: number; total: number; label: string; }
export interface YearStat  { year: number; orders: number; total: number; }

export function useStats() {
  const { agent } = useAgent();
  const [monthStats, setMonthStats] = useState<MonthStat[]>([]);
  const [yearStats, setYearStats]   = useState<YearStat[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  useEffect(() => {
    if (!agent) return;
    supabase
      .from('orders')
      .select('total, created_at, status')
      .eq('agent_id', agent.id)
      .in('status', ['confirmed', 'sent_to_supplier'])
      .then(({ data }) => {
        const orders = data ?? [];
        setTotalOrders(orders.length);
        setTotalRevenue(orders.reduce((s, o) => s + (o.total ?? 0), 0));

        // Group by month (current year)
        const currentYear = new Date().getFullYear();
        const byMonth: Record<number, { orders: number; total: number }> = {};
        for (let m = 0; m < 12; m++) byMonth[m] = { orders: 0, total: 0 };

        // Group by year
        const byYear: Record<number, { orders: number; total: number }> = {};

        orders.forEach(o => {
          const d = new Date(o.created_at);
          const y = d.getFullYear();
          const m = d.getMonth();
          if (y === currentYear) {
            byMonth[m].orders++;
            byMonth[m].total += o.total ?? 0;
          }
          if (!byYear[y]) byYear[y] = { orders: 0, total: 0 };
          byYear[y].orders++;
          byYear[y].total += o.total ?? 0;
        });

        setMonthStats(
          Object.entries(byMonth).map(([m, v]) => ({
            month: Number(m), year: currentYear,
            orders: v.orders, total: v.total,
            label: MONTH_NAMES[Number(m)],
          }))
        );

        setYearStats(
          Object.entries(byYear)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([y, v]) => ({ year: Number(y), orders: v.orders, total: v.total }))
        );

        setLoading(false);
      });
  }, [agent]);

  return { monthStats, yearStats, totalOrders, totalRevenue, loading };
}

// ——————————————————————————————
// KPIs del inicio
// ——————————————————————————————
export function useDashboardKPIs() {
  const { agent } = useAgent();
  const [kpis, setKpis] = useState({ ordersThisMonth: 0, totalThisMonth: 0, totalToday: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    Promise.all([
      supabase
        .from('orders')
        .select('total, created_at')
        .eq('agent_id', agent.id)
        .in('status', ['confirmed', 'sent_to_supplier'])
        .gte('created_at', startOfMonth),
      supabase
        .from('orders')
        .select(`
          id, order_number, status, total, created_at,
          client:clients(id, name),
          supplier:suppliers(id, name)
        `)
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]).then(([monthRes, recentRes]) => {
      const monthOrders = monthRes.data ?? [];
      const totalMonth = monthOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
      const totalToday = monthOrders
        .filter(o => o.created_at >= startOfDay)
        .reduce((sum, o) => sum + (o.total ?? 0), 0);

      setKpis({
        ordersThisMonth: monthOrders.length,
        totalThisMonth: totalMonth,
        totalToday,
      });
      setRecentOrders((recentRes.data as any[]) ?? []);
      setLoading(false);
    });
  }, [agent]);

  return { kpis, recentOrders, loading };
}
