// ADM-05 · Facturación
import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, TextInput, Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

const PLAN_PRICES: Record<string, { base: number }> = {
  basic:      { base: 7.44 },  // 9 € con IVA
  pro:        { base: 15.70 }, // 19 € con IVA
  agency:     { base: 32.23 }, // 39 € con IVA
  agency_pro: { base: 65.29 }, // 79 € con IVA
};

function buildInvoiceHtml(inv: AdminInvoice): string {
  const agentName = inv.agent?.name ?? '—';
  const agentEmail = inv.agent?.email ?? '—';
  const invNumber = inv.invoice_number ?? inv.id.slice(0, 8).toUpperCase();
  const planLabel = PLAN_LABELS[inv.plan] ?? inv.plan;
  const dateStr = new Date(inv.created_at).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const base = inv.amount ?? (inv.total / 1.21);
  const iva = inv.iva ?? (inv.total - base);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .brand { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .brand span { color: #e63946; }
  .inv-meta { text-align: right; }
  .inv-meta h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
  .inv-meta p { font-size: 13px; color: #444; }
  .divider { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
  .parties { display: flex; gap: 40px; margin-bottom: 32px; }
  .party { flex: 1; }
  .party-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #999; margin-bottom: 8px; }
  .party-name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
  .party-detail { font-size: 13px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f5f5f5; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #666; }
  tbody td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  .text-right { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .total-row.final { font-size: 16px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 4px; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999; text-align: center; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: ${inv.status === 'paid' ? '#dcfce7' : inv.status === 'overdue' ? '#fee2e2' : '#fef9c3'}; color: ${inv.status === 'paid' ? '#166534' : inv.status === 'overdue' ? '#991b1b' : '#713f12'}; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Nudofy<span>.</span></div>
    <div class="inv-meta">
      <h2>Factura</h2>
      <p><strong>${invNumber}</strong></p>
      <p>${dateStr}</p>
      <p style="margin-top:6px"><span class="badge">${inv.status === 'paid' ? 'Pagada' : inv.status === 'overdue' ? 'Vencida' : 'Pendiente'}</span></p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Emisor</div>
      <div class="party-name">Nudofy S.L.</div>
      <div class="party-detail">nudofyapp@gmail.com</div>
      <div class="party-detail">Período: ${inv.period}</div>
    </div>
    <div class="party">
      <div class="party-label">Cliente</div>
      <div class="party-name">${agentName}</div>
      <div class="party-detail">${agentEmail}</div>
    </div>
  </div>

  <hr class="divider"/>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Plan</th>
        <th>Período</th>
        <th class="text-right">Importe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Suscripción Nudofy — ${planLabel}</td>
        <td>${planLabel}</td>
        <td>${inv.period}</td>
        <td class="text-right">${base.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Base imponible</span>
      <span>${base.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
    </div>
    <div class="total-row">
      <span>IVA (21%)</span>
      <span>${iva.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
    </div>
    <div class="total-row final">
      <span>Total</span>
      <span>${inv.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
    </div>
  </div>

  <div class="footer">
    Nudofy S.L. · nudofyapp@gmail.com · nudofy.app<br/>
    Este documento es una factura generada electrónicamente.
  </div>
</body>
</html>`;
}

export default function AdminFacturacionScreen() {
  const { invoices, loading, markAsPaid } = useAdminInvoices();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

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

  async function handleGeneratePdf(inv: AdminInvoice) {
    setGeneratingPdfId(inv.id);
    try {
      const html = buildInvoiceHtml(inv);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Factura ${inv.invoice_number ?? inv.id.slice(0, 8)}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      // silently ignore share cancellation
    } finally {
      setGeneratingPdfId(null);
    }
  }

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
                    <Button
                      label={generatingPdfId === inv.id ? '...' : 'PDF'}
                      variant="secondary"
                      size="sm"
                      onPress={() => handleGeneratePdf(inv)}
                      disabled={generatingPdfId === inv.id}
                    />
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
