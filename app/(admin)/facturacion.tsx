// ADM-05 · Facturación
import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, TextInput, Alert,
} from 'react-native';
import AdminShell from '@/components/AdminShell';
import { useAdminInvoices } from '@/hooks/useAdmin';
import type { AdminInvoice } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  paid:    { variant: 'success',  label: 'Pagada'    },
  pending: { variant: 'warning',  label: 'Pendiente' },
  overdue: { variant: 'danger',   label: 'Vencida'   },
};

const PLAN_LABELS: Record<string, string> = {
  basic:      'Básico',
  pro:        'Pro',
  agency:     'Agencia',
  agency_pro: 'Ag. Pro',
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
        <KpiCard label="Cobrado este mes" value={formatEur(totalPaid)} tone="success" />
        <KpiCard label="Pendiente" value={formatEur(totalPending)} tone="warning" />
        <KpiCard label="Vencido" value={formatEur(totalOverdue)} tone="danger" />
      </View>

      {/* Flujo */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">Flujo de cobro automático</Text>
        </View>
        <View style={styles.flowRow}>
          {FLOW_STEPS.map(step => (
            <View key={step.n} style={styles.flowStep}>
              <View style={styles.flowNum}>
                <Text variant="smallMedium" color="white">{step.n}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="smallMedium">{step.title}</Text>
                <Text variant="caption" color="ink3">{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersBar}>
        <View style={styles.searchWrap}>
          <Icon name="Search" size={16} color={colors.ink3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por agente o nº factura..."
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.pillsRow}>
          {['all', 'paid', 'pending', 'overdue'].map(s => (
            <Pressable
              key={s}
              style={[styles.pill, statusFilter === s && styles.pillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text
                variant="smallMedium"
                style={{ color: statusFilter === s ? colors.white : colors.ink2 }}
              >
                {s === 'all' ? 'Todas' : STATUS_META[s]?.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text variant="caption" color="ink3">{filtered.length} facturas</Text>
      </View>

      {/* Tabla */}
      <View style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHead}>
              {['Agente', 'Factura', 'Plan', 'Período', 'Importe', 'Estado', 'Acciones'].map((h, i) => (
                <Text
                  key={h}
                  variant="caption"
                  color="ink3"
                  style={[styles.th, { width: [200, 140, 100, 100, 110, 110, 180][i] }]}
                >
                  {h.toUpperCase()}
                </Text>
              ))}
            </View>
            {loading && (
              <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Cargando...</Text>
            )}
            {!loading && filtered.length === 0 && (
              <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Sin facturas</Text>
            )}
            {filtered.map((inv, i) => {
              const status = STATUS_META[inv.status] ?? STATUS_META.pending;
              const agentName = (inv as any).agent?.name ?? '—';
              return (
                <View
                  key={inv.id}
                  style={[styles.tableRow, i === filtered.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={[styles.td, { width: 200 }]}>
                    <View style={styles.entityCell}>
                      <Avatar name={agentName} size={32} fontSize={12} />
                      <View style={{ flex: 1 }}>
                        <Text variant="smallMedium" numberOfLines={1}>{agentName}</Text>
                        <Text variant="caption" color="ink3" numberOfLines={1}>
                          {(inv as any).agent?.email ?? '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.td, { width: 140 }]}>
                    <Text variant="smallMedium">{inv.invoice_number ?? inv.id.slice(0, 8)}</Text>
                    <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                      {formatDate(inv.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.td, { width: 100 }]}>
                    <Badge label={PLAN_LABELS[inv.plan] ?? 'Básico'} variant="neutral" />
                  </View>
                  <View style={[styles.td, { width: 100 }]}>
                    <Text variant="small" color="ink2">{inv.period}</Text>
                  </View>
                  <View style={[styles.td, { width: 110 }]}>
                    <Text variant="smallMedium">{formatEur(inv.total)}</Text>
                  </View>
                  <View style={[styles.td, { width: 110 }]}>
                    <Badge label={status.label} variant={status.variant} />
                  </View>
                  <View style={[styles.td, { width: 180, flexDirection: 'row', gap: space[1] }]}>
                    <Button label="PDF" variant="secondary" size="sm" onPress={() => {}} />
                    {inv.status !== 'paid' && (
                      <Button
                        label="Marcar pagada"
                        variant="secondary"
                        size="sm"
                        onPress={() => handleMarkPaid(inv)}
                      />
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

function KpiCard({ label, value, tone }: {
  label: string; value: string; tone: 'success' | 'warning' | 'danger';
}) {
  const color = tone === 'success' ? colors.success
    : tone === 'warning' ? colors.warning
    : colors.danger;
  return (
    <View style={styles.kpiCard}>
      <Text variant="caption" color="ink3">{label}</Text>
      <Text variant="display" style={{ color, marginTop: space[1] }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  kpiCard: {
    flex: 1, minWidth: 140,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },

  flowRow: { flexDirection: 'row', flexWrap: 'wrap', padding: space[3], gap: space[2] },
  flowStep: {
    flex: 1, minWidth: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[2],
  },
  flowNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },

  filtersBar: { gap: space[2] },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: space[3], paddingVertical: space[2], gap: space[2],
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 2 },

  pillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: space[3], paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },

  tableHead: {
    flexDirection: 'row', backgroundColor: colors.surface2,
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

  emptyText: { paddingVertical: space[6] },
});
