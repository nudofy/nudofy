// Mis facturas — historial de suscripción del agente
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useAgentContext } from '@/contexts/AgentContext';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Button, Badge } from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';

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

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  paid:    { label: 'Pagada',    variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  overdue: { label: 'Vencida',   variant: 'danger'  },
};

const PLAN_LABELS: Record<string, string> = {
  basic:      'Básico',
  pro:        'Pro',
  agency:     'Agencia',
  agency_pro: 'Agencia Pro',
};

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}


export default function MisFacturasScreen() {
  const { agent } = useAgentContext();
  const [invoices, setInvoices] = useState<AgentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

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
    try {
      const filename = `factura-${inv.invoice_number ?? inv.id.slice(0, 8)}.pdf`;
      const localUri = FileSystem.cacheDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(inv.pdf_url, localUri);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: filename,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      // silently ignore share cancellation
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <Screen>
      <TopBar title="Mis facturas" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <Text variant="small" color="ink3" align="center" style={styles.empty}>Cargando...</Text>
        )}
        {!loading && invoices.length === 0 && (
          <Text variant="small" color="ink3" align="center" style={styles.empty}>
            No tienes facturas aún. Aparecerán aquí cuando actives un plan de pago.
          </Text>
        )}

        {!loading && invoices.length > 0 && (
          <View style={styles.list}>
            {invoices.map((inv, i) => {
              const status = STATUS_META[inv.status] ?? STATUS_META.pending;
              const planLabel = PLAN_LABELS[inv.plan] ?? inv.plan;
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
                    <Text variant="bodyMedium">{formatEur(inv.total)}</Text>
                    <Badge label={status.label} variant={status.variant} />
                    {inv.pdf_url ? (
                      <Button
                        label={generatingId === inv.id ? '...' : 'Descargar'}
                        variant="secondary"
                        size="sm"
                        onPress={() => handleDownload(inv)}
                        disabled={generatingId === inv.id}
                      />
                    ) : (
                      <Text variant="caption" color="ink4">Sin PDF</Text>
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
