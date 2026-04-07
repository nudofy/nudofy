// A-09 · Historial de pedidos (3 pestañas)
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { useOrders } from '@/hooks/useAgent';
import type { Order } from '@/hooks/useAgent';

type TabKey = 'realizados' | 'pendientes' | 'cancelados';

const TAB_STATUS: Record<TabKey, Order['status'][]> = {
  realizados: ['sent_to_supplier', 'confirmed'],
  pendientes: ['confirmed'],
  cancelados: ['cancelled'],
};

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Hoy · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function PedidosScreen() {
  const router = useRouter();
  const { orders, loading } = useOrders();
  const [tab, setTab] = useState<TabKey>('realizados');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const statuses = TAB_STATUS[tab];
    return orders.filter(o => {
      const matchTab = statuses.includes(o.status);
      const matchSearch = !search ||
        (o.order_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (o.client?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (o.supplier?.name ?? '').toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [orders, tab, search]);

  const pendingCount = orders.filter(o => o.status === 'confirmed').length;
  const doneCount = orders.filter(o => o.status === 'sent_to_supplier').length;

  // KPIs del periodo
  const totalFiltered = filtered.reduce((s, o) => s + o.total, 0);
  const ticketMedio = filtered.length > 0 ? totalFiltered / filtered.length : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.push('/(agent)/home')}>
          <Text style={styles.back}>← Inicio</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis pedidos</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(agent)/pedido/nuevo')}>
          <Text style={styles.newBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente, proveedor o nº pedido..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Pestañas */}
      <View style={styles.tabBar}>
        <TabBtn label="Realizados" count={doneCount} countColor="green" active={tab === 'realizados'} onPress={() => setTab('realizados')} />
        <TabBtn label="Pendientes" count={pendingCount} countColor="amber" active={tab === 'pendientes'} onPress={() => setTab('pendientes')} />
        <TabBtn label="Cancelados" active={tab === 'cancelados'} onPress={() => setTab('cancelados')} />
      </View>

      {/* KPIs */}
      {filtered.length > 0 && (
        <View style={styles.kpiRow}>
          <View style={styles.kpi}><Text style={styles.kpiV}>{filtered.length}</Text><Text style={styles.kpiL}>Pedidos</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiV}>{formatEur(totalFiltered)}</Text><Text style={styles.kpiL}>Facturado</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiV}>{formatEur(ticketMedio)}</Text><Text style={styles.kpiL}>Ticket medio</Text></View>
        </View>
      )}

      {/* Lista */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading && <Text style={styles.emptyText}>Cargando...</Text>}
        {!loading && filtered.length === 0 && (
          <Text style={styles.emptyText}>Sin pedidos en esta sección</Text>
        )}
        {filtered.map(order => (
          <OrderCard key={order.id} order={order} onPress={() => router.push(`/(agent)/pedido/${order.id}` as any)} />
        ))}
      </ScrollView>

      <BottomTabBar activeTab="pedidos" />
    </SafeAreaView>
  );
}

function TabBtn({ label, count, countColor, active, onPress }: {
  label: string; count?: number; countColor?: 'green' | 'amber';
  active: boolean; onPress: () => void;
}) {
  const badgeBg = countColor === 'green' ? '#EAF3DE' : '#FAEEDA';
  const badgeColor = countColor === 'green' ? '#3B6D11' : '#854F0B';
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <View style={styles.tabInner}>
        <Text style={[styles.tabText, active && styles.tabActive]}>{label}</Text>
        {!!count && (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{count}</Text>
          </View>
        )}
      </View>
      {active && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHead}>
        <Avatar name={order.client?.name ?? '?'} size={38} fontSize={12} />
        <View style={styles.cardBody}>
          <Text style={styles.cardNum}>{order.order_number ?? '—'}</Text>
          <Text style={styles.cardClient}>{order.client?.name ?? 'Sin cliente'}</Text>
          <Text style={styles.cardProv}>{order.supplier?.name} · {order.catalog?.name}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{formatEur(order.total)}</Text>
          <Text style={styles.cardDate}>{formatDate(order.created_at)}</Text>
        </View>
      </View>
      <View style={styles.cardFoot}>
        <StatusBadge status={order.status} />
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actBtn}>
            <Text style={styles.actBtnText}>Reenviar PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actBtn}>
            <Text style={styles.actBtnText}>Duplicar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  back: { fontSize: 13, color: colors.purple, marginRight: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '500', color: colors.text },
  newBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  newBtnText: { color: colors.white, fontSize: 20, lineHeight: 22 },
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBar: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  tabActive: { color: colors.purple },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: colors.purple },
  badge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  badgeText: { fontSize: 9, fontWeight: '500' },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingBottom: 4,
  },
  kpi: { flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 10, alignItems: 'center' },
  kpiV: { fontSize: 17, fontWeight: '500', color: colors.text },
  kpiL: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  listContent: { padding: 10, gap: 7 },
  card: { backgroundColor: colors.white, borderRadius: 13, overflow: 'hidden' },
  cardHead: { padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  cardBody: { flex: 1, minWidth: 0 },
  cardNum: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  cardClient: { fontSize: 13, fontWeight: '500', color: colors.text },
  cardProv: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 13, fontWeight: '500', color: colors.text },
  cardDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  cardFoot: {
    padding: 7,
    paddingHorizontal: 13,
    borderTopWidth: 0.5,
    borderTopColor: '#f5f5f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActions: { flexDirection: 'row', gap: 6 },
  actBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actBtnText: { fontSize: 10, fontWeight: '500', color: colors.purple },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 },
});
