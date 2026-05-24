// ADM-02 · Agentes y empresas
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, Pressable,
  TextInput, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { useAdminAgents, useAdminCompanies } from '@/hooks/useAdmin';
import type { AdminAgent, AdminCompany } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';

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

function planDesc(p: PlanOption): string {
  const price = p.price_monthly == null ? 'A medida' : p.price_monthly === 0 ? 'Gratis' : `${p.price_monthly} €/mes`;
  const suppliers = p.max_suppliers != null ? `${p.max_suppliers} prov` : 'prov ilimitados';
  const clients = p.max_clients != null ? `${p.max_clients} cli` : 'cli ilimitados';
  const agents = p.max_agents != null ? ` · ${p.max_agents} agentes` : '';
  return `${price} · ${suppliers} · ${clients}${agents}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PLAN_LABELS: Record<string, string> = {
  basic:       'Básico',
  pro:         'Pro',
  agency:      'Agencia',
  agency_pro:  'Ag. Pro',
};

// ——— Modal: alta agente individual ———
function ModalAltaAgente({
  visible, onClose, onCreate,
}: { visible: boolean; onClose: () => void; onCreate: (d: any) => Promise<{ error?: string } | void> }) {
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
      toast.error('Nombre y email son obligatorios.');
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
            <Text variant="title">Alta · Agente individual</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.modalClose}>
              <Icon name="X" size={20} color={colors.ink2} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text variant="caption" color="ink3" style={styles.formSection}>DATOS PERSONALES</Text>
            <FormGroup label="Nombre">
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Ana García" placeholderTextColor={colors.ink4} />
            </FormGroup>
            <FormGroup label="Email" sub="(acceso a la app)">
              <TextInput style={styles.formInput} value={email} onChangeText={setEmail} placeholder="ana@empresa.com" placeholderTextColor={colors.ink4} keyboardType="email-address" autoCapitalize="none" />
            </FormGroup>
            <View style={styles.formGrid}>
              <View style={{ flex: 1 }}>
                <FormGroup label="Teléfono" sub="(opcional)">
                  <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} placeholder="+34 600 000 000" placeholderTextColor={colors.ink4} keyboardType="phone-pad" />
                </FormGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FormGroup label="NIF" sub="(opcional)">
                  <TextInput style={styles.formInput} value={nif} onChangeText={setNif} placeholder="12345678A" placeholderTextColor={colors.ink4} autoCapitalize="characters" />
                </FormGroup>
              </View>
            </View>
            <FormGroup label="Empresa / Razón social" sub="(opcional)">
              <TextInput style={styles.formInput} value={businessName} onChangeText={setBusinessName} placeholder="Distribuciones García" placeholderTextColor={colors.ink4} />
            </FormGroup>

            <Text variant="caption" color="ink3" style={styles.formSection}>PLAN</Text>
            <View style={styles.planSelector}>
              {plans.length === 0 ? (
                <Text variant="caption" color="ink3">Cargando planes...</Text>
              ) : plans.map(p => (
                <Pressable
                  key={p.id}
                  style={[styles.planOpt, plan === p.id && styles.planOptSelected]}
                  onPress={() => setPlan(p.id)}
                >
                  <Text variant="smallMedium">{p.name}</Text>
                  <Text variant="caption" color="ink3" style={{ marginTop: 4 }}>{planDesc(p)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button label="Cancelar" variant="secondary" onPress={() => { reset(); onClose(); }} style={{ flex: 1 }} />
            <Button label="Dar de alta" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
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
  const toast = useToast();
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<'agency' | 'agency_pro'>('agency');
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
    if (!name.trim()) { toast.error('La razón social es obligatoria.'); return; }
    if (!nif.trim()) { toast.error('El NIF / CIF es obligatorio.'); return; }
    if (!validarNifEspanol(nif)) { Alert.alert('NIF inválido', 'El NIF/CIF introducido no es válido. Revisa el formato y el dígito de control.'); return; }
    if (!adminName.trim()) { toast.error('El nombre del administrador es obligatorio.'); return; }
    if (!adminPhone.trim()) { toast.error('El teléfono del administrador es obligatorio.'); return; }
    if (!adminEmail.trim()) { toast.error('El email del administrador es obligatorio.'); return; }

    // Verificar NIF duplicado
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('nif', nif.trim().toUpperCase())
      .maybeSingle();
    if (existing) { toast.error(`Ya existe una empresa con el NIF ${nif.trim().toUpperCase()}.`); return; }

    setSaving(true);
    const result = await onCreate({ name, nif: nif.trim().toUpperCase(), address, phone, plan, adminName, adminEmail, adminPhone });
    setSaving(false);
    if (result?.error) { Alert.alert('Error', result.error); return; }

    reset();
    onClose();
    Alert.alert('✓ Empresa creada', `${name} ha sido dada de alta.\nSe ha enviado la invitación a ${adminEmail}.`);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text variant="title">Alta · Empresa</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.modalClose}>
              <Icon name="X" size={20} color={colors.ink2} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text variant="caption" color="ink3" style={styles.formSection}>DATOS DE LA EMPRESA</Text>
            <FormGroup label="Razón social *">
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Comercial Rodríguez S.L." placeholderTextColor={colors.ink4} />
            </FormGroup>
            <FormGroup label="NIF / CIF *">
              <TextInput style={styles.formInput} value={nif} onChangeText={setNif} placeholder="B-12345678" placeholderTextColor={colors.ink4} autoCapitalize="characters" />
            </FormGroup>
            <View style={styles.formGrid}>
              <View style={{ flex: 1 }}>
                <FormGroup label="Teléfono empresa" sub="(opcional)">
                  <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} placeholder="+34 900 000 000" placeholderTextColor={colors.ink4} keyboardType="phone-pad" />
                </FormGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FormGroup label="Dirección fiscal" sub="(opcional)">
                  <TextInput style={styles.formInput} value={address} onChangeText={setAddress} placeholder="C/ Mayor 1, Madrid" placeholderTextColor={colors.ink4} />
                </FormGroup>
              </View>
            </View>

            <Text variant="caption" color="ink3" style={styles.formSection}>ADMINISTRADOR</Text>
            <Text variant="caption" color="ink3" style={{ marginBottom: space[2] }}>
              El administrador gestiona los agentes y tiene acceso completo al panel.
            </Text>
            <FormGroup label="Nombre *">
              <TextInput style={styles.formInput} value={adminName} onChangeText={setAdminName} placeholder="María López" placeholderTextColor={colors.ink4} />
            </FormGroup>
            <View style={styles.formGrid}>
              <View style={{ flex: 1 }}>
                <FormGroup label="Teléfono *">
                  <TextInput style={styles.formInput} value={adminPhone} onChangeText={setAdminPhone} placeholder="+34 600 000 000" placeholderTextColor={colors.ink4} keyboardType="phone-pad" />
                </FormGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FormGroup label="Email *" sub="(acceso a la app)">
                  <TextInput style={styles.formInput} value={adminEmail} onChangeText={setAdminEmail} placeholder="admin@empresa.com" placeholderTextColor={colors.ink4} keyboardType="email-address" autoCapitalize="none" />
                </FormGroup>
              </View>
            </View>

            <Text variant="caption" color="ink3" style={styles.formSection}>PLAN</Text>
            <View style={styles.planSelector}>
              {(['agency', 'agency_pro'] as const).map(p => (
                <Pressable
                  key={p}
                  style={[styles.planOpt, plan === p && styles.planOptSelected]}
                  onPress={() => setPlan(p)}
                >
                  <Text variant="smallMedium">{p === 'agency' ? 'Agencia' : 'Agencia Pro'}</Text>
                  <Text variant="caption" color="ink3" style={{ marginTop: 4 }}>
                    {p === 'agency' ? '45 € + 15 €/agente · hasta 10 ag.' : '150 € + 20 €/agente · ilimitado'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button label="Cancelar" variant="secondary" onPress={() => { reset(); onClose(); }} style={{ flex: 1 }} />
            <Button label="Dar de alta" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
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
  const toast = useToast();
  const { agents, loading: agentsLoading, toggleAgentActive, createAgent, refetch: refetchAgents } = useAdminAgents();
  const { companies, loading: companiesLoading, toggleCompanyActive, createCompany, refetch: refetchCompanies } = useAdminCompanies();

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAltaAgente, setShowAltaAgente] = useState(false);
  const [showAltaEmpresa, setShowAltaEmpresa] = useState(false);

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
      agent.active ? 'Desactivar agente' : 'Activar agente',
      `¿${agent.active ? 'Desactivar' : 'Activar'} a ${agent.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: agent.active ? 'Desactivar' : 'Activar',
          style: agent.active ? 'destructive' : 'default',
          onPress: () => toggleAgentActive(agent.id, !agent.active),
        },
      ]
    );
  }

  async function handleToggleCompany(company: AdminCompany) {
    Alert.alert(
      company.active ? 'Suspender empresa' : 'Activar empresa',
      `¿${company.active ? 'Suspender' : 'Activar'} a ${company.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: company.active ? 'Suspender' : 'Activar',
          style: company.active ? 'destructive' : 'default',
          onPress: () => toggleCompanyActive(company.id, !company.active),
        },
      ]
    );
  }

  async function handleDeleteAgent(agent: AdminAgent) {
    Alert.alert(
      'Borrar agente',
      `¿Eliminar permanentemente a ${agent.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-agent', {
              body: { agentId: agent.id },
            });
            if (error) toast.error(error.message ?? 'Error al borrar el agente');
            else { toast.success(`${agent.name} eliminado`); refetchAgents(); }
          },
        },
      ]
    );
  }

  async function handleDeleteCompany(company: AdminCompany) {
    Alert.alert(
      'Borrar empresa',
      `¿Eliminar permanentemente "${company.name}" y todos sus agentes? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-company', {
              body: { companyId: company.id },
            });
            if (error) Alert.alert('Error', error.message ?? 'Error al borrar la empresa');
            else { toast.success(`${company.name} eliminada`); refetchCompanies(); }
          },
        },
      ]
    );
  }

  async function handleCreateAgent(data: any) {
    const { error } = await createAgent(data);
    if (error) return { error };
    toast.success('Agente creado · Invitación enviada por email');
  }

  async function handleCreateCompany(data: any) {
    const { error } = await createCompany(data);
    if (error) return { error };
    toast.success('Empresa creada · Invitación enviada al administrador');
  }

  const showAgents = tab === 'all' || tab === 'agents';
  const showCompanies = tab === 'all' || tab === 'companies';

  return (
    <AdminShell
      activeSection="agentes"
      title="Agentes y empresas"
      rightElement={
        <View style={styles.headerActions}>
          <Button label="+ Empresa" variant="secondary" size="sm" onPress={() => setShowAltaEmpresa(true)} />
          <Button label="+ Agente" size="sm" onPress={() => setShowAltaAgente(true)} />
        </View>
      }
    >
      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          { key: 'all', label: `Todos (${agents.length + companies.length})` },
          { key: 'agents', label: `Agentes (${agents.length})` },
          { key: 'companies', label: `Empresas (${companies.length})` },
        ] as { key: Tab; label: string }[]).map(t => (
          <Pressable
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text
              variant="smallMedium"
              style={{ color: tab === t.key ? colors.white : colors.ink2 }}
            >
              {t.label}
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
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.pillRow}>
          {['all', 'basic', 'pro', 'agency', 'agency_pro'].map(p => (
            <Pressable
              key={p}
              style={[styles.pill, planFilter === p && styles.pillActive]}
              onPress={() => setPlanFilter(p)}
            >
              <Text
                variant="smallMedium"
                style={{ color: planFilter === p ? colors.white : colors.ink2 }}
              >
                {p === 'all' ? 'Todos los planes' : PLAN_LABELS[p] ?? p}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.pillRow}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Activos' },
            { key: 'inactive', label: 'Inactivos' },
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
        <Text variant="caption" color="ink3">{totalCount} registros</Text>
      </View>

      {/* Tabla agentes */}
      {showAgents && filteredAgents.length > 0 && (
        <View style={styles.card}>
          {tab === 'all' && (
            <View style={styles.cardHeader}>
              <Text variant="bodyMedium">Agentes individuales</Text>
              <Text variant="caption" color="ink3">{filteredAgents.length}</Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {['Agente', 'Plan', 'Alta', 'Estado', 'Acciones'].map((h, i) => (
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
                <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Cargando...</Text>
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
                    <Badge label={PLAN_LABELS[agent.plan] ?? 'Básico'} variant="neutral" />
                  </View>
                  <View style={[styles.td, { width: 120 }]}>
                    <Text variant="small" color="ink2">{formatDate(agent.created_at)}</Text>
                  </View>
                  <View style={[styles.td, { width: 110 }]}>
                    <Badge
                      label={agent.active ? 'Activo' : 'Inactivo'}
                      variant={agent.active ? 'success' : 'neutral'}
                    />
                  </View>
                  <View style={[styles.td, { width: 260, flexDirection: 'row', gap: space[1] }]}>
                    <Button
                      label="Ver"
                      variant="secondary"
                      size="sm"
                      onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
                    />
                    <Button
                      label={agent.active ? 'Desactivar' : 'Activar'}
                      variant="secondary"
                      size="sm"
                      onPress={() => handleToggleAgent(agent)}
                    />
                    <Button
                      label="Borrar"
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
              <Text variant="bodyMedium">Empresas</Text>
              <Text variant="caption" color="ink3">{filteredCompanies.length}</Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {['Empresa', 'Plan', 'Alta', 'Estado', 'Acciones'].map((h, i) => (
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
                <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Cargando...</Text>
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
                            Empresa · {company.nif ?? 'Sin NIF'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    <View style={[styles.td, { width: 120 }]}>
                      <Badge label={PLAN_LABELS[company.plan] ?? 'Agencia'} variant="neutral" />
                    </View>
                    <View style={[styles.td, { width: 120 }]}>
                      <Text variant="small" color="ink2">{formatDate(company.created_at)}</Text>
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Badge
                        label={company.active ? 'Activo' : 'Inactivo'}
                        variant={company.active ? 'success' : 'neutral'}
                      />
                    </View>
                    <View style={[styles.td, { width: 260, flexDirection: 'row', gap: space[1] }]}>
                      <Button
                        label="Ver"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push(`/(admin)/empresa/${company.id}` as any)}
                      />
                      <Button
                        label={company.active ? 'Suspender' : 'Activar'}
                        variant="secondary"
                        size="sm"
                        onPress={() => handleToggleCompany(company)}
                      />
                      <Button
                        label="Borrar"
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
          Sin resultados
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
