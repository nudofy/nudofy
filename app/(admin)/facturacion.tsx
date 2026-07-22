// ADM-05 · Facturación
import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, TextInput, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { pickFile } from '@/lib/filePicker';
import { supabase } from '@/lib/supabase';
import AdminShell from '@/components/AdminShell';
import { useAdminInvoices } from '@/hooks/useAdmin';
import type { AdminInvoice } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';

function formatPlanLabel(plan: string): string {
  return plan.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminFacturacionScreen() {
  const { t, i18n } = useTranslation('admin');

  function formatEur(n: number) {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function formatDate(iso: string) {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const STATUS_META: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
    paid:    { variant: 'success',  label: t('facturacion.status_paid')    },
    pending: { variant: 'warning',  label: t('facturacion.status_pending') },
    overdue: { variant: 'danger',   label: t('facturacion.status_overdue') },
  };

  const FLOW_STEPS = [
    { n: '1', title: t('facturacion.flow_1_title'), sub: t('facturacion.flow_1_sub') },
    { n: '2', title: t('facturacion.flow_2_title'), sub: t('facturacion.flow_2_sub') },
    { n: '3', title: t('facturacion.flow_3_title'), sub: t('facturacion.flow_3_sub') },
  ];

  const { invoices, loading, markAsPaid, refetch } = useAdminInvoices();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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

  async function handleUploadPdf(inv: AdminInvoice) {
    const picked = await pickFile({ type: 'application/pdf' });
    if (!picked) return;

    setUploadingId(inv.id);
    try {
      const file = picked;
      const path = `${inv.agent_id}/${inv.id}.pdf`;

      // Leer el archivo como ArrayBuffer
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(path, arrayBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública firmada (válida 10 años)
      const { data: urlData } = await supabase.storage
        .from('invoices')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);

      if (!urlData?.signedUrl) throw new Error(t('facturacion.upload_url_error'));

      // Guardar la URL en la factura
      await supabase
        .from('invoices')
        .update({ pdf_url: urlData.signedUrl })
        .eq('id', inv.id);

      refetch?.();
    } catch (e: any) {
      Alert.alert(t('shared.error_title'), e.message ?? t('facturacion.upload_pdf_error'));
    } finally {
      setUploadingId(null);
    }
  }

  function handleMarkPaid(inv: AdminInvoice) {
    Alert.alert(
      t('facturacion.mark_paid_title'),
      t('facturacion.mark_paid_body', { invoice: inv.invoice_number ?? inv.id.slice(0, 8) }),
      [
        { text: t('facturacion.cancel'), style: 'cancel' },
        { text: t('facturacion.confirm'), onPress: () => markAsPaid(inv.id) },
      ]
    );
  }

  return (
    <AdminShell activeSection="facturacion" title={t('facturacion.title')}>
      {/* KPIs */}
      <View style={styles.kpiRow}>
        <KpiCard label={t('facturacion.kpi_paid_this_month')} value={formatEur(totalPaid)} tone="success" />
        <KpiCard label={t('facturacion.kpi_pending')} value={formatEur(totalPending)} tone="warning" />
        <KpiCard label={t('facturacion.kpi_overdue')} value={formatEur(totalOverdue)} tone="danger" />
      </View>

      {/* Flujo */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">{t('facturacion.flow_title')}</Text>
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
            placeholder={t('facturacion.search_placeholder')}
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
                {s === 'all' ? t('facturacion.filter_all') : STATUS_META[s]?.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text variant="caption" color="ink3">{t('facturacion.invoices_count', { count: filtered.length })}</Text>
      </View>

      {/* Tabla */}
      <View style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHead}>
              {[t('facturacion.col_agent'), t('facturacion.col_invoice'), t('facturacion.col_plan'), t('facturacion.col_period'), t('facturacion.col_amount'), t('facturacion.col_status'), t('facturacion.col_actions')].map((h, i) => (
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
              <Text variant="small" color="ink3" align="center" style={styles.emptyText}>{t('facturacion.loading')}</Text>
            )}
            {!loading && filtered.length === 0 && (
              <Text variant="small" color="ink3" align="center" style={styles.emptyText}>{t('facturacion.no_invoices')}</Text>
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
                    <Badge label={formatPlanLabel(inv.plan)} variant="neutral" />
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
                      label={uploadingId === inv.id ? '...' : (inv as any).pdf_url ? t('facturacion.pdf_uploaded') : t('facturacion.upload_pdf')}
                      variant="secondary"
                      size="sm"
                      onPress={() => handleUploadPdf(inv)}
                      disabled={uploadingId === inv.id}
                    />
                    {inv.status !== 'paid' && (
                      <Button
                        label={t('facturacion.mark_paid')}
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
