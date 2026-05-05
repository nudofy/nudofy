// Mis facturas — historial de suscripción del agente
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

function buildInvoiceHtml(inv: AgentInvoice, agentName: string, agentEmail: string): string {
  const invNumber = inv.invoice_number ?? inv.id.slice(0, 8).toUpperCase();
  const planLabel = PLAN_LABELS[inv.plan] ?? inv.plan;
  const dateStr   = formatDate(inv.created_at);
  const base      = inv.amount ?? (inv.total / 1.21);
  const iva       = inv.iva   ?? (inv.total - base);

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
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Nudofy<span>.</span></div>
    <div class="inv-meta">
      <h2>Factura</h2>
      <p><strong>${invNumber}</strong></p>
      <p>${dateStr}</p>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <div class="party-label">Emisor</div>
      <div class="party-name">Nudofy S.L.</div>
      <div class="party-detail">nudofyapp@gmail.com</div>
    </div>
    <div class="party">
      <div class="party-label">Cliente</div>
      <div class="party-name">${agentName}</div>
      <div class="party-detail">${agentEmail}</div>
    </div>
  </div>
  <hr class="divider"/>
  <table>
    <thead><tr><th>Descripción</th><th>Plan</th><th>Período</th><th class="text-right">Importe</th></tr></thead>
    <tbody>
      <tr>
        <td>Suscripción Nudofy — ${planLabel}</td>
        <td>${planLabel}</td>
        <td>${inv.period}</td>
        <td class="text-right">${base.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Base imponible</span><span>${base.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
    <div class="total-row"><span>IVA (21%)</span><span>${iva.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
    <div class="total-row final"><span>Total</span><span>${inv.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
  </div>
  <div class="footer">Nudofy S.L. · nudofyapp@gmail.com · nudofy.app<br/>Factura generada electrónicamente.</div>
</body>
</html>`;
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
      .select('id, invoice_number, plan, amount, iva, total, status, period, created_at')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data ?? []) as AgentInvoice[]);
        setLoading(false);
      });
  }, [agent]);

  async function handleDownload(inv: AgentInvoice) {
    if (!agent) return;
    setGeneratingId(inv.id);
    try {
      const html = buildInvoiceHtml(inv, agent.name, agent.email);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Factura ${inv.invoice_number ?? inv.id.slice(0, 8)}`,
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
                    <Button
                      label={generatingId === inv.id ? '...' : 'PDF'}
                      variant="secondary"
                      size="sm"
                      onPress={() => handleDownload(inv)}
                      disabled={generatingId === inv.id}
                    />
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
