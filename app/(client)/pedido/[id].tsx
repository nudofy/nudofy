// C-06 · Detalle de pedido del cliente (solo lectura)
import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, Pressable,
  StyleSheet, Linking, Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import { useClientData } from '@/hooks/useClient';
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
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [loading, setLoading] = useState(true);

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
          <ActionBtn icon="Download" label="Descargar PDF" onPress={() => {}} />
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

function ActionBtn({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Icon name={icon} size={20} color={colors.ink} />
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
