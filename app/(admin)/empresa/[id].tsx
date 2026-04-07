// ADM-07 · Ficha de empresa
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { useAdminCompanyDetail } from '@/hooks/useAdmin';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0 }) + ' €';
}

const PLAN_META: Record<string, { bg: string; text: string; label: string; maxAgents: number; maxClients: number; maxProducts: number }> = {
  agency:     { bg: '#E6F1FB', text: '#0C447C', label: 'Agencia',     maxAgents: 10,  maxClients: 500, maxProducts: 5000    },
  agency_pro: { bg: '#042C53', text: '#85B7EB', label: 'Agencia Pro', maxAgents: 999, maxClients: 999999, maxProducts: 999999 },
};

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = max > 0 && max < 999999 ? Math.min((current / max) * 100, 100) : 0;
  const barColor = pct >= 90 ? '#A32D2D' : pct >= 70 ? '#BA7517' : '#3B6D11';
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageTop}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={styles.usageVal}>
          {current.toLocaleString('es-ES')}
          {max < 999999 ? ` / ${max.toLocaleString('es-ES')}` : ' (ilimitado)'}
        </Text>
      </View>
      {max < 999999 && (
        <View style={styles.usageBarWrap}>
          <View style={[styles.usageBar, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        </View>
      )}
    </View>
  );
}

export default function AdminEmpresaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { company, agents, invoices, clientCount, productCount, loading, updateCompany, toggleActive } = useAdminCompanyDetail(id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNif, setEditNif] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading || !company) {
    return (
      <AdminShell activeSection="agentes" title="Cargando...">
        <Text style={styles.emptyText}>Cargando empresa...</Text>
      </AdminShell>
    );
  }

  const plan = PLAN_META[company.plan] ?? PLAN_META.agency;
  const initials = company.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  // Facturación mensual: plan base + agentes extra
  const basePrice = company.plan === 'agency' ? 45 : 150;
  const agentPrice = company.plan === 'agency' ? 15 : 20;
  const activeAgentCount = agents.filter(a => a.active).length;
  const monthlyTotal = basePrice + activeAgentCount * agentPrice;

  // Upgrade suggestion: show if agency plan and usage > 70%
  const showUpgrade = company.plan === 'agency' && (
    activeAgentCount / plan.maxAgents > 0.7 ||
    clientCount / plan.maxClients > 0.7 ||
    productCount / plan.maxProducts > 0.7
  );

  function startEdit() {
    setEditName(company.name);
    setEditNif(company.nif ?? '');
    setEditAddress(company.address ?? '');
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await updateCompany({ name: editName, nif: editNif, address: editAddress });
    setSaving(false);
    if (error) Alert.alert('Error', error);
    else setEditing(false);
  }

  async function handleToggleActive() {
    Alert.alert(
      company.active ? 'Suspender empresa' : 'Activar empresa',
      `¿${company.active ? 'Suspender' : 'Activar'} a ${company.name}? ${company.active ? 'Los agentes perderán acceso.' : ''}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: company.active ? 'Suspender' : 'Activar',
          style: company.active ? 'destructive' : 'default',
          onPress: async () => {
            const { error } = await toggleActive(!company.active);
            if (error) Alert.alert('Error', error);
          },
        },
      ]
    );
  }

  return (
    <AdminShell activeSection="agentes" title="">
      {/* Breadcrumb + acciones */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.breadcrumbWrap}>
          <Text style={styles.breadcrumb}>← Agentes</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Ficha de empresa</Text>
        <View style={styles.pageActions}>
          <TouchableOpacity
            style={[styles.btnDanger, !company.active && styles.btnSuccess]}
            onPress={handleToggleActive}
          >
            <Text style={[styles.btnDangerText, !company.active && styles.btnSuccessText]}>
              {company.active ? 'Suspender' : 'Activar'}
            </Text>
          </TouchableOpacity>
          {editing ? (
            <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={styles.btnPrimaryText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={startEdit}>
              <Text style={styles.btnPrimaryText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cabecera empresa */}
      <View style={styles.companyHeader}>
        <View style={[styles.companyAv, { backgroundColor: '#E6F1FB' }]}>
          <Text style={[styles.companyAvText, { color: '#0C447C' }]}>{initials}</Text>
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyContact}>Alta: {formatDate(company.created_at)}</Text>
          <View style={styles.companyMeta}>
            <View style={[styles.tag, { backgroundColor: plan.bg }]}>
              <Text style={[styles.tagText, { color: plan.text }]}>Plan {plan.label}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: company.active ? '#EAF3DE' : '#F1EFE8' }]}>
              <Text style={[styles.tagText, { color: company.active ? '#3B6D11' : '#888' }]}>
                {company.active ? 'Activo' : 'Suspendido'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Agentes activos</Text>
          <Text style={styles.kpiValue}>
            {activeAgentCount}
            {plan.maxAgents < 999 ? <Text style={styles.kpiSub}> / {plan.maxAgents}</Text> : null}
          </Text>
          <Text style={styles.kpiSub}>
            {plan.maxAgents < 999 ? `${plan.maxAgents - activeAgentCount} plazas disponibles` : 'Ilimitados'}
          </Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Clientes totales</Text>
          <Text style={styles.kpiValue}>
            {clientCount.toLocaleString('es-ES')}
            {plan.maxClients < 999999 ? <Text style={styles.kpiSub}> / {plan.maxClients.toLocaleString('es-ES')}</Text> : null}
          </Text>
          <Text style={styles.kpiSub}>
            {plan.maxClients < 999999 ? `${(plan.maxClients - clientCount).toLocaleString('es-ES')} disponibles` : 'Ilimitados'}
          </Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Productos en catálogo</Text>
          <Text style={styles.kpiValue}>
            {productCount.toLocaleString('es-ES')}
            {plan.maxProducts < 999999 ? <Text style={styles.kpiSub}> / {plan.maxProducts.toLocaleString('es-ES')}</Text> : null}
          </Text>
          <Text style={styles.kpiSub}>
            {plan.maxProducts < 999999 ? `${(plan.maxProducts - productCount).toLocaleString('es-ES')} disponibles` : 'Ilimitados'}
          </Text>
        </View>
        <View style={[styles.kpi, { backgroundColor: '#534AB7', borderColor: '#534AB7' }]}>
          <Text style={[styles.kpiLabel, { color: '#AFA9EC' }]}>Facturación mensual</Text>
          <Text style={[styles.kpiValue, { color: '#fff' }]}>{formatEur(monthlyTotal)}</Text>
          <Text style={[styles.kpiSub, { color: '#AFA9EC' }]}>
            {basePrice} € base + {activeAgentCount} × {agentPrice} €
          </Text>
        </View>
      </View>

      {/* Banner upgrade */}
      {showUpgrade && (
        <View style={styles.upgradeBanner}>
          <View style={styles.upgradeBannerIcon}>
            <Text style={{ color: '#fff', fontSize: 16 }}>↑</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeTitle}>Sugerencia — Plan Agencia Pro</Text>
            <Text style={styles.upgradeSub}>
              Esta empresa se acerca a los límites del plan Agencia. Agencia Pro ofrece todo ilimitado.
            </Text>
            <TouchableOpacity style={styles.upgradeBtn}>
              <Text style={styles.upgradeBtnText}>Proponer upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Datos de la empresa */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Datos de la empresa</Text>
          {!editing && (
            <TouchableOpacity onPress={startEdit}>
              <Text style={styles.cardAction}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>
        {editing ? (
          <View style={styles.editBody}>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Razón social</Text>
              <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>NIF / CIF</Text>
              <TextInput style={styles.editInput} value={editNif} onChangeText={setEditNif} placeholder="B-12345678" placeholderTextColor="#ccc" autoCapitalize="characters" />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Dirección fiscal</Text>
              <TextInput style={styles.editInput} value={editAddress} onChangeText={setEditAddress} placeholder="C/ Mayor 1, Madrid" placeholderTextColor="#ccc" />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setEditing(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.btnPrimaryText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <FieldRow label="Razón social" value={company.name} />
            <FieldRow label="NIF" value={company.nif ?? '—'} />
            <FieldRow label="Dirección fiscal" value={company.address ?? '—'} />
            <FieldRow label="Plan activo" value={`${plan.label} · ${formatEur(monthlyTotal)}/mes`} accent />
            <FieldRow label="Alta" value={formatDate(company.created_at)} />
          </>
        )}
      </View>

      {/* Uso del plan */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Uso del plan</Text>
        </View>
        <UsageBar label="Agentes" current={activeAgentCount} max={plan.maxAgents} />
        <UsageBar label="Clientes" current={clientCount} max={plan.maxClients} />
        <UsageBar label="Productos" current={productCount} max={plan.maxProducts} />
      </View>

      {/* Agentes de la empresa */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Agentes de la empresa</Text>
          <Text style={styles.cardCount}>{agents.length}</Text>
        </View>
        {agents.length === 0 ? (
          <Text style={styles.emptyText}>Sin agentes aún</Text>
        ) : (
          agents.map(agent => {
            const initials2 = agent.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
            const isAdmin = agent.role === 'admin';
            return (
              <View key={agent.id} style={styles.agentRow}>
                <View style={[styles.agentAv, { backgroundColor: isAdmin ? '#EEEDFE' : '#F1EFE8' }]}>
                  <Text style={[styles.agentAvText, { color: isAdmin ? '#3C3489' : '#5F5E5A' }]}>{initials2}</Text>
                </View>
                <View style={styles.agentBody}>
                  <View style={styles.agentNameRow}>
                    <Text style={styles.agentName}>{agent.name}</Text>
                    <View style={[styles.roleTag, { backgroundColor: isAdmin ? '#EEEDFE' : '#F1EFE8' }]}>
                      <Text style={[styles.roleTagText, { color: isAdmin ? '#3C3489' : '#5F5E5A' }]}>
                        {isAdmin ? 'Admin' : 'Agente'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.agentEmail}>{agent.email}</Text>
                  <Text style={styles.agentStats}>
                    {agent.client_count} clientes · {agent.order_count_month} pedidos este mes
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.actBtn}
                  onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
                >
                  <Text style={styles.actBtnText}>Ver ficha</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Facturas */}
      {invoices.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Historial de facturas</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {['Período', 'Importe', 'IVA', 'Total', 'Estado'].map((h, i) => (
                  <Text key={h} style={[styles.th, { width: [120, 90, 80, 90, 100][i] }]}>{h}</Text>
                ))}
              </View>
              {invoices.map(inv => {
                const statusMeta: Record<string, { bg: string; text: string; label: string }> = {
                  paid:    { bg: '#EAF3DE', text: '#3B6D11', label: 'Pagada'    },
                  pending: { bg: '#FAEEDA', text: '#854F0B', label: 'Pendiente' },
                  overdue: { bg: '#FCEBEB', text: '#A32D2D', label: 'Vencida'   },
                };
                const s = statusMeta[inv.status] ?? statusMeta.pending;
                return (
                  <View key={inv.id} style={styles.tableRow}>
                    <View style={[styles.td, { width: 120 }]}>
                      <Text style={styles.tdText}>{inv.period}</Text>
                    </View>
                    <View style={[styles.td, { width: 90 }]}>
                      <Text style={styles.tdText}>{formatEur(inv.amount)}</Text>
                    </View>
                    <View style={[styles.td, { width: 80 }]}>
                      <Text style={styles.tdText}>{formatEur(inv.iva)}</Text>
                    </View>
                    <View style={[styles.td, { width: 90 }]}>
                      <Text style={[styles.tdText, { fontWeight: '500' }]}>{formatEur(inv.total)}</Text>
                    </View>
                    <View style={[styles.td, { width: 100 }]}>
                      <View style={[styles.tag, { backgroundColor: s.bg }]}>
                        <Text style={[styles.tagText, { color: s.text }]}>{s.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </AdminShell>
  );
}

function FieldRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, accent && styles.fieldValueAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  breadcrumbWrap: { marginRight: 4 },
  breadcrumb: { fontSize: 13, color: '#534AB7' },
  pageTitle: { fontSize: 16, fontWeight: '500', color: '#1a1a1a', flex: 1 },
  pageActions: { flexDirection: 'row', gap: 8 },
  btnDanger: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 9, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#F09595',
  },
  btnDangerText: { fontSize: 12, fontWeight: '500', color: '#A32D2D' },
  btnSuccess: { borderColor: '#A8DFC9' },
  btnSuccessText: { color: '#1D9E75' },
  btnPrimary: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 9, backgroundColor: '#534AB7',
  },
  btnPrimaryText: { fontSize: 12, fontWeight: '500', color: '#fff' },
  companyHeader: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8',
    padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14,
  },
  companyAv: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  companyAvText: { fontSize: 16, fontWeight: '500' },
  companyInfo: { flex: 1 },
  companyName: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  companyContact: { fontSize: 12, color: '#999', marginTop: 3 },
  companyMeta: { flexDirection: 'row', gap: 7, marginTop: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '500' },
  kpiGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  kpi: {
    flex: 1, minWidth: 140,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 0.5, borderColor: '#e8e8e8', padding: 14,
  },
  kpiLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
  kpiSub: { fontSize: 11, color: '#bbb', marginTop: 3, lineHeight: 16 },
  upgradeBanner: {
    backgroundColor: '#E6F1FB', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  upgradeBannerIcon: {
    width: 34, height: 34, borderRadius: 9, backgroundColor: '#185FA5',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  upgradeTitle: { fontSize: 13, fontWeight: '500', color: '#0C447C' },
  upgradeSub: { fontSize: 12, color: '#185FA5', marginTop: 3, lineHeight: 17 },
  upgradeBtn: {
    marginTop: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 9, backgroundColor: '#185FA5', alignSelf: 'flex-start',
  },
  upgradeBtnText: { fontSize: 12, fontWeight: '500', color: '#fff' },
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
  cardAction: { fontSize: 12, color: '#534AB7' },
  fieldRow: {
    padding: 10, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8', gap: 12,
  },
  fieldLabel: { fontSize: 12, color: '#bbb', flexShrink: 0 },
  fieldValue: { fontSize: 12, fontWeight: '500', color: '#1a1a1a', textAlign: 'right', flex: 1 },
  fieldValueAccent: { color: '#534AB7' },
  editBody: { padding: 16, gap: 12 },
  editGroup: { gap: 6 },
  editLabel: { fontSize: 12, fontWeight: '500', color: '#555' },
  editInput: {
    borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 9,
    padding: 9, paddingHorizontal: 12,
    fontSize: 13, color: '#1a1a1a',
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  btnCancel: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 9, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff',
  },
  btnCancelText: { fontSize: 12, fontWeight: '500', color: '#555' },
  usageRow: { padding: 10, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8' },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  usageLabel: { fontSize: 12, color: '#555' },
  usageVal: { fontSize: 12, fontWeight: '500', color: '#1a1a1a' },
  usageBarWrap: { height: 5, backgroundColor: '#f0f0f0', borderRadius: 3 },
  usageBar: { height: 5, borderRadius: 3 },
  agentRow: {
    padding: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 11,
    borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8',
  },
  agentAv: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  agentAvText: { fontSize: 11, fontWeight: '500' },
  agentBody: { flex: 1 },
  agentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  agentName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  agentEmail: { fontSize: 11, color: '#bbb', marginTop: 1 },
  agentStats: { fontSize: 11, color: '#999', marginTop: 2 },
  roleTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  roleTagText: { fontSize: 9, fontWeight: '500' },
  actBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff', flexShrink: 0,
  },
  actBtnText: { fontSize: 11, fontWeight: '500', color: '#534AB7' },
  tableHead: {
    flexDirection: 'row', backgroundColor: '#fafafa',
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  th: { fontSize: 11, fontWeight: '500', color: '#999', padding: 10, paddingHorizontal: 16 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8' },
  td: { padding: 10, paddingHorizontal: 16, justifyContent: 'center' },
  tdText: { fontSize: 12, color: '#1a1a1a' },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 },
});
