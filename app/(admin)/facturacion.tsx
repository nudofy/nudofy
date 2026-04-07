// ADM-05 · Facturación
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert,
} from 'react-native';
import AdminShell from '@/components/AdminShell';
import { useAdminInvoices } from '@/hooks/useAdmin';
import type { AdminInvoice } from '@/hooks/useAdmin';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  paid:    { bg: '#EAF3DE', text: '#3B6D11', label: 'Pagada'   },
  pending: { bg: '#FAEEDA', text: '#854F0B', label: 'Pendiente' },
  overdue: { bg: '#FCEBEB', text: '#A32D2D', label: 'Vencida'   },
};

const PLAN_META: Record<string, { bg: string; text: string; label: string }> = {
  basic:      { bg: '#F1EFE8', text: '#5F5E5A', label: 'Básico'     },
  pro:        { bg: '#EEEDFE', text: '#3C3489', label: 'Pro'         },
  agency:     { bg: '#E6F1FB', text: '#0C447C', label: 'Agencia'     },
  agency_pro: { bg: '#042C53', text: '#85B7EB', label: 'Ag. Pro'     },
};

const FLOW_STEPS = [
  { n: '1', title: 'Stripe genera cobro', sub: 'El 1 de cada mes Stripe intenta el cargo automático' },
  { n: '2', title: 'Email Resend', sub: 'Se envía la factura por email al agente' },
  { n: '3', title: 'Actualiza BD', sub: 'El webhook de Stripe actualiza el estado en Supabase' },
];

export default function AdminFacturacionScreen() {
  const { invoices, loading, markAsPaid } = useAdminInvoices();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !search ||
        (inv.agent as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (inv.invoice_number ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);

  function handleMarkPaid(inv: AdminInvoice) {
    Alert.alert(
      'Marcar como pagada',
      `¿Marcar la factura ${inv.invoice_number ?? inv.id.slice(0, 8)} como pagada?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => markAsPaid(inv.id) },
      ]
    );
  }

  return (
    <AdminShell activeSection="facturacion" title="Facturación">
      {/* KPIs */}
      <View style={styles.kpiRow}>
        <KpiCard label="Cobrado este mes" value={formatEur(totalPaid)} color="#3B6D11" />
        <KpiCard label="Pendiente" value={formatEur(totalPending)} color="#BA7517" />
        <KpiCard label="Vencido" value={formatEur(totalOverdue)} color="#A32D2D" />
      </View>

      {/* Flujo de cobro */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Flujo de cobro automático</Text>
        </View>
        <View style={styles.flowRow}>
          {FLOW_STEPS.map(step => (
            <View key={step.n} style={styles.flowStep}>
              <View style={styles.flowNum}>
                <Text style={styles.flowNumText}>{step.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flowTitle}>{step.title}</Text>
                <Text style={styles.flowSub}>{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersBar}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por agente o nº factura..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.pillsRow}>
          {['all', 'paid', 'pending', 'overdue'].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, statusFilter === s && styles.pillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.pillText, statusFilter === s && styles.pillTextActive]}>
                {s === 'all' ? 'Todas' : STATUS_META[s]?.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.resultsCount}>{filtered.length} facturas</Text>
      </View>

      {/* Tabla */}
      <View style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHead}>
              {['Agente', 'Factura', 'Plan', 'Período', 'Importe', 'Estado', 'Acciones'].map((h, i) => (
                <Text key={h} style={[styles.th, { width: [180, 130, 90, 90, 90, 100, 140][i] }]}>{h}</Text>
              ))}
            </View>
            {loading && <Text style={styles.emptyText}>Cargando...</Text>}
            {!loading && filtered.length === 0 && (
              <Text style={styles.emptyText}>Sin facturas</Text>
            )}
            {filtered.map(inv => {
              const status = STATUS_META[inv.status] ?? STATUS_META.pending;
              const plan = PLAN_META[inv.plan] ?? PLAN_META.basic;
              const agentName = (inv as any).agent?.name ?? '—';
              const initials = agentName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <View key={inv.id} style={styles.tableRow}>
                  <View style={[styles.td, { width: 180 }]}>
                    <View style={styles.entityCell}>
                      <View style={[styles.av, { backgroundColor: '#EEEDFE' }]}>
                        <Text style={[styles.avText, { color: '#3C3489' }]}>{initials}</Text>
                      </View>
                      <View>
                        <Text style={styles.entityName}>{agentName}</Text>
                        <Text style={styles.entitySub}>{(inv as any).agent?.email ?? '—'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.td, { width: 130 }]}>
                    <Text style={styles.invoiceNum}>{inv.invoice_number ?? inv.id.slice(0, 8)}</Text>
                    <Text style={styles.invoiceDate}>{formatDate(inv.created_at)}</Text>
                  </View>
                  <View style={[styles.td, { width: 90 }]}>
                    <View style={[styles.tag, { backgroundColor: plan.bg }]}>
                      <Text style={[styles.tagText, { color: plan.text }]}>{plan.label}</Text>
                    </View>
                  </View>
                  <View style={[styles.td, { width: 90 }]}>
                    <Text style={styles.tdText}>{inv.period}</Text>
                  </View>
                  <View style={[styles.td, { width: 90 }]}>
                    <Text style={styles.amountText}>{formatEur(inv.total)}</Text>
                  </View>
                  <View style={[styles.td, { width: 100 }]}>
                    <View style={[styles.tag, { backgroundColor: status.bg }]}>
                      <Text style={[styles.tagText, { color: status.text }]}>{status.label}</Text>
                    </View>
                  </View>
                  <View style={[styles.td, { width: 140, flexDirection: 'row', gap: 5 }]}>
                    <TouchableOpacity style={styles.actBtn}>
                      <Text style={styles.actBtnText}>Ver PDF</Text>
                    </TouchableOpacity>
                    {inv.status !== 'paid' && (
                      <TouchableOpacity
                        style={[styles.actBtn, styles.actBtnSuccess]}
                        onPress={() => handleMarkPaid(inv)}
                      >
                        <Text style={[styles.actBtnText, styles.actBtnSuccessText]}>Marcar pagada</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </AdminShell>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  kpiCard: {
    flex: 1, minWidth: 130,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8',
    padding: 16,
  },
  kpiLabel: { fontSize: 11, color: '#999', marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8', overflow: 'hidden',
  },
  cardHeader: {
    padding: 13, paddingHorizontal: 18,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  cardTitle: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  flowRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 8 },
  flowStep: {
    flex: 1, minWidth: 180,
    backgroundColor: '#f9f9f9', borderRadius: 10,
    padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  flowNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#534AB7',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  flowNumText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  flowTitle: { fontSize: 12, fontWeight: '500', color: '#1a1a1a' },
  flowSub: { fontSize: 11, color: '#999', marginTop: 3, lineHeight: 16 },
  filtersBar: { gap: 8 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e8e8e8',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#1a1a1a' },
  pillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff',
  },
  pillActive: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  pillText: { fontSize: 12, color: '#888', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  resultsCount: { fontSize: 13, color: '#999' },
  tableHead: {
    flexDirection: 'row', backgroundColor: '#fafafa',
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  th: { fontSize: 11, fontWeight: '500', color: '#999', padding: 10, paddingHorizontal: 16 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8' },
  td: { padding: 11, paddingHorizontal: 16, justifyContent: 'center' },
  tdText: { fontSize: 13, color: '#1a1a1a' },
  entityCell: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  av: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  avText: { fontSize: 10, fontWeight: '500' },
  entityName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  entitySub: { fontSize: 11, color: '#bbb', marginTop: 1 },
  invoiceNum: { fontSize: 12, fontWeight: '500', color: '#1a1a1a' },
  invoiceDate: { fontSize: 11, color: '#bbb', marginTop: 2 },
  amountText: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  tag: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  tagText: { fontSize: 10, fontWeight: '500' },
  actBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 7, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff',
  },
  actBtnText: { fontSize: 10, fontWeight: '500', color: '#534AB7' },
  actBtnSuccess: { borderColor: '#A8DFC9' },
  actBtnSuccessText: { color: '#1D9E75' },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 },
});
