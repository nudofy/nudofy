// ADM-02 · Agentes y empresas
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, Modal, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { useAdminAgents, useAdminCompanies } from '@/hooks/useAdmin';
import type { AdminAgent, AdminCompany } from '@/hooks/useAdmin';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PLAN_META: Record<string, { bg: string; text: string; label: string }> = {
  basic:       { bg: '#F1EFE8', text: '#5F5E5A', label: 'Básico'    },
  pro:         { bg: '#EEEDFE', text: '#3C3489', label: 'Pro'        },
  agency:      { bg: '#E6F1FB', text: '#0C447C', label: 'Agencia'    },
  agency_pro:  { bg: '#042C53', text: '#85B7EB', label: 'Ag. Pro'    },
};

// ——————————————————————————————
// Modal alta agente individual
// ——————————————————————————————
function ModalAltaAgente({
  visible, onClose, onCreate,
}: { visible: boolean; onClose: () => void; onCreate: (d: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [nif, setNif] = useState('');
  const [plan, setPlan] = useState<'basic' | 'pro'>('pro');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(''); setEmail(''); setPhone(''); setBusinessName(''); setNif(''); setPlan('pro');
  }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Campos requeridos', 'Nombre y email son obligatorios.');
      return;
    }
    setSaving(true);
    await onCreate({ name, email, phone, business_name: businessName, nif, plan });
    setSaving(false);
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dar de alta — Agente individual</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.formSection}>Datos personales</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nombre</Text>
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Ana García" placeholderTextColor="#ccc" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email <Text style={styles.formLabelSub}>(acceso a la app)</Text></Text>
              <TextInput style={styles.formInput} value={email} onChangeText={setEmail} placeholder="ana@empresa.com" placeholderTextColor="#ccc" keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.formGrid}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Teléfono <Text style={styles.formLabelSub}>(opcional)</Text></Text>
                <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} placeholder="+34 600 000 000" placeholderTextColor="#ccc" keyboardType="phone-pad" />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>NIF <Text style={styles.formLabelSub}>(opcional)</Text></Text>
                <TextInput style={styles.formInput} value={nif} onChangeText={setNif} placeholder="12345678A" placeholderTextColor="#ccc" autoCapitalize="characters" />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Empresa / Razón social <Text style={styles.formLabelSub}>(opcional)</Text></Text>
              <TextInput style={styles.formInput} value={businessName} onChangeText={setBusinessName} placeholder="Distribuciones García" placeholderTextColor="#ccc" />
            </View>

            <Text style={styles.formSection}>Plan</Text>
            <View style={styles.planSelector}>
              {(['basic', 'pro'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.planOpt, plan === p && styles.planOptSelected]}
                  onPress={() => setPlan(p)}
                >
                  <Text style={[styles.planOptName, plan === p && styles.planOptNameSelected]}>
                    {p === 'basic' ? 'Básico' : 'Pro'}
                  </Text>
                  <Text style={styles.planOptPrice}>
                    {p === 'basic' ? '15 €/mes · 100 prod · 20 cli' : '25 €/mes · 2.000 prod · 200 cli'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnCancel} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSave, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={styles.btnSaveText}>{saving ? 'Guardando...' : 'Dar de alta'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ——————————————————————————————
// Modal alta empresa
// ——————————————————————————————
function ModalAltaEmpresa({
  visible, onClose, onCreate,
}: { visible: boolean; onClose: () => void; onCreate: (d: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');
  const [plan, setPlan] = useState<'agency' | 'agency_pro'>('agency');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(''); setNif(''); setAddress(''); setPlan('agency'); setAdminName(''); setAdminEmail('');
  }

  async function handleSave() {
    if (!name.trim() || !adminName.trim() || !adminEmail.trim()) {
      Alert.alert('Campos requeridos', 'Razón social, nombre y email del administrador son obligatorios.');
      return;
    }
    setSaving(true);
    await onCreate({ name, nif, address, plan, adminName, adminEmail });
    setSaving(false);
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dar de alta — Empresa</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.formSection}>Datos de la empresa</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Razón social</Text>
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Comercial Rodríguez S.L." placeholderTextColor="#ccc" />
            </View>
            <View style={styles.formGrid}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>NIF / CIF <Text style={styles.formLabelSub}>(opcional)</Text></Text>
                <TextInput style={styles.formInput} value={nif} onChangeText={setNif} placeholder="B-12345678" placeholderTextColor="#ccc" autoCapitalize="characters" />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Dirección fiscal <Text style={styles.formLabelSub}>(opcional)</Text></Text>
              <TextInput style={styles.formInput} value={address} onChangeText={setAddress} placeholder="C/ Mayor 1, Madrid" placeholderTextColor="#ccc" />
            </View>

            <Text style={styles.formSection}>Administrador de la empresa</Text>
            <Text style={styles.formHint}>El administrador gestiona los agentes y tiene acceso completo al panel.</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nombre</Text>
              <TextInput style={styles.formInput} value={adminName} onChangeText={setAdminName} placeholder="María López" placeholderTextColor="#ccc" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email del administrador <Text style={styles.formLabelSub}>(acceso a la app)</Text></Text>
              <TextInput style={styles.formInput} value={adminEmail} onChangeText={setAdminEmail} placeholder="admin@empresa.com" placeholderTextColor="#ccc" keyboardType="email-address" autoCapitalize="none" />
            </View>

            <Text style={styles.formSection}>Plan</Text>
            <View style={styles.planSelector}>
              {(['agency', 'agency_pro'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.planOpt, plan === p && styles.planOptSelected]}
                  onPress={() => setPlan(p)}
                >
                  <Text style={[styles.planOptName, plan === p && styles.planOptNameSelected]}>
                    {p === 'agency' ? 'Agencia' : 'Agencia Pro'}
                  </Text>
                  <Text style={styles.planOptPrice}>
                    {p === 'agency' ? '45 € + 15 €/agente · hasta 10 ag.' : '150 € + 20 €/agente · ilimitado'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnCancel} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSave, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={styles.btnSaveText}>{saving ? 'Guardando...' : 'Dar de alta empresa'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ——————————————————————————————
// Pantalla principal
// ——————————————————————————————
type Tab = 'all' | 'agents' | 'companies';

export default function AdminAgentesScreen() {
  const router = useRouter();
  const { agents, loading: agentsLoading, toggleAgentActive, createAgent } = useAdminAgents();
  const { companies, loading: companiesLoading, toggleCompanyActive, createCompany } = useAdminCompanies();

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

  async function handleCreateAgent(data: any) {
    const { error } = await createAgent(data);
    if (error) Alert.alert('Error', error);
    else Alert.alert('Agente creado', 'Se ha enviado la invitación por email.');
  }

  async function handleCreateCompany(data: any) {
    const { error } = await createCompany(data);
    if (error) Alert.alert('Error', error);
    else Alert.alert('Empresa creada', 'Se ha enviado la invitación al administrador.');
  }

  const showAgents = tab === 'all' || tab === 'agents';
  const showCompanies = tab === 'all' || tab === 'companies';

  return (
    <AdminShell
      activeSection="agentes"
      title="Agentes y empresas"
      rightElement={
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowAltaEmpresa(true)}>
            <Text style={styles.btnSecondaryText}>+ Alta empresa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowAltaAgente(true)}>
            <Text style={styles.btnPrimaryText}>+ Alta agente</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtros */}
      <View style={styles.filtersBar}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.pillRow}>
          {['all', 'basic', 'pro', 'agency', 'agency_pro'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.pill, planFilter === p && styles.pillActive]}
              onPress={() => setPlanFilter(p)}
            >
              <Text style={[styles.pillText, planFilter === p && styles.pillTextActive]}>
                {p === 'all' ? 'Todos los planes' : PLAN_META[p]?.label ?? p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.pillRow}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Activos' },
            { key: 'inactive', label: 'Inactivos' },
          ].map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.pill, statusFilter === s.key && styles.pillActive]}
              onPress={() => setStatusFilter(s.key)}
            >
              <Text style={[styles.pillText, statusFilter === s.key && styles.pillTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.resultsCount}>{totalCount} registros</Text>
      </View>

      {/* Tabla agentes */}
      {showAgents && filteredAgents.length > 0 && (
        <View style={styles.card}>
          {tab === 'all' && (
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Agentes individuales</Text>
              <Text style={styles.cardCount}>{filteredAgents.length}</Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {['Agente', 'Plan', 'Alta', 'Estado', 'Acciones'].map((h, i) => (
                  <Text key={h} style={[styles.th, { width: [210, 110, 110, 100, 170][i] }]}>{h}</Text>
                ))}
              </View>
              {agentsLoading && <Text style={styles.emptyText}>Cargando...</Text>}
              {filteredAgents.map(agent => {
                const plan = PLAN_META[agent.plan] ?? PLAN_META.basic;
                const initials = agent.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <View key={agent.id} style={styles.tableRow}>
                    <TouchableOpacity
                      style={[styles.td, { width: 210 }]}
                      onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
                    >
                      <View style={styles.entityCell}>
                        <View style={[styles.av, { backgroundColor: '#EEEDFE' }]}>
                          <Text style={[styles.avText, { color: '#3C3489' }]}>{initials}</Text>
                        </View>
                        <View>
                          <Text style={styles.entityName}>{agent.name}</Text>
                          <Text style={styles.entitySub}>{agent.email}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={[styles.td, { width: 110 }]}>
                      <View style={[styles.tag, { backgroundColor: plan.bg }]}>
                        <Text style={[styles.tagText, { color: plan.text }]}>{plan.label}</Text>
                      </View>
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Text style={styles.tdText}>{formatDate(agent.created_at)}</Text>
                    </View>
                    <View style={[styles.td, { width: 100 }]}>
                      <View style={[styles.tag, { backgroundColor: agent.active ? '#EAF3DE' : '#F1EFE8' }]}>
                        <Text style={[styles.tagText, { color: agent.active ? '#3B6D11' : '#888' }]}>
                          {agent.active ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.td, { width: 170, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={styles.actBtn} onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}>
                        <Text style={styles.actBtnText}>Ver ficha</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actBtn, !agent.active && styles.actBtnSuccess]}
                        onPress={() => handleToggleAgent(agent)}
                      >
                        <Text style={[styles.actBtnText, !agent.active && styles.actBtnSuccessText]}>
                          {agent.active ? 'Desactivar' : 'Activar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Tabla empresas */}
      {showCompanies && filteredCompanies.length > 0 && (
        <View style={styles.card}>
          {tab === 'all' && (
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Empresas</Text>
              <Text style={styles.cardCount}>{filteredCompanies.length}</Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {['Empresa', 'Plan', 'Alta', 'Estado', 'Acciones'].map((h, i) => (
                  <Text key={h} style={[styles.th, { width: [210, 110, 110, 100, 170][i] }]}>{h}</Text>
                ))}
              </View>
              {companiesLoading && <Text style={styles.emptyText}>Cargando...</Text>}
              {filteredCompanies.map(company => {
                const plan = PLAN_META[company.plan] ?? PLAN_META.agency;
                const initials = company.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <View key={company.id} style={styles.tableRow}>
                    <TouchableOpacity
                      style={[styles.td, { width: 210 }]}
                      onPress={() => router.push(`/(admin)/empresa/${company.id}` as any)}
                    >
                      <View style={styles.entityCell}>
                        <View style={[styles.avSq, { backgroundColor: '#E6F1FB' }]}>
                          <Text style={[styles.avText, { color: '#0C447C' }]}>{initials}</Text>
                        </View>
                        <View>
                          <Text style={styles.entityName}>{company.name}</Text>
                          <Text style={styles.entitySub}>Empresa · {company.nif ?? 'Sin NIF'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={[styles.td, { width: 110 }]}>
                      <View style={[styles.tag, { backgroundColor: plan.bg }]}>
                        <Text style={[styles.tagText, { color: plan.text }]}>{plan.label}</Text>
                      </View>
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Text style={styles.tdText}>{formatDate(company.created_at)}</Text>
                    </View>
                    <View style={[styles.td, { width: 100 }]}>
                      <View style={[styles.tag, { backgroundColor: company.active ? '#EAF3DE' : '#F1EFE8' }]}>
                        <Text style={[styles.tagText, { color: company.active ? '#3B6D11' : '#888' }]}>
                          {company.active ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.td, { width: 170, flexDirection: 'row', gap: 6 }]}>
                      <TouchableOpacity style={styles.actBtn} onPress={() => router.push(`/(admin)/empresa/${company.id}` as any)}>
                        <Text style={styles.actBtnText}>Ver ficha</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actBtn, !company.active && styles.actBtnSuccess]}
                        onPress={() => handleToggleCompany(company)}
                      >
                        <Text style={[styles.actBtnText, !company.active && styles.actBtnSuccessText]}>
                          {company.active ? 'Suspender' : 'Activar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {totalCount === 0 && !agentsLoading && !companiesLoading && (
        <Text style={styles.emptyText}>Sin resultados</Text>
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
  headerActions: { flexDirection: 'row', gap: 6 },
  btnPrimary: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#534AB7',
  },
  btnPrimaryText: { fontSize: 12, fontWeight: '500', color: '#fff' },
  btnSecondary: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#444', backgroundColor: 'transparent',
  },
  btnSecondaryText: { fontSize: 12, fontWeight: '500', color: '#AFA9EC' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 0.5, borderColor: '#e8e8e8',
    overflow: 'hidden', alignSelf: 'flex-start',
  },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  tabBtnActive: { backgroundColor: '#534AB7' },
  tabBtnText: { fontSize: 13, fontWeight: '500', color: '#999' },
  tabBtnTextActive: { color: '#fff' },
  filtersBar: { gap: 8 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e8e8e8',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#1a1a1a' },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff',
  },
  pillActive: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  pillText: { fontSize: 12, color: '#888', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  resultsCount: { fontSize: 13, color: '#999' },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8', overflow: 'hidden',
  },
  cardHeader: {
    padding: 12, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  cardCount: { fontSize: 12, color: '#999' },
  tableHead: {
    flexDirection: 'row', backgroundColor: '#fafafa',
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  th: {
    fontSize: 11, fontWeight: '500', color: '#999',
    padding: 10, paddingHorizontal: 16,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8' },
  td: { padding: 11, paddingHorizontal: 16, justifyContent: 'center' },
  tdText: { fontSize: 13, color: '#1a1a1a' },
  entityCell: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  av: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avSq: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  avText: { fontSize: 11, fontWeight: '500' },
  entityName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  entitySub: { fontSize: 11, color: '#bbb', marginTop: 1 },
  tag: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  tagText: { fontSize: 10, fontWeight: '500' },
  actBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff',
  },
  actBtnText: { fontSize: 11, fontWeight: '500', color: '#534AB7' },
  actBtnSuccess: { borderColor: '#A8DFC9' },
  actBtnSuccessText: { color: '#1D9E75' },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 16,
    width: '90%', maxWidth: 480, maxHeight: '90%',
  },
  modalHeader: {
    padding: 18, paddingHorizontal: 22,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { fontSize: 15, fontWeight: '500', color: '#1a1a1a', flex: 1 },
  modalClose: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#f5f5f3', alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { color: '#666', fontSize: 14 },
  modalBody: { padding: 22, paddingTop: 18 },
  modalFooter: {
    padding: 14, paddingHorizontal: 22,
    borderTopWidth: 0.5, borderTopColor: '#f0f0f0',
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
  },
  formSection: {
    fontSize: 11, fontWeight: '500', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 12, marginTop: 8,
    paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  formHint: { fontSize: 12, color: '#999', marginBottom: 12, lineHeight: 17 },
  formGroup: { marginBottom: 14 },
  formGrid: { flexDirection: 'row', gap: 10 },
  formLabel: { fontSize: 12, fontWeight: '500', color: '#555', marginBottom: 6 },
  formLabelSub: { color: '#bbb', fontWeight: '400' },
  formInput: {
    borderWidth: 1, borderColor: '#e8e8e8',
    borderRadius: 9, padding: 9, paddingHorizontal: 12,
    fontSize: 13, color: '#1a1a1a', backgroundColor: '#fff',
  },
  planSelector: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  planOpt: {
    flex: 1, minWidth: 130,
    borderWidth: 1.5, borderColor: '#e8e8e8',
    borderRadius: 10, padding: 12,
  },
  planOptSelected: { borderColor: '#534AB7', backgroundColor: '#EEEDFE' },
  planOptName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  planOptNameSelected: { color: '#3C3489' },
  planOptPrice: { fontSize: 11, color: '#999', marginTop: 3 },
  btnCancel: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 9, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff',
  },
  btnCancelText: { fontSize: 13, fontWeight: '500', color: '#555' },
  btnSave: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 9, backgroundColor: '#534AB7',
  },
  btnSaveText: { fontSize: 13, fontWeight: '500', color: '#fff' },
});
