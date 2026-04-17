// A-08 · Resumen de pedido (solo lectura tras confirmar)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function PedidoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<(OrderItem & { product: { name: string; reference?: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('orders')
      .select(`
        id, order_number, status, total, discount_code, notes, pdf_url, created_at, sent_at,
        client:clients(id, name, address),
        supplier:suppliers(id, name, conditions),
        catalog:catalogs(id, name)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setOrder(data as any);
        setLoading(false);
      });

    supabase
      .from('order_items')
      .select('id, order_id, product_id, quantity, unit_price, total, product:products(name, reference)')
      .eq('order_id', id)
      .then(({ data }) => setItems((data as any[]) ?? []));
  }, [id]);

  async function sendToSupplier() {
    if (!order) return;
    const { error } = await supabase
      .from('orders')
      .update({ status: 'sent_to_supplier', sent_at: new Date().toISOString() })
      .eq('id', order.id);
    if (error) { Alert.alert('Error', error.message); return; }
    setOrder(o => o ? { ...o, status: 'sent_to_supplier' } : o);
  }

  async function shareOrder() {
    await Share.share({
      message: `Pedido ${order?.order_number} · ${formatEur(order?.total ?? 0)}\nNudofy` });
  }

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  const isConfirmed = order.status === 'confirmed' || order.status === 'sent_to_supplier';

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Pedidos</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Resumen de pedido</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Badge de estado */}
        {isConfirmed && (
          <View style={[styles.statusBadge, { backgroundColor: colors.greenLight }]}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusIconText}>✓</Text>
            </View>
            <View>
              <Text style={styles.statusTitle}>Pedido confirmado</Text>
              <Text style={styles.statusDate}>{formatDateTime(order.created_at)}</Text>
              <View style={styles.orderNumBadge}>
                <Text style={styles.orderNum}>{order.order_number ?? '—'}</Text>
              </View>
            </View>
          </View>
        )}
        {order.status === 'draft' && (
          <View style={[styles.statusBadge, { backgroundColor: colors.amberLight }]}>
            <Text style={styles.statusTitle}>Borrador — Sin confirmar</Text>
          </View>
        )}

        {/* Cliente y entrega */}
        <DataBlock title="Cliente y entrega" iconBg="#EEEDFE">
          <DataRow label="Cliente" value={(order as any).client?.name ?? 'Sin cliente'} />
          <DataRow label="Envío a" value={(order as any).client?.address ?? '—'} />
        </DataBlock>

        {/* Proveedor */}
        <DataBlock title="Proveedor" iconBg="#E6F1FB">
          <DataRow label="Proveedor" value={(order as any).supplier?.name ?? '—'} />
          <DataRow label="Catálogo" value={(order as any).catalog?.name ?? '—'} />
          <DataRow label="Condiciones" value={(order as any).supplier?.conditions ?? '—'} />
        </DataBlock>

        {/* Líneas */}
        <DataBlock title="Líneas del pedido" iconBg="#EAF3DE">
          {items.map(item => (
            <DataRow
              key={item.id}
              label={(item as any).product?.name ?? '—'}
              value={`x${item.quantity} · ${formatEur(item.total)}`}
            />
          ))}
        </DataBlock>

        {/* Totales */}
        <DataBlock title="Totales" iconBg="#FAEEDA">
          <DataRow label={`Subtotal (${items.reduce((s, i) => s + i.quantity, 0)} uds.)`} value={formatEur(order.total)} />
          {order.discount_code && <DataRow label="Descuento" value={order.discount_code} />}
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
          <TouchableOpacity style={styles.actBtn}>
            <Text style={styles.actIcon}>↓</Text>
            <Text style={styles.actLabel}>Ver / descargar PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actBtn} onPress={shareOrder}>
            <Text style={styles.actIcon}>✉</Text>
            <Text style={styles.actLabel}>Enviar por email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actBtn} onPress={shareOrder}>
            <Text style={styles.actIcon}>💬</Text>
            <Text style={styles.actLabel}>Enviar por WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actBtn} onPress={shareOrder}>
            <Text style={styles.actIcon}>↗</Text>
            <Text style={styles.actLabel}>Compartir</Text>
          </TouchableOpacity>
        </View>

        {/* Enviar al proveedor */}
        {order.status === 'confirmed' && (
          <TouchableOpacity style={styles.sendBtn} onPress={sendToSupplier}>
            <Text style={styles.sendBtnText}>Marcar como enviado al proveedor</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DataBlock({ title, iconBg, children }: { title: string; iconBg: string; children: React.ReactNode }) {
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
  loading: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  topbar: {
    backgroundColor: colors.dark,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)' },
  back: { fontSize: 13, color: '#ffffff', marginRight: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: '500', color: '#ffffff' },
  content: { padding: 12, gap: 8 },
  statusBadge: {
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center' },
  statusIconText: { color: colors.white, fontSize: 18 },
  statusTitle: { fontSize: 13, fontWeight: '500', color: '#27500A' },
  statusDate: { fontSize: 11, color: colors.green, marginTop: 2 },
  orderNumBadge: {
    backgroundColor: colors.white, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  orderNum: { fontSize: 11, fontWeight: '500', color: colors.green },
  block: { backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
  blockHeader: {
    padding: 9, paddingHorizontal: 13,
    borderBottomWidth: 0.5, borderBottomColor: colors.borderLight,
    flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockIcon: { width: 22, height: 22, borderRadius: 6 },
  blockTitle: { fontSize: 11, fontWeight: '500', color: '#555' },
  dataRow: {
    paddingHorizontal: 13, paddingVertical: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8', gap: 10 },
  dataLabel: { fontSize: 11, color: colors.textMuted, flex: 1 },
  dataValue: { fontSize: 11, fontWeight: '500', color: colors.text, textAlign: 'right', flex: 1 },
  dataValueBold: { color: colors.brand, fontSize: 13 },
  notesCard: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 12, gap: 4 },
  notesLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 12, color: colors.text, lineHeight: 18 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  actBtn: {
    width: '47.5%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 6 },
  actIcon: { fontSize: 20 },
  actLabel: { fontSize: 11, fontWeight: '500', color: colors.text, textAlign: 'center' },
  sendBtn: {
    backgroundColor: colors.dark,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sendBtnText: { color: colors.white, fontSize: 14, fontWeight: '500' } });
