// ADM-02 · Agentes y empresas
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, Pressable,
  TextInput, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AdminShell from '@/components/AdminShell';
import { useAdminAgents, useAdminCompanies } from '@/hooks/useAdmin';
import type { AdminAgent, AdminCompany } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { getPlan } from '@/lib/planConfig';

// Validación NIF/NIE/CIF español
function validarNifEspanol(value: string): boolean {
  const v = value.trim().toUpperCase();

  // CIF: letra + 7 dígitos + dígito/letra control
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) {
    const digits = v.slice(1, 8);
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      let n = parseInt(digits[i]);
      if (i % 2 === 0) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    const control = (10 - (sum % 10)) % 10;
    const lastChar = v[8];
    return lastChar === String(control) || lastChar === 'JABCDEFGHI'[control];
  }

  // NIE: X/Y/Z + 7 dígitos + letra control
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
    const num = parseInt(v.replace('X','0').replace('Y','1').replace('Z','2').slice(0,8));
    return v[8] === 'TRWAGMYFPDXBNJZSQVHLCKE'[num % 23];
  }

  // NIF: 8 dígitos + letra control
  if (/^\d{8}[A-Z]$/.test(v)) {
    return v[8] === 'TRWAGMYFPDXBNJZSQVHLCKE'[parseInt(v.slice(0,8)) % 23];
  }

  return false;
}

type PlanOption = {
  id: string;
  name: string;
  price_monthly: number | null;
  max_suppliers: number | null;
  max_clients: number | null;
  max_agents: number | null;
};

function usePlans() {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  useEffect(() => {
    supabase
      .from('plans')
      .select('id, name, price_monthly, max_suppliers, max_clients, max_agents')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => { if (data) setPlans(data as PlanOption[]); });
  }, []);
  return plans;
}

function planDesc(p: PlanOption, t: (key: string, opts?: any) => string): string {
  const price = p.price_monthly == null ? t('agentes.custom_price') : p.price_monthly === 0 ? t('agentes.free_price') : t('agentes.price_per_month', { price: p.price_monthly });
  const suppliers = p.max_suppliers != null ? t('agentes.suppliers_count', { count: p.max_suppliers }) : t('agentes.unlimited_suppliers');
  const clients = p.max_clients != null ? t('agentes.clients_count', { count: p.max_clients }) : t('agentes.unlimited_clients');
  const agents = p.max_agents != null ? t('agentes.agents_suffix', { count: p.max_agents }) : '';
  return `${price} · ${suppliers} · ${clients}${agents}`;
}

// ——— Modal: alta agente individual ———
function ModalAltaAgente({
  visible, onClose, onCreate,
}: { visible: boolean; onClose: () => void; onCreate: (d: any) => Promise<{ error?: string } | void> }) {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const plans = usePlans();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [nif, setNif] = useState('');
  const [plan, setPlan] = useState('pro');
  const [saving, setSaving] = useState(false);

  // Seleccionar 'pro' por defecto cuando carguen los planes
  useEffect(() => {
    if (plans.length > 0 && !plans.find(p => p.id === plan)) {
      setPlan(plans[0].id);
    }
  }, [plans]);

  function reset() {
    setName(''); setEmail(''); setPhone(''); setBusinessName(''); setNif(''); setPlan('pro');
  }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      toast.error(t('agentes.name_email_required'));
      return;
    }
    setSaving(true);
    const result = await onCreate({ name, email, phone, business_name: businessName, nif, plan });
    setSaving(false);
    if (result?.error) { toast.error(result.error); return; }
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text variant="title">{t('agentes.modal_agent_title')}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.modalClose}>
              <Icon name="X" size={20} color={colors.ink2} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text variant="caption" color="ink3" style={styles.formSection}>{t('agentes.personal_data')}</Text>
            <FormGroup label={t('agentes.name')}>
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Ana García" placeholderTextColor={colors.ink4} />
            </FormGroup>
            <FormGroup label={t('agentes.email_label')} sub={t('agentes.email_sub')}>
              <TextInput style={styles.formInput} value={email} onChangeText={setEmail} placeholder="ana@empresa.com" placeholderTextColor={colors.ink4} keyboardType="email-address" autoCapitalize="none" />
            </FormGroup>
            <View style={styles.formGrid}>
              <View style={{ flex: 1 }}>
                <FormGroup label={t('agentes.phone')} sub={t('agentes.optional_sub')}>
                  <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} placeholder="+34 600 000 000" placeholderTextColor={colors.ink4} keyboardType="phone-pad" />
                </FormGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FormGroup label={t('agentes.nif')} sub={t('agentes.optional_sub')}>
                  <TextInput style={styles.formInput} value={nif} onChangeText={setNif} placeholder="12345678A" placeholderTextColor={colors.ink4} autoCapitalize="characters" />
                </FormGroup>
              </View>
            </View>
            <FormGroup label={t('agentes.company_name')} sub={t('agentes.optional_sub')}>
              <TextInput style={styles.formInput} value={businessName} onChangeText={setBusinessName} placeholder="Distribuciones García" placeholderTextColor={colors.ink4} />
            </FormGroup>

            <Text variant="caption" color="ink3" style={styles.formSection}>{t('agentes.plan_section')}</Text>
            <View style={styles.planSelector}>
              {plans.length === 0 ? (
                <Text variant="caption" color="ink3">{t('agentes.loading_plans')}</Text>
              ) : plans.map(p => (
                <Pressable
                  key={p.id}
                  style={[styles.planOpt, plan === p.id && styles.planOptSelected]}
                  onPress={() => setPlan(p.id)}
                >
                  <Text variant="smallMedium">{p.name}</Text>
                  <Text variant="caption" color="ink3" style={{ marginTop: 4 }}>{planDesc(p, t)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button label={t('shared.cancel')} variant="secondary" onPress={() => { reset(); onClose(); }} style={{ flex: 1 }} />
            <Button label={t('agentes.save')} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ——— Modal: alta empresa ———
function ModalAltaEmpresa({
  visible, onClose, onCreate,
}: { visible: boolean; onClose: () => void; onCreate: (d: any) => Promise<{ error?: string } | void> }) {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<'basic' | 'pro' | 'agency'>('agency');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(''); setNif(''); setAddress(''); setPhone(''); setPlan('agency');
    setAdminName(''); setAdminEmail(''); setAdminPhone('');
  }

  async function handleSave() {
    if (saving) return;
    if (!name.trim()) { toast.error(t('agentes.business_name_required_error')); return; }
    if (!nif.trim()) { toast.error(t('agentes.nif_required_error')); return; }
    if (!validarNifEspanol(nif)) { Alert.alert(t('agentes.invalid_nif_title'), t('agentes.invalid_nif_body')); return; }
    if (!adminName.trim()) { toast.error(t('agentes.admin_name_required_error')); return; }
    if (!adminPhone.trim()) { toast.error(t('agentes.admin_phone_required_error')); return; }
    if (!adminEmail.trim()) { toast.error(t('agentes.admin_email_required_error')); return; }

    // Verificar NIF duplicado
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('nif', nif.trim().toUpperCase())
      .maybeSingle();
    if (existing) { toast.error(t('agentes.duplicate_nif_error', { nif: nif.trim().toUpperCase() })); return; }

    setSaving(true);
    const result = await onCreate({ name, nif: nif.trim().toUpperCase(), address, phone, plan, adminName, adminEmail, adminPhone });
    setSaving(false);
    if (result?.error) { Alert.alert(t('shared.error_title'), result.error); return; }

    reset();
    onClose();
    Alert.alert(t('agentes.company_created_title'), t('agentes.company_created_body', { name, email: adminEmail }));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text variant="title">{t('agentes.modal_company_title')}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.modalClose}>
              <Icon name="X" size={20} color={colors.ink2} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text variant="caption" color="ink3" style={styles.formSection}>{t('agentes.company_data')}</Text>
            <FormGroup label={t('agentes.business_name')}>
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Comercial Rodríguez S.L." placeholderTextColor={colors.ink4} />
            </FormGroup>
            <FormGroup label={t('agentes.nif_required')}>
              <TextInput style={styles.formInput} value={nif} onChangeText={setNif} placeholder="B-12345678" placeholderTextColor={colors.ink4} autoCapitalize="characters" />
            </FormGroup>
            <View style={styles.formGrid}>
              <View style={{ flex: 1 }}>
                <FormGroup label={t('agentes.company_phone')} sub={t('agentes.optional_sub')}>
                  <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} placeholder="+34 900 000 000" placeholderTextColor={colors.ink4} keyboardType="phone-pad" />
                </FormGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FormGroup label={t('agentes.fiscal_address')} sub={t('agentes.optional_sub')}>
                  <TextInput style={styles.formInput} value={address} onChangeText={setAddress} placeholder="C/ Mayor 1, Madrid" placeholderTextColor={colors.ink4} />
                </FormGroup>
              </View>
            </View>

            <Text variant="caption" color="ink3" style={styles.formSection}>{t('agentes.admin_section')}</Text>
            <Text variant="caption" color="ink3" style={{ marginBottom: space[2] }}>
              {t('agentes.admin_desc')}
            </Text>
            <FormGroup label={t('agentes.admin_name')}>
              <TextInput style={styles.formInput} value={adminName} onChangeText={setAdminName} placeholder="María López" placeholderTextColor={colors.ink4} />
            </FormGroup>
            <View style={styles.formGrid}>
              <View style={{ flex: 1 }}>
                <FormGroup label={t('agentes.admin_phone')}>
                  <TextInput style={styles.formInput} value={adminPhone} onChangeText={setAdminPhone} placeholder="+34 600 000 000" placeholderTextColor={colors.ink4} keyboardType="phone-pad" />
                </FormGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FormGroup label={t('agentes.admin_email')} sub={t('agentes.email_sub')}>
                  <TextInput style={styles.formInput} value={adminEmail} onChangeText={setAdminEmail} placeholder="admin@empresa.com" placeholderTextColor={colors.ink4} keyboardType="email-address" autoCapitalize="none" />
                </FormGroup>
              </View>
            </View>

            <Text variant="caption" color="ink3" style={styles.formSection}>{t('agentes.plan_section')}</Text>
            <View style={styles.planSelector}>
              {(['basic', 'pro', 'agency'] as const).map(p => {
                const cfg = getPlan(p);
                const agentsLabel = cfg.max_agents == null ? t('agentes.unlimited_agents') : t('agentes.up_to_agents', { count: cfg.max_agents });
                return (
                  <Pressable
                    key={p}
                    style={[styles.planOpt, plan === p && styles.planOptSelected]}
                    onPress={() => setPlan(p)}
                  >
                    <Text variant="smallMedium">{cfg.name}</Text>
                    <Text variant="caption" color="ink3" style={{ marginTop: 4 }}>
                      {cfg.price_monthly} €/mes · {agentsLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button label={t('shared.cancel')} variant="secondary" onPress={() => { reset(); onClose(); }} style={{ flex: 1 }} />
            <Button label={t('agentes.save')} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FormGroup({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: space[3] }}>
      <Text variant="smallMedium" style={{ marginBottom: 6 }}>
        {label}{sub && <Text variant="caption" color="ink4">  {sub}</Text>}
      </Text>
      {children}
    </View>
  );
}

// ——— Pantalla principal ———
type Tab = 'all' | 'agents' | 'companies';

export default function AdminAgentesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('admin');
  const toast = useToast();
  const { agents, loading: agentsLoading, toggleAgentActive, createAgent, refetch: refetchAgents } = useAdminAgents();
  const { companies, loading: companiesLoading, toggleCompanyActive, createCompany, refetch: refetchCompanies } = useAdminCompanies();

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAltaAgente, setShowAltaAgente] = useState(false);
  const [showAltaEmpresa, setShowAltaEmpresa] = useState(false);

  const PLAN_LABELS: Record<string, string> = {
    basic: t('shared.plan_basic'),
    pro: t('shared.plan_pro'),
    agency: t('shared.plan_agency'),
  };

  function formatDate(iso: string) {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const filteredAgents = useMemo(() => agents.filter(a => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === 'all' || a.plan === planFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && a.active) ||
      (statusFilter === 'inactive' && !a.active);
    return matchSearch && matchPlan && matchStatus;
  }), [agents, search, planFilter, statusFilter]);

  const filteredCompanies = useMemo(() => companies.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === 'all' || c.plan === planFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && c.active) ||
      (statusFilter === 'inactive' && !c.active);
    return matchSearch && matchPlan && matchStatus;
  }), [companies, search, planFilter, statusFilter]);

  const totalCount = tab === 'all'
    ? filteredAgents.length + filteredCompanies.length
    : tab === 'agents' ? filteredAgents.length : filteredCompanies.length;

  async function handleToggleAgent(agent: AdminAgent) {
    Alert.alert(
      agent.active ? t('agentes.deactivate_agent_title') : t('agentes.activate_agent_title'),
      t('agentes.confirm_toggle', { action: agent.active ? t('agentes.deactivate') : t('agentes.activate'), name: agent.name }),
      [
        { text: t('shared.cancel'), style: 'cancel' },
        {
          text: agent.active ? t('agentes.deactivate') : t('agentes.activate'),
          style: agent.active ? 'destructive' : 'default',
          onPress: () => toggleAgentActive(agent.id, !agent.active),
        },
      ]
    );
  }

  async function handleToggleCompany(company: AdminCompany) {
    Alert.alert(
      company.active ? t('agentes.suspend_company_title') : t('agentes.activate_company_title'),
      t('agentes.confirm_toggle', { action: company.active ? t('agentes.suspend') : t('agentes.activate'), name: company.name }),
      [
        { text: t('shared.cancel'), style: 'cancel' },
        {
          text: company.active ? t('agentes.suspend') : t('agentes.activate'),
          style: company.active ? 'destructive' : 'default',
          onPress: () => toggleCompanyActive(company.id, !company.active),
        },
      ]
    );
  }

  async function handleDeleteAgent(agent: AdminAgent) {
    Alert.alert(
      t('agentes.delete_agent_title'),
      t('agentes.delete_agent_body', { name: agent.name }),
      [
        { text: t('shared.cancel'), style: 'cancel' },
        {
          text: t('shared.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-agent', {
              body: { agentId: agent.id },
            });
            if (error) toast.error(error.message ?? t('agentes.delete_agent_error'));
            else { toast.success(t('agentes.deleted_agent_toast', { name: agent.name })); refetchAgents(); }
          },
        },
      ]
    );
  }

  async function handleDeleteCompany(company: AdminCompany) {
    Alert.alert(
      t('agentes.delete_company_title'),
      t('agentes.delete_company_body', { name: company.name }),
      [
        { text: t('shared.cancel'), style: 'cancel' },
        {
          text: t('shared.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-company', {
              body: { companyId: company.id },
            });
            if (error) Alert.alert(t('shared.error_title'), error.message ?? t('agentes.delete_company_error'));
            else { toast.success(t('agentes.deleted_company_toast', { name: company.name })); refetchCompanies(); }
          },
        },
      ]
    );
  }

  async function handleCreateAgent(data: any) {
    const { error } = await createAgent(data);
    if (error) return { error };
    toast.success(t('agentes.agent_created_toast'));
  }

  async function handleCreateCompany(data: any) {
    const { error } = await createCompany(data);
    if (error) return { error };
    toast.success(t('agentes.company_created_toast'));
  }

  const showAgents = tab === 'all' || tab === 'agents';
  const showCompanies = tab === 'all' || tab === 'companies';

  return (
    <AdminShell
      activeSection="agentes"
      title={t('agentes.title')}
      rightElement={
        <View style={styles.headerActions}>
          <Button label={t('agentes.add_company')} variant="secondary" size="sm" onPress={() => setShowAltaEmpresa(true)} />
          <Button label={t('agentes.add_agent')} size="sm" onPress={() => setShowAltaAgente(true)} />
        </View>
      }
    >
      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          { key: 'all', label: t('agentes.tab_all', { count: agents.length + companies.length }) },
          { key: 'agents', label: t('agentes.tab_agents', { count: agents.length }) },
          { key: 'companies', label: t('agentes.tab_companies', { count: companies.length }) },
        ] as { key: Tab; label: string }[]).map(tabOpt => (
          <Pressable
            key={tabOpt.key}
            style={[styles.tabBtn, tab === tabOpt.key && styles.tabBtnActive]}
            onPress={() => setTab(tabOpt.key)}
          >
            <Text
              variant="smallMedium"
              style={{ color: tab === tabOpt.key ? colors.white : colors.ink2 }}
            >
              {tabOpt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Filtros */}
      <View style={styles.filtersBar}>
        <View style={styles.searchWrap}>
          <Icon name="Search" size={16} color={colors.ink3} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('agentes.search_placeholder')}
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.pillRow}>
          {['all', 'basic', 'pro', 'agency'].map(p => (
            <Pressable
              key={p}
              style={[styles.pill, planFilter === p && styles.pillActive]}
              onPress={() => setPlanFilter(p)}
            >
              <Text
                variant="smallMedium"
                style={{ color: planFilter === p ? colors.white : colors.ink2 }}
              >
                {p === 'all' ? t('agentes.all_plans') : PLAN_LABELS[p] ?? p}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.pillRow}>
          {[
            { key: 'all', label: t('agentes.filter_all') },
            { key: 'active', label: t('agentes.filter_active') },
            { key: 'inactive', label: t('agentes.filter_inactive') },
          ].map(s => (
            <Pressable
              key={s.key}
              style={[styles.pill, statusFilter === s.key && styles.pillActive]}
              onPress={() => setStatusFilter(s.key)}
            >
              <Text
                variant="smallMedium"
                style={{ color: statusFilter === s.key ? colors.white : colors.ink2 }}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text variant="caption" color="ink3">{t('agentes.records_count', { count: totalCount })}</Text>
      </View>

      {/* Tabla agentes */}
      {showAgents && filteredAgents.length > 0 && (
        <View style={styles.card}>
          {tab === 'all' && (
            <View style={styles.cardHeader}>
              <Text variant="bodyMedium">{t('agentes.individual_agents')}</Text>
              <Text variant="caption" color="ink3">{filteredAgents.length}</Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {[t('agentes.col_agent'), t('agentes.col_plan'), t('agentes.col_signup'), t('agentes.col_status'), t('agentes.col_actions')].map((h, i) => (
                  <Text
                    key={h}
                    variant="caption"
                    color="ink3"
                    style={[styles.th, { width: [220, 120, 120, 110, 260][i] }]}
                  >
                    {h.toUpperCase()}
                  </Text>
                ))}
              </View>
              {agentsLoading && (
                <Text variant="small" color="ink3" align="center" style={styles.emptyText}>{t('shared.loading')}</Text>
              )}
              {filteredAgents.map((agent, i) => (
                <View
                  key={agent.id}
                  style={[styles.tableRow, i === filteredAgents.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Pressable
                    style={({ pressed }) => [styles.td, { width: 220 }, pressed && { opacity: 0.7 }]}
                    onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
                  >
                    <View style={styles.entityCell}>
                      <Avatar name={agent.name} size={32} fontSize={12} />
                      <View style={{ flex: 1 }}>
                        <Text variant="smallMedium" numberOfLines={1}>{agent.name}</Text>
                        <Text variant="caption" color="ink3" numberOfLines={1}>{agent.email}</Text>
                      </View>
                    </View>
                  </Pressable>
                  <View style={[styles.td, { width: 120 }]}>
                    <Badge label={PLAN_LABELS[agent.plan] ?? t('shared.plan_basic')} variant="neutral" />
                  </View>
                  <View style={[styles.td, { width: 120 }]}>
                    <Text variant="small" color="ink2">{formatDate(agent.created_at)}</Text>
                  </View>
                  <View style={[styles.td, { width: 110 }]}>
                    <Badge
                      label={agent.active ? t('shared.active') : t('shared.inactive')}
                      variant={agent.active ? 'success' : 'neutral'}
                    />
                  </View>
                  <View style={[styles.td, { width: 260, flexDirection: 'row', gap: space[1] }]}>
                    <Button
                      label={t('shared.view')}
                      variant="secondary"
                      size="sm"
                      onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
                    />
                    <Button
                      label={agent.active ? t('agentes.deactivate') : t('agentes.activate')}
                      variant="secondary"
                      size="sm"
                      onPress={() => handleToggleAgent(agent)}
                    />
                    <Button
                      label={t('shared.delete')}
                      variant="danger"
                      size="sm"
                      onPress={() => handleDeleteAgent(agent)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Tabla empresas */}
      {showCompanies && filteredCompanies.length > 0 && (
        <View style={styles.card}>
          {tab === 'all' && (
            <View style={styles.cardHeader}>
              <Text variant="bodyMedium">{t('agentes.companies_title')}</Text>
              <Text variant="caption" color="ink3">{filteredCompanies.length}</Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {[t('agentes.col_company'), t('agentes.col_plan'), t('agentes.col_signup'), t('agentes.col_status'), t('agentes.col_actions')].map((h, i) => (
                  <Text
                    key={h}
                    variant="caption"
                    color="ink3"
                    style={[styles.th, { width: [220, 120, 120, 110, 200][i] }]}
                  >
                    {h.toUpperCase()}
                  </Text>
                ))}
              </View>
              {companiesLoading && (
                <Text variant="small" color="ink3" align="center" style={styles.emptyText}>{t('shared.loading')}</Text>
              )}
              {filteredCompanies.map((company, i) => {
                const initials = company.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <View
                    key={company.id}
                    style={[styles.tableRow, i === filteredCompanies.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <Pressable
                      style={({ pressed }) => [styles.td, { width: 220 }, pressed && { opacity: 0.7 }]}
                      onPress={() => router.push(`/(admin)/empresa/${company.id}` as any)}
                    >
                      <View style={styles.entityCell}>
                        <View style={styles.avSq}>
                          <Text variant="smallMedium" color="ink2">{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="smallMedium" numberOfLines={1}>{company.name}</Text>
                          <Text variant="caption" color="ink3" numberOfLines={1}>
                            {t('agentes.company_label', { nif: company.nif ?? t('agentes.no_nif') })}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    <View style={[styles.td, { width: 120 }]}>
                      <Badge label={PLAN_LABELS[company.plan] ?? t('shared.plan_agency')} variant="neutral" />
                    </View>
                    <View style={[styles.td, { width: 120 }]}>
                      <Text variant="small" color="ink2">{formatDate(company.created_at)}</Text>
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Badge
                        label={company.active ? t('shared.active') : t('shared.inactive')}
                        variant={company.active ? 'success' : 'neutral'}
                      />
                    </View>
                    <View style={[styles.td, { width: 260, flexDirection: 'row', gap: space[1] }]}>
                      <Button
                        label={t('shared.view')}
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push(`/(admin)/empresa/${company.id}` as any)}
                      />
                      <Button
                        label={company.active ? t('agentes.suspend') : t('agentes.activate')}
                        variant="secondary"
                        size="sm"
                        onPress={() => handleToggleCompany(company)}
                      />
                      <Button
                        label={t('shared.delete')}
                        variant="danger"
                        size="sm"
                        onPress={() => handleDeleteCompany(company)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {totalCount === 0 && !agentsLoading && !companiesLoading && (
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          {t('agentes.no_results')}
        </Text>
      )}

      <ModalAltaAgente
        visible={showAltaAgente}
        onClose={() => setShowAltaAgente(false)}
        onCreate={handleCreateAgent}
      />
      <ModalAltaEmpresa
        visible={showAltaEmpresa}
        onClose={() => setShowAltaEmpresa(false)}
        onCreate={handleCreateCompany}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: space[1] },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden', alignSelf: 'flex-start',
  },
  tabBtn: { paddingHorizontal: space[4], paddingVertical: space[2] + 2 },
  tabBtnActive: { backgroundColor: colors.ink },

  filtersBar: { gap: space[2] },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: space[3], paddingVertical: space[2], gap: space[2],
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 2 },

  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: space[3], paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },

  tableHead: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  th: {
    paddingVertical: space[2] + 2, paddingHorizontal: space[3],
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    alignItems: 'center',
  },
  td: { paddingVertical: space[2] + 4, paddingHorizontal: space[3], justifyContent: 'center' },
  entityCell: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  avSq: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyText: { paddingVertical: space[6] },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    padding: space[3],
  },
  modal: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    width: '100%', maxWidth: 500, maxHeight: '90%',
    borderWidth: 1, borderColor: colors.line,
  },
  modalHeader: {
    padding: space[4],
    borderBottomWidth: 1, borderBottomColor: colors.line,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalClose: {
    width: 32, height: 32, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { padding: space[4] },
  modalFooter: {
    padding: space[3],
    borderTopWidth: 1, borderTopColor: colors.line,
    flexDirection: 'row', gap: space[2],
  },

  formSection: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: space[2], marginTop: space[1],
  },
  formGrid: { flexDirection: 'row', gap: space[2] },
  formInput: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    fontSize: 14, color: colors.ink,
    backgroundColor: colors.white,
  },

  planSelector: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginBottom: space[2] },
  planOpt: {
    flex: 1, minWidth: 140,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    padding: space[3],
    backgroundColor: colors.white,
  },
  planOptSelected: { borderColor: colors.ink, borderWidth: 2 },
});
