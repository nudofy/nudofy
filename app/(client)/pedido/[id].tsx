// C-06 · Detalle de pedido del cliente (solo lectura)
import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, Pressable,
  StyleSheet, Linking, Share, ActivityIndicator,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import { useClientData } from '@/hooks/useClient';
import { useToast } from '@/contexts/ToastContext';
import type { IconName } from '@/components/ui/Icon';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface OrderDetail {
  id: string;
  order_number?: string;
  status: string;
  total: number;
  notes?: string;
  created_at: string;
  sent_at?: string;
  supplier?: { name: string; conditions?: string };
  catalog?: { name: string };
}

interface OrderItemDetail {
  id: string;
  quantity: number;
  unit_price: number;
  total: number;
  product?: { name: string; reference?: string };
}

export default function ClientPedidoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agent } = useClientData();
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingZip, setGeneratingZip] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase
        .from('orders')
        .select(`
          id, order_number, status, total, notes, created_at, sent_at,
          supplier:suppliers(name, conditions),
          catalog:catalogs(name)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('order_items')
        .select('id, quantity, unit_price, total, product:products(name, reference)')
        .eq('order_id', id),
    ]).then(([orderRes, itemsRes]) => {
      setOrder(orderRes.data as any);
      setItems((itemsRes.data as any[]) ?? []);
      setLoading(false);
    });
  }, [id]);

  async function generatePdf() {
    if (!order) return;
    setGeneratingPdf(true);
    try {
      const fmt = (n: number) =>
        n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
      const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

      const itemsHtml = items.map(item => {
        const ref = item.product?.reference
          ? `<span style="color:#9ca3af;font-size:11px;"> · ${item.product.reference}</span>` : '';
        return `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
              <span style="font-weight:500;">${item.product?.name ?? '—'}</span>${ref}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;vertical-align:middle;">${item.quantity}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:middle;">${fmt(item.unit_price)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:middle;font-weight:500;">${fmt(item.total)}</td>
          </tr>`;
      }).join('');

      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,Helvetica,Arial,sans-serif; color:#111827; background:#fff; padding:32px; font-size:13px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:18px; border-bottom:2px solid #111827; }
    .logo { font-size:22px; font-weight:700; letter-spacing:-0.5px; }
    .logo span { color:#ef4444; }
    .order-num { font-size:13px; color:#6b7280; text-align:right; }
    .order-num strong { display:block; font-size:18px; color:#111827; margin-bottom:2px; }
    .meta { background:#f9fafb; border-radius:8px; padding:14px 16px; margin-bottom:24px; }
    .meta h3 { font-size:10px; text-transform:uppercase; letter-spacing:0.6px; color:#9ca3af; margin-bottom:8px; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    thead th { background:#f3f4f6; padding:10px 12px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#6b7280; }
    thead th:nth-child(2) { text-align:center; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align:right; }
    .totals { display:flex; justify-content:flex-end; margin-bottom:24px; }
    .totals-box { background:#f9fafb; border-radius:8px; padding:16px 20px; min-width:220px; }
    .totals-row { display:flex; justify-content:space-between; gap:32px; padding:4px 0; font-size:13px; }
    .totals-row.total { border-top:1px solid #e5e7eb; margin-top:8px; padding-top:10px; font-weight:700; font-size:15px; color:#ef4444; }
    .notes { background:#fff7ed; border-left:3px solid #f97316; border-radius:4px; padding:12px 16px; margin-bottom:24px; font-size:12px; }
    .footer { text-align:center; font-size:11px; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">nudo<span>fy</span></div>
    <div class="order-num">
      <strong>${order.order_number ?? '—'}</strong>
      ${new Date(order.created_at).toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })}
    </div>
  </div>
  <div class="meta">
    <h3>Proveedor</h3>
    <p style="font-weight:600;">${(order as any).supplier?.name ?? '—'}</p>
    <p style="color:#6b7280;font-size:12px;margin-top:4px;">Catálogo: ${(order as any).catalog?.name ?? '—'}</p>
    ${(order as any).supplier?.conditions ? `<p style="color:#6b7280;font-size:12px;">Condiciones: ${(order as any).supplier.conditions}</p>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th style="width:60px;">Uds.</th>
        <th style="width:90px;">P. unit.</th>
        <th style="width:90px;">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal (${totalUnits} uds.)</span><span>${fmt(subtotal)}</span></div>
      <div class="totals-row total"><span>Total pedido</span><span>${fmt(order.total)}</span></div>
    </div>
  </div>
  ${order.notes ? `<div class="notes"><strong>Observaciones:</strong> ${order.notes}</div>` : ''}
  <div class="footer">Generado con Nudofy · ${new Date().toLocaleDateString('es-ES')}</div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Pedido ${order.order_number ?? ''}` });
      } else {
        toast.error('No se puede compartir en este dispositivo');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Error generando el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function downloadImages() {
    if (!order) return;
    setGeneratingZip(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-order-images-zip`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ orderId: order.id }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Error generando el ZIP');
        return;
      }
      await Linking.openURL(data.url);
      toast.success(`ZIP con ${data.count} imágenes listo`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error inesperado');
    } finally {
      setGeneratingZip(false);
    }
  }

  if (loading || !order) {
    return (
      <Screen>
        <TopBar title="Pedido" onBack={() => router.back()} />
        <Text variant="small" color="ink3" align="center" style={{ marginTop: space[8] }}>
          Cargando...
        </Text>
      </Screen>
    );
  }

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Screen>
      <TopBar title="Pedido" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cabecera del estado */}
        <View style={styles.statusCard}>
          <View style={{ flex: 1, gap: 4 }}>
            <Badge label={order.order_number ?? '—'} variant="neutral" />
            <Text variant="caption" color="ink3">{formatDateTime(order.created_at)}</Text>
          </View>
          <StatusBadge status={order.status as any} />
        </View>

        {/* Proveedor */}
        <DataBlock title="Proveedor">
          <DataRow label="Proveedor" value={(order as any).supplier?.name ?? '—'} />
          <DataRow label="Catálogo" value={(order as any).catalog?.name ?? '—'} />
          {(order as any).supplier?.conditions && (
            <DataRow label="Condiciones" value={(order as any).supplier.conditions} last />
          )}
        </DataBlock>

        {/* Líneas */}
        <DataBlock title="Artículos">
          {items.map((item, i) => (
            <DataRow
              key={item.id}
              label={(item as any).product?.name ?? '—'}
              value={`x${item.quantity} · ${formatEur(item.total)}`}
              last={i === items.length - 1}
            />
          ))}
        </DataBlock>

        {/* Totales */}
        <DataBlock title="Total">
          <DataRow label={`Subtotal (${totalUnits} uds.)`} value={formatEur(order.total)} />
          <DataRow label="Total pedido" value={formatEur(order.total)} bold last />
        </DataBlock>

        {order.notes && (
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Observaciones</Text>
            <View style={styles.notesCard}>
              <Text variant="body">{order.notes}</Text>
            </View>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actionsGrid}>
          <ActionBtn
            icon="Share2"
            label="Compartir"
            onPress={() => Share.share({
              message: `Pedido ${order.order_number} · ${formatEur(order.total)}\nNudofy`,
            })}
          />
          {agent?.phone && (
            <ActionBtn
              icon="MessageCircle"
              label="WhatsApp agente"
              onPress={() => Linking.openURL(`https://wa.me/${agent.phone?.replace(/\D/g, '')}`)}
            />
          )}
          {agent?.email && (
            <ActionBtn
              icon="Mail"
              label="Email agente"
              onPress={() => Linking.openURL(`mailto:${agent.email}?subject=Pedido ${order.order_number}`)}
            />
          )}
          <ActionBtn
            icon="Download"
            label={generatingPdf ? 'Generando…' : 'Descargar PDF'}
            onPress={generatePdf}
            loading={generatingPdf}
          />
          <ActionBtn
            icon="Image"
            label={generatingZip ? 'Generando…' : 'Imágenes ZIP'}
            onPress={downloadImages}
            loading={generatingZip}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function DataBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" color="ink3" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function DataRow({ label, value, bold, last }: {
  label: string; value: string; bold?: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.dataRow, !last && styles.dataRowBorder]}>
      <Text variant="small" color="ink3" style={{ flex: 1 }}>{label}</Text>
      <Text
        variant={bold ? 'bodyMedium' : 'smallMedium'}
        style={{ textAlign: 'right', flex: 1 }}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, loading }: { icon: IconName; label: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator size="small" color={colors.ink} />
        : <Icon name={icon} size={20} color={colors.ink} />}
      <Text variant="caption" align="center" style={{ fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[3] },

  statusCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

  section: { gap: space[2] },
  sectionTitle: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginLeft: space[1],
  },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },

  dataRow: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: space[3],
  },
  dataRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },

  notesCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: space[2],
  },
  actBtn: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
});
