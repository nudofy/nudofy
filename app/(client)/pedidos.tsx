// C-05 · Historial de pedidos del cliente
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import StatusBadge from '@/components/StatusBadge';
import { useClientData, useClientOrders } from '@/hooks/useClient';
import type { Order } from '@/hooks/useAgent';

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Recibido',
  sent_to_supplier: 'Enviado',
  cancelled: 'Cancelado' };

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return `Hoy · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientPedidosScreen() {
  const router = useRouter();
  const { client } = useClientData();
  const { orders, loading } = useClientOrders(client?.id);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);

  const suppliers = useMemo(() => {
    const set = new Map<string, string>();
    orders.forEach(o => {
      const sup = (o as any).supplier;
      if (sup) set.set(sup.id, sup.name);
    });
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = !search ||
        (o.order_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
        ((o as any).supplier?.name ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchSupplier = !supplierFilter || (o as any).supplier?.id === supplierFilter;
      return matchSearch && matchStatus && matchSupplier;
    });
  }, [orders, search, statusFilter, supplierFilter]);

  const totalFiltered = filtered.reduce((s, o) => s + o.total, 0);
  const avgTicket = filtered.length > 0 ? totalFiltered / filtered.length : 0;

  const statusOptions = [
    { key: 'confirmed', label: 'Recibido' },
    { key: 'sent_to_supplier', label: 'Enviado' },
    { key: 'cancelled', label: 'Cancelado' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Text style={styles.title}>Mis pedidos</Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nº pedido o proveedor..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtros de estado */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        <FilterPill
          label="Todos"
          active={statusFilter === null}
          onPress={() => setStatusFilter(null)}
        />
        {statusOptions.map(s => (
          <FilterPill
            key={s.key}
            label={s.label}
            active={statusFilter === s.key}
            onPress={() => setStatusFilter(statusFilter === s.key ? null : s.key)}
          />
        ))}
        {suppliers.map(sup => (
          <FilterPill
            key={sup.id}
            label={sup.name}
            active={supplierFilter === sup.id}
            onPress={() => setSupplierFilter(supplierFilter === sup.id ? null : sup.id)}
            variant="supplier"
          />
        ))}
      </ScrollView>

      {/* KPIs */}
      {filtered.length > 0 && (
        <View style={styles.kpiRow}>
          <KpiCard value={filtered.length.toString()} label="Pedidos" />
          <KpiCard value={formatEur(totalFiltered)} label="Total" />
          <KpiCard value={formatEur(avgTicket)} label="Ticket medio" />
        </View>
      )}

      {/* Lista */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading && <Text style={styles.emptyText}>Cargando...</Text>}
        {!loading && filtered.length === 0 && (
          <Text style={styles.emptyText}>Sin pedidos en esta sección</Text>
        )}
        {filtered.map(order => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => router.push(`/(client)/pedido/${order.id}` as any)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHead}>
              <View style={styles.supplierLogo}>
                <Text style={styles.supplierLogoText}>
                  {((order as any).supplier?.name ?? '?').charAt(0)}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardNum}>{order.order_number ?? '—'}</Text>
                <Text style={styles.cardSupplier}>{(order as any).supplier?.name ?? '—'}</Text>
                <Text style={styles.cardCatalog}>{(order as any).catalog?.name ?? '—'}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardAmount}>{formatEur(order.total)}</Text>
                <Text style={styles.cardDate}>{formatDate(order.created_at)}</Text>
              </View>
            </View>
            <View style={styles.cardFoot}>
              <StatusBadge status={order.status} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ClientBottomTabBar activeTab="pedidos" />
    </SafeAreaView>
  );
}

function FilterPill({
  label, active, onPress, variant = 'status' }: {
  label: string; active: boolean; onPress: () => void; variant?: 'status' | 'supplier';
}) {
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        active && styles.pillActive,
        variant === 'supplier' && styles.pillSupplier,
        variant === 'supplier' && active && styles.pillSupplierActive,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function KpiCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.dark,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 18, fontWeight: '500', color: '#ffffff' },
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 14, paddingVertical: 9,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#efefef' },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1, fontSize: 13, color: colors.text,
    backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border },
  filtersScroll: { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: '#efefef' },
  filtersContent: {
    paddingHorizontal: 12, paddingVertical: 9, gap: 7, flexDirection: 'row' },
  pill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillSupplier: { borderColor: colors.blue, backgroundColor: colors.white },
  pillSupplierActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  pillText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  pillTextActive: { color: colors.white },
  kpiRow: {
    flexDirection: 'row', padding: 10, gap: 8, paddingBottom: 4 },
  kpiCard: {
    flex: 1, backgroundColor: colors.white,
    borderRadius: 10, padding: 10, alignItems: 'center' },
  kpiValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  kpiLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  listContent: { padding: 10, gap: 7 },
  orderCard: {
    backgroundColor: colors.white, borderRadius: 13, overflow: 'hidden' },
  cardHead: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  supplierLogo: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: colors.brandLight,
    alignItems: 'center', justifyContent: 'center' },
  supplierLogoText: { fontSize: 16, fontWeight: '600', color: colors.brand },
  cardBody: { flex: 1 },
  cardNum: { fontSize: 10, color: colors.textMuted },
  cardSupplier: { fontSize: 13, fontWeight: '500', color: colors.text, marginTop: 1 },
  cardCatalog: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  cardFoot: {
    paddingHorizontal: 13, paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: '#f5f5f5' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 } });
