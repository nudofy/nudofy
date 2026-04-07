import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ——————————————————————————————
// Tipos
// ——————————————————————————————
export interface AdminAgent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  plan: 'basic' | 'pro' | 'agency' | 'agency_pro';
  active: boolean;
  created_at: string;
  company_id?: string;
  client_count?: number;
  order_count?: number;
}

export interface AdminCompany {
  id: string;
  name: string;
  nif?: string;
  address?: string;
  plan: 'agency' | 'agency_pro';
  active: boolean;
  created_at: string;
  agent_count?: number;
  client_count?: number;
  product_count?: number;
}

export interface AdminInvoice {
  id: string;
  agent_id?: string;
  company_id?: string;
  invoice_number?: string;
  plan: string;
  amount: number;
  iva: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  period: string;
  created_at: string;
  agent?: { name: string; email: string };
}

export interface AdminKPIs {
  mrr: number;
  activeAgents: number;
  ordersThisMonth: number;
  pendingPayments: number;
  mrrDelta: number;
  agentsDelta: number;
}

// ——————————————————————————————
// KPIs globales
// ——————————————————————————————
export function useAdminKPIs() {
  const [kpis, setKpis] = useState<AdminKPIs>({
    mrr: 0, activeAgents: 0, ordersThisMonth: 0,
    pendingPayments: 0, mrrDelta: 0, agentsDelta: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    Promise.all([
      supabase.from('agents').select('id, plan, active, created_at'),
      supabase.from('orders').select('id, created_at').gte('created_at', startOfMonth),
      supabase.from('invoices').select('total, status, period, created_at, agent_id'),
    ]).then(([agentsRes, ordersRes, invoicesRes]) => {
      const agents = agentsRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const invoices = invoicesRes.data ?? [];

      const PLAN_PRICE: Record<string, number> = { basic: 9, pro: 19, agency: 39, agency_pro: 79 };
      const activeAgents = agents.filter(a => a.active);
      const mrr = activeAgents.reduce((s, a) => s + (PLAN_PRICE[a.plan] ?? 0), 0);

      const lastMonthInvoices = invoices.filter(
        i => i.created_at >= startOfLastMonth && i.created_at < startOfMonth
      );
      const mrrLast = lastMonthInvoices.reduce((s, i) => s + i.total, 0);
      const mrrDelta = mrrLast > 0 ? ((mrr - mrrLast) / mrrLast) * 100 : 0;

      const agentsThisMonth = agents.filter(a => a.created_at >= startOfMonth).length;
      const agentsDelta = agentsThisMonth;

      const pendingPayments = agents.filter(a => {
        const inv = invoices.find(i => i.agent_id === a.id && i.status !== 'paid');
        return !!inv;
      }).length;

      setKpis({
        mrr,
        activeAgents: activeAgents.length,
        ordersThisMonth: orders.length,
        pendingPayments,
        mrrDelta,
        agentsDelta,
      });
      setLoading(false);
    });
  }, []);

  return { kpis, loading };
}

// ——————————————————————————————
// Lista de agentes
// ——————————————————————————————
export function useAdminAgents() {
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from('agents')
      .select('id, user_id, name, email, phone, plan, active, created_at, company_id')
      .order('created_at', { ascending: false });

    setAgents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  async function updateAgentPlan(id: string, plan: AdminAgent['plan']) {
    const { error } = await supabase.from('agents').update({ plan }).eq('id', id);
    if (!error) fetchAgents();
    return { error: error?.message ?? null };
  }

  async function toggleAgentActive(id: string, active: boolean) {
    const { error } = await supabase.from('agents').update({ active }).eq('id', id);
    if (!error) fetchAgents();
    return { error: error?.message ?? null };
  }

  // Dar de alta un agente individual
  async function createAgent(data: {
    name: string;
    email: string;
    phone?: string;
    business_name?: string;
    nif?: string;
    plan: AdminAgent['plan'];
  }) {
    // 1. Crear usuario en Supabase Auth (invite)
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      data.email,
      { data: { role: 'agent' } }
    );
    if (authError) return { error: authError.message };

    const userId = authData.user?.id;
    if (!userId) return { error: 'No se pudo crear el usuario' };

    // 2. Insertar en agents
    const { error: agentError } = await supabase.from('agents').insert({
      user_id: userId,
      name: `${data.name}`,
      email: data.email,
      phone: data.phone ?? null,
      business_name: data.business_name ?? null,
      nif: data.nif ?? null,
      plan: data.plan,
      active: true,
    });

    if (agentError) return { error: agentError.message };
    fetchAgents();
    return { error: null };
  }

  return { agents, loading, updateAgentPlan, toggleAgentActive, createAgent, refetch: fetchAgents };
}

// ——————————————————————————————
// Ficha de un agente
// ——————————————————————————————
export function useAdminAgentDetail(agentId?: string) {
  const [agent, setAgent] = useState<AdminAgent | null>(null);
  const [clientCount, setClientCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    Promise.all([
      supabase
        .from('agents')
        .select('id, user_id, name, email, phone, plan, active, created_at, company_id')
        .eq('id', agentId)
        .single(),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
      supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
    ]).then(([agentRes, clientsRes, ordersRes, suppliersRes]) => {
      setAgent(agentRes.data as any);
      setClientCount(clientsRes.count ?? 0);
      setOrderCount(ordersRes.count ?? 0);
      setSupplierCount(suppliersRes.count ?? 0);
      setLoading(false);
    });
  }, [agentId]);

  return { agent, clientCount, orderCount, supplierCount, loading };
}

// ——————————————————————————————
// Lista de empresas
// ——————————————————————————————
export function useAdminCompanies() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name, nif, address, plan, active, created_at')
      .order('created_at', { ascending: false });

    setCompanies(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  async function toggleCompanyActive(id: string, active: boolean) {
    const { error } = await supabase.from('companies').update({ active }).eq('id', id);
    if (!error) fetchCompanies();
    return { error: error?.message ?? null };
  }

  // Dar de alta una empresa con su admin
  async function createCompany(data: {
    name: string;
    nif?: string;
    address?: string;
    phone?: string;
    plan: 'agency' | 'agency_pro';
    adminName: string;
    adminEmail: string;
  }) {
    // 1. Crear empresa
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({ name: data.name, nif: data.nif ?? null, address: data.address ?? null, plan: data.plan, active: true })
      .select()
      .single();

    if (companyError) return { error: companyError.message };
    const companyId = companyData.id;

    // 2. Crear usuario admin (invite)
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      data.adminEmail,
      { data: { role: 'company_admin' } }
    );
    if (authError) return { error: authError.message };

    const userId = authData.user?.id;
    if (!userId) return { error: 'No se pudo crear el usuario administrador' };

    // 3. Insertar en company_users como admin
    const { error: cuError } = await supabase.from('company_users').insert({
      company_id: companyId,
      user_id: userId,
      role: 'admin',
    });

    if (cuError) return { error: cuError.message };
    fetchCompanies();
    return { error: null };
  }

  return { companies, loading, toggleCompanyActive, createCompany, refetch: fetchCompanies };
}

// ——————————————————————————————
// Ficha de una empresa
// ——————————————————————————————
export interface CompanyAgent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  client_count: number;
  order_count_month: number;
  active: boolean;
}

export function useAdminCompanyDetail(companyId?: string) {
  const [company, setCompany] = useState<AdminCompany | null>(null);
  const [agents, setAgents] = useState<CompanyAgent[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [companyRes, agentsRes, cuRes, invoicesRes] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('agents').select('id, user_id, name, email, active').eq('company_id', companyId),
      supabase.from('company_users').select('user_id, role').eq('company_id', companyId),
      supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(12),
    ]);

    setCompany(companyRes.data as any);
    setInvoices((invoicesRes.data as any[]) ?? []);

    const agentList = agentsRes.data ?? [];
    const cuMap: Record<string, 'admin' | 'agent'> = {};
    (cuRes.data ?? []).forEach((cu: any) => { cuMap[cu.user_id] = cu.role; });

    // For each agent get clients and this-month orders
    const enriched: CompanyAgent[] = await Promise.all(
      agentList.map(async (a: any) => {
        const [clientsRes, ordersRes] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }).eq('agent_id', a.id),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('agent_id', a.id).gte('created_at', startOfMonth),
        ]);
        return {
          ...a,
          role: cuMap[a.user_id] ?? 'agent',
          client_count: clientsRes.count ?? 0,
          order_count_month: ordersRes.count ?? 0,
        };
      })
    );
    // Sort: admin first
    enriched.sort((a, b) => (a.role === 'admin' ? -1 : b.role === 'admin' ? 1 : 0));
    setAgents(enriched);

    // Total clients from all agents of this company
    const totalClients = enriched.reduce((s, a) => s + a.client_count, 0);
    setClientCount(totalClients);

    // Products: sum across all suppliers of agents in this company
    if (agentList.length > 0) {
      const agentIds = agentList.map((a: any) => a.id);
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id')
        .in('agent_id', agentIds);
      const supplierIds = (suppliersData ?? []).map((s: any) => s.id);

      if (supplierIds.length > 0) {
        const { data: catalogData } = await supabase
          .from('catalogs')
          .select('id')
          .in('supplier_id', supplierIds);
        const catalogIds = (catalogData ?? []).map((c: any) => c.id);
        if (catalogIds.length > 0) {
          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .in('catalog_id', catalogIds);
          setProductCount(count ?? 0);
        }
      }
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function updateCompany(updates: Partial<Pick<AdminCompany, 'name' | 'nif' | 'address' | 'plan'>>) {
    if (!companyId) return { error: 'Sin ID' };
    const { error } = await supabase.from('companies').update(updates).eq('id', companyId);
    if (!error) fetchAll();
    return { error: error?.message ?? null };
  }

  async function toggleActive(active: boolean) {
    if (!companyId) return { error: 'Sin ID' };
    const { error } = await supabase.from('companies').update({ active }).eq('id', companyId);
    if (!error) fetchAll();
    return { error: error?.message ?? null };
  }

  return { company, agents, invoices, clientCount, productCount, loading, updateCompany, toggleActive, refetch: fetchAll };
}

// ——————————————————————————————
// Facturas
// ——————————————————————————————
export function useAdminInvoices() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, agent:agents(name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    setInvoices((data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  async function markAsPaid(id: string) {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', id);
    if (!error) fetchInvoices();
    return { error: error?.message ?? null };
  }

  return { invoices, loading, markAsPaid, refetch: fetchInvoices };
}
