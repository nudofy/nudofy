// C-06 · Detalle de pedido del cliente (solo lectura)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import { useClientData } from '@/hooks/useClient';

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
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.back}>← Pedidos</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pedido</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cabecera del estado */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <View style={styles.orderNumBadge}>
              <Text style={styles.orderNum}>{order.order_number ?? '—'}</Text>
            </View>
            <Text style={styles.statusDate}>{formatDateTime(order.created_at)}</Text>
          </View>
          <StatusBadge status={order.status as any} />
        </View>

        {/* Proveedor */}
        <DataBlock title="Proveedor" iconBg={colors.purpleLight}>
          <DataRow label="Proveedor" value={(order as any).supplier?.name ?? '—'} />
          <DataRow label="Catálogo" value={(order as any).catalog?.name ?? '—'} />
          {(order as any).supplier?.conditions && (
            <DataRow label="Condiciones" value={(order as any).supplier.conditions} />
          )}
        </DataBlock>

        {/* Líneas */}
        <DataBlock title="Artículos" iconBg={colors.greenLight}>
          {items.map(item => (
            <DataRow
              key={item.id}
              label={(item as any).product?.name ?? '—'}
              value={`x${item.quantity} · ${formatEur(item.total)}`}
            />
          ))}
        </DataBlock>

        {/* Totales */}
        <DataBlock title="Total" iconBg={colors.amberLight}>
          <DataRow label={`Subtotal (${totalUnits} uds.)`} value={formatEur(order.total)} />
          <DataRow label="Total pedido" value={formatEur(order.total)} bold />
        </DataBlock>

        {order.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Observaciones</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actBtn}
            onPress={() => Share.share({ message: `Pedido ${order.order_number} · ${formatEur(order.total)}\nNudofy` })}
          >
            <Text style={styles.actIcon}>↗</Text>
            <Text style={styles.actLabel}>Compartir</Text>
          </TouchableOpacity>
          {agent?.phone && (
            <TouchableOpacity
              style={styles.actBtn}
              onPress={() => Linking.openURL(`https://wa.me/${agent.phone?.replace(/\D/g, '')}`)}
            >
              <Text style={styles.actIcon}>💬</Text>
              <Text style={styles.actLabel}>WhatsApp agente</Text>
            </TouchableOpacity>
          )}
          {agent?.email && (
            <TouchableOpacity
              style={styles.actBtn}
              onPress={() => Linking.openURL(`mailto:${agent.email}?subject=Pedido ${order.order_number}`)}
            >
              <Text style={styles.actIcon}>✉</Text>
              <Text style={styles.actLabel}>Email agente</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actBtn}>
            <Text style={styles.actIcon}>↓</Text>
            <Text style={styles.actLabel}>Descargar PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DataBlock({
  title, iconBg, children }: { title: string; iconBg: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <View style={[styles.blockIcon, { backgroundColor: iconBg }]} />
        <Text style={styles.blockTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DataRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, bold && styles.dataValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#efefef',
    gap: 10 },
  backBtn: {},
  back: { fontSize: 13, color: colors.purple, marginRight: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  content: { padding: 12, gap: 8 },
  statusCard: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { gap: 4 },
  orderNumBadge: {
    backgroundColor: colors.purpleLight,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  orderNum: { fontSize: 13, fontWeight: '600', color: colors.purple },
  statusDate: { fontSize: 11, color: colors.textMuted },
  block: { backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
  blockHeader: {
    padding: 9, paddingHorizontal: 13,
    borderBottomWidth: 0.5, borderBottomColor: colors.borderLight,
    flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockIcon: { width: 22, height: 22, borderRadius: 6 },
  blockTitle: { fontSize: 11, fontWeight: '500', color: '#555' },
  dataRow: {
    paddingHorizontal: 13, paddingVertical: 9,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8', gap: 10 },
  dataLabel: { fontSize: 12, color: colors.textMuted, flex: 1 },
  dataValue: { fontSize: 12, fontWeight: '500', color: colors.text, textAlign: 'right', flex: 1 },
  dataValueBold: { color: colors.purple, fontSize: 14 },
  notesCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 4 },
  notesLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 12, color: colors.text, lineHeight: 18 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  actBtn: {
    width: '47.5%',
    backgroundColor: colors.white, borderRadius: 10,
    padding: 12, alignItems: 'center', gap: 6 },
  actIcon: { fontSize: 20 },
  actLabel: { fontSize: 11, fontWeight: '500', color: colors.text, textAlign: 'center' } });
