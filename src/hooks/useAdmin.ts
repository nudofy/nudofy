import { useState, useEffect, useCallback } from 'react';
import { getPlanConfigs } from '@/lib/planConfig';
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
  plan: 'free' | 'free_pro' | 'basic' | 'pro' | 'agency';
  active: boolean;
  created_at: string;
  company_id?: string;
  client_count?: number;
  order_count?: number;
  plan_expires_at?: string | null;
  stripe_subscription_id?: string | null;
}

export interface AdminCompany {
  id: string;
  name: string;
  nif?: string;
  address?: string;
  plan: 'basic' | 'pro' | 'agency' | 'agency_pro';
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
  pdf_url?: string | null;
  agent?: { name: string; email: string };
}

export interface AdminKPIs {
  mrr: number;
  mrrLastMonth: number;
  mrrYearTotal: number;
  activeAgents: number;
  ordersThisMonth: number;
  pendingPayments: number;
  mrrDelta: number;
  agentsDelta: number;
}

export interface PlanDistributionItem {
  plan: string;
  name: string;
  agents: number;
  price: number;
  rev: number;
}

// ——————————————————————————————
// KPIs globales
// ——————————————————————————————
export function useAdminKPIs() {
  const [kpis, setKpis] = useState<AdminKPIs>({
    mrr: 0, mrrLastMonth: 0, mrrYearTotal: 0,
    activeAgents: 0, ordersThisMonth: 0,
    pendingPayments: 0, mrrDelta: 0, agentsDelta: 0,
  });
  const [planDistribution, setPlanDistribution] = useState<PlanDistributionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    Promise.all([
      supabase.from('agents').select('id, plan, active, created_at, plan_expires_at'),
      supabase.from('orders').select('id, created_at').gte('created_at', startOfMonth),
      supabase.from('invoices').select('total, status, period, created_at, agent_id'),
      getPlanConfigs(),
    ]).then(([agentsRes, ordersRes, invoicesRes, plans]) => {
      if (agentsRes.error) throw new Error(agentsRes.error.message);

      const agents = agentsRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const invoices = invoicesRes.data ?? [];

      const planPrice: Record<string, number> = {};
      const planName: Record<string, string> = {};
      plans.forEach(p => { planPrice[p.id] = p.price_monthly; planName[p.id] = p.name; });

      // Un agente está en trial (no genera ingreso todavía) si su plan es
      // free/free_pro, o si tiene plan_expires_at en el futuro (prueba vigente
      // de un plan de pago). Solo los que pagan de verdad cuentan para el MRR.
      const nowIso = new Date().toISOString();
      const isPaying = (a: any) =>
        a.active &&
        a.plan !== 'free' && a.plan !== 'free_pro' &&
        !(a.plan_expires_at && a.plan_expires_at > nowIso);

      const activeAgents = agents.filter(a => a.active);
      const payingAgents = agents.filter(isPaying);
      const mrr = payingAgents.reduce((s, a) => s + (planPrice[a.plan] ?? 0), 0);

      const lastMonthInvoices = invoices.filter(
        i => i.created_at >= startOfLastMonth && i.created_at < startOfMonth
      );
      const mrrLastMonth = lastMonthInvoices.reduce((s, i) => s + i.total, 0);
      const mrrDelta = mrrLastMonth > 0 ? ((mrr - mrrLastMonth) / mrrLastMonth) * 100 : 0;

      const yearInvoices = invoices.filter(i => i.created_at >= startOfYear);
      const mrrYearTotal = yearInvoices.reduce((s, i) => s + i.total, 0);

      const agentsThisMonth = agents.filter(a => a.created_at >= startOfMonth).length;

      const pendingPayments = agents.filter(a => {
        const inv = invoices.find(i => i.agent_id === a.id && i.status !== 'paid');
        return !!inv;
      }).length;

      // Distribución de ingresos por plan: solo cuenta agentes que pagan
      // (excluye trials vigentes, igual que el MRR).
      const distMap: Record<string, { agents: number; price: number; name: string }> = {};
      for (const a of payingAgents) {
        if (!distMap[a.plan]) distMap[a.plan] = { agents: 0, price: planPrice[a.plan] ?? 0, name: planName[a.plan] ?? a.plan };
        distMap[a.plan].agents++;
      }
      const dist: PlanDistributionItem[] = Object.entries(distMap)
        .map(([plan, d]) => ({ plan, name: d.name, agents: d.agents, price: d.price, rev: d.agents * d.price }))
        .sort((a, b) => b.rev - a.rev);

      setKpis({
        mrr, mrrLastMonth, mrrYearTotal,
        activeAgents: activeAgents.length,
        ordersThisMonth: orders.length,
        pendingPayments,
        mrrDelta,
        agentsDelta: agentsThisMonth,
      });
      setPlanDistribution(dist);
      setLoading(false);
    }).catch(err => {
      setError('Error cargando el dashboard. Comprueba tu conexión.');
      setLoading(false);
      console.warn('[useAdminKPIs]', err?.message);
    });
  }, []);

  return { kpis, planDistribution, loading, error };
}

// ——————————————————————————————
// Lista de agentes
// ——————————————————————————————
export function useAdminAgents() {
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('id, user_id, name, email, phone, plan, active, created_at, company_id')
      .order('created_at', { ascending: false });

    if (error) console.warn('[useAdminAgents]', error.message);
    setAgents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  async function updateAgentPlan(id: string, plan: AdminAgent['plan'], expiresAt?: string | null) {
    const update: Record<string, any> = { plan };
    if (expiresAt !== undefined) update.plan_expires_at = expiresAt;
    const { error } = await supabase.from('agents').update(update).eq('id', id);
    if (!error) fetchAgents();
    return { error: error?.message ?? null };
  }

  async function toggleAgentActive(id: string, active: boolean) {
    const { error } = await supabase.from('agents').update({ active }).eq('id', id);
    if (!error) fetchAgents();
    return { error: error?.message ?? null };
  }

  // Dar de alta un agente individual — llama a la Edge Function invite-agent
  async function createAgent(data: {
    name: string;
    email: string;
    phone?: string;
    business_name?: string;
    nif?: string;
    plan: AdminAgent['plan'];
  }) {
    const { data: fnData, error: fnError } = await supabase.functions.invoke('invite-agent', {
      body: data,
    });
    if (fnError || fnData?.error) return { error: fnData?.error ?? fnError?.message ?? 'Error creando agente' };
    if (fnData?.warning) console.warn(fnData.warning);
    fetchAgents();
    return { error: null };
  }

  async function updateAgentData(id: string, data: { name: string; phone?: string | null }) {
    const { error } = await supabase.from('agents').update(data).eq('id', id);
    if (!error) fetchAgents();
    return { error: error?.message ?? null };
  }

  async function deleteAgent(id: string) {
    const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-agent', {
      body: { agentId: id },
    });
    if (fnError || fnData?.error) return { error: fnData?.error ?? fnError?.message ?? 'Error eliminando agente' };
    fetchAgents();
    return { error: null };
  }

  return { agents, loading, updateAgentPlan, toggleAgentActive, updateAgentData, createAgent, deleteAgent, refetch: fetchAgents };
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

  const [refetchTick, setRefetchTick] = useState(0);
  const refetch = () => setRefetchTick(t => t + 1);

  useEffect(() => {
    if (!agentId) return;
    Promise.all([
      supabase
        .from('agents')
        .select('id, user_id, name, email, phone, plan, active, created_at, company_id, plan_expires_at, stripe_subscription_id')
        .eq('id', agentId)
        .single(),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
      supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
    ]).then(([agentRes, clientsRes, ordersRes, suppliersRes]) => {
      if (agentRes.error) throw new Error(agentRes.error.message);
      setAgent(agentRes.data as any);
      setClientCount(clientsRes.count ?? 0);
      setOrderCount(ordersRes.count ?? 0);
      setSupplierCount(suppliersRes.count ?? 0);
      setLoading(false);
    }).catch(err => {
      console.warn('[useAdminAgentDetail]', err?.message);
      setLoading(false);
    });
  }, [agentId, refetchTick]);

  return { agent, clientCount, orderCount, supplierCount, loading, refetch };
}

// ——————————————————————————————
// Lista de empresas
// ——————————————————————————————
export function useAdminCompanies() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, nif, address, plan, active, created_at')
      .order('created_at', { ascending: false });

    if (error) console.warn('[useAdminCompanies]', error.message);
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
    plan: 'basic' | 'pro' | 'agency';
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
  }) {
    // 1. Crear empresa
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({ name: data.name, nif: data.nif ?? null, address: data.address ?? null, phone: data.phone ?? null, plan: data.plan, active: true })
      .select()
      .single();

    if (companyError) return { error: companyError.message };
    const companyId = companyData.id;

    // 2. Crear usuario admin vía Edge Function
    const { data: fnData, error: fnError } = await supabase.functions.invoke('invite-agent', {
      body: {
        name: data.adminName,
        email: data.adminEmail,
        phone: data.adminPhone ?? null,
        plan: data.plan,
        company_id: companyId,
        role: 'company_admin',
      },
    });

    if (fnError || fnData?.error) {
      // Rollback: borrar la empresa recién creada
      await supabase.from('companies').delete().eq('id', companyId);
      return { error: fnData?.error ?? fnError?.message ?? 'Error creando administrador' };
    }

    fetchCompanies();
    return { error: null };
  }

  return { companies, loading, toggleCompanyActive, createCompany, refetch: fetchCompanies };
}

// ——————————————————————————————
// Agentes de una empresa (para company_admin)
// ——————————————————————————————
export function useCompanyAgents() {
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState<{ maxAgents: number | null; priceExtraAgent: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: me } = await supabase
      .from('agents')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    const cid = me?.company_id ?? null;
    setCompanyId(cid);
    if (!cid) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('agents')
      .select('id, user_id, name, email, phone, plan, active, created_at, company_id')
      .eq('company_id', cid)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.warn('[useCompanyAgents]', error.message);
    setAgents(data ?? []);

    // Cargar límites del plan de la empresa
    const { data: company } = await supabase
      .from('companies')
      .select('plan')
      .eq('id', cid)
      .single();

    if (company?.plan) {
      const { data: plan } = await supabase
        .from('plans')
        .select('max_agents, price_extra_agent')
        .eq('id', company.plan)
        .single();
      if (plan) setPlanLimits({ maxAgents: plan.max_agents, priceExtraAgent: plan.price_extra_agent });
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function toggleAgentActive(id: string, active: boolean) {
    const { error } = await supabase.from('agents').update({ active }).eq('id', id);
    if (!error) fetchAll();
    return { error: error?.message ?? null };
  }

  async function inviteAgent(data: { name: string; email: string; phone?: string }) {
    if (!companyId) return { error: 'Sin empresa asociada' };

    // El agente invitado hereda el plan real de la empresa, no un valor fijo —
    // si no, un invitado en una empresa Pro/Básico se colaba con acceso Agencia.
    const { data: companyRow } = await supabase
      .from('companies')
      .select('plan')
      .eq('id', companyId)
      .single();

    const { data: fnData, error: fnError } = await supabase.functions.invoke('invite-agent', {
      body: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        plan: companyRow?.plan ?? 'basic',
        company_id: companyId,
        role: 'agent',
      },
    });

    if (fnError || fnData?.error) {
      // supabase-js no vuelca el cuerpo JSON del error en fnData — hay que
      // leerlo de fnError.context (la Response cruda) para mostrar el motivo real.
      let message = fnData?.error ?? fnError?.message ?? 'Error invitando agente';
      const context = (fnError as any)?.context;
      if (context?.json) {
        try {
          const body = await context.json();
          if (body?.error) message = body.error;
        } catch {}
      }
      return { error: message };
    }
    fetchAll();
    return { error: null };
  }

  return { agents, companyId, planLimits, loading, toggleAgentActive, inviteAgent, refetch: fetchAll };
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

    try {
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
    } catch (err: any) {
      console.warn('[useAdminCompanyDetail]', err?.message);
      setLoading(false);
    }
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
    const { data, error } = await supabase
      .from('invoices')
      .select('*, agent:agents(name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) console.warn('[useAdminInvoices]', error.message);
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
