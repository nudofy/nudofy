// Mis facturas — historial de suscripción del agente
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { shareFile } from '@/lib/sharing';
import { supabase } from '@/lib/supabase';
import { useAgentContext } from '@/contexts/AgentContext';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Button, Badge } from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import { formatEur } from '@/lib/format';

interface AgentInvoice {
  id: string;
  invoice_number?: string;
  plan: string;
  amount: number;
  iva: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  period: string;
  created_at: string;
  pdf_url?: string | null;
}

/** Formatea el slug/id de plan con el nombre almacenado en Supabase si está disponible.
 *  Como fallback, humaniza el slug (basic → Basic) para no mostrar IDs crudos. */
function formatPlanLabel(plan: string, planNames: Record<string, string>): string {
  if (planNames[plan]) return planNames[plan];
  // fallback: capitaliza y reemplaza guiones/guiones bajos por espacios
  return plan.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function MisFacturasScreen() {
  const { t, i18n } = useTranslation('agent');
  const { agent } = useAgentContext();
  const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
    paid:    { label: t('invoices.status_paid'),    variant: 'success' },
    pending: { label: t('invoices.status_pending'), variant: 'warning' },
    overdue: { label: t('invoices.status_overdue'), variant: 'danger'  },
  };

  function formatDate(iso: string) {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  }
  const [invoices, setInvoices] = useState<AgentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [planNames, setPlanNames] = useState<Record<string, string>>({});

  useEffect(() => {
    // Carga los nombres reales de planes desde Supabase
    supabase.from('plans').select('id, name').then(({ data }) => {
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.name;
      setPlanNames(map);
    });
  }, []);

  useEffect(() => {
    if (!agent) return;
    supabase
      .from('invoices')
      .select('id, invoice_number, plan, amount, iva, total, status, period, created_at, pdf_url')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data ?? []) as AgentInvoice[]);
        setLoading(false);
      });
  }, [agent]);

  async function handleDownload(inv: AgentInvoice) {
    if (!inv.pdf_url) return;
    setGeneratingId(inv.id);
    const filename = `factura-${inv.invoice_number ?? inv.id.slice(0, 8)}.pdf`;
    await shareFile({ url: inv.pdf_url, filename, dialogTitle: filename });
    setGeneratingId(null);
  }

  return (
    <Screen>
      <TopBar title={t('invoices.title')} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <Text variant="small" color="ink3" align="center" style={styles.empty}>{t('invoices.loading')}</Text>
        )}
        {!loading && invoices.length === 0 && (
          <Text variant="small" color="ink3" align="center" style={styles.empty}>
            {t('invoices.no_invoices')}
          </Text>
        )}

        {!loading && invoices.length > 0 && (
          <View style={styles.list}>
            {invoices.map((inv, i) => {
              const status = STATUS_META[inv.status] ?? STATUS_META.pending;
              const planLabel = formatPlanLabel(inv.plan, planNames);
              return (
                <View
                  key={inv.id}
                  style={[styles.row, i < invoices.length - 1 && styles.rowBorder]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="smallMedium">
                      {inv.invoice_number ?? inv.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text variant="caption" color="ink3">{planLabel} · {inv.period}</Text>
                    <Text variant="caption" color="ink4">{formatDate(inv.created_at)}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text variant="bodyMedium">{formatEur(inv.total, i18n.language)}</Text>
                    <Badge label={status.label} variant={status.variant} />
                    {inv.pdf_url ? (
                      <Button
                        label={generatingId === inv.id ? '...' : t('invoices.download')}
                        variant="secondary"
                        size="sm"
                        onPress={() => handleDownload(inv)}
                        disabled={generatingId === inv.id}
                      />
                    ) : (
                      <Text variant="caption" color="ink4">{t('invoices.no_pdf')}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomTabBar activeTab="mas" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3] },
  empty: { paddingVertical: space[8] },
  list: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[3], paddingVertical: space[3],
    gap: space[3],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  rowRight: { alignItems: 'flex-end', gap: space[1] },
});
