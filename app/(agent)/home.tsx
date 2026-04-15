// A-01 · Inicio del agente
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { useDashboardKPIs, useAgent } from '@/hooks/useAgent';
import type { Order } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = diff / 3600000;
  if (hours < 1) return 'Hace un momento';
  if (hours < 24) return `Hace ${Math.floor(hours)}h`;
  if (hours < 48) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function HomeScreen() {
  const router = useRouter();
  const { agent } = useAgent();
  const { kpis, recentOrders, loading } = useDashboardKPIs();
  const [refreshing, setRefreshing] = React.useState(false);

  const firstName = agent?.name?.split(' ')[0] ?? '...';

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches';
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  async function onRefresh() {
    setRefreshing(true);
    // TODO: refetch
    setRefreshing(false);
  }

  const quickActions = [
    { icon: '＋', label: 'Nuevo pedido', sub: 'Selecciona cliente', bg: '#EEEDFE', iconColor: colors.purple, route: '/(agent)/pedido/nuevo' },
    { icon: '▦', label: 'Proveedores', sub: 'Ver', bg: '#E1F5EE', iconColor: '#1D9E75', route: '/(agent)/catalogos' },
    { icon: '≡', label: 'Mis pedidos', sub: 'Realizados · Pendientes', bg: '#FAEEDA', iconColor: colors.amber, route: '/(agent)/pedidos' },
    { icon: '＋', label: 'Añadir cliente', sub: 'Dar de alta', bg: '#E6F1FB', iconColor: '#185FA5', route: '/(agent)/cliente/nuevo' },
    { icon: '▲', label: 'Estadísticas', sub: 'Ventas y rendimiento', bg: '#FBEAF0', iconColor: '#993556', route: '/(agent)/mas' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <View>
          <Text style={styles.greeting}>{greeting}, {firstName}</Text>
          <Text style={styles.date}>{dateCapitalized}</Text>
        </View>
        <View style={styles.topbarActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(agent)/pedidos')}>
            <Text style={styles.iconEmoji}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />}
      >
        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpi}>
            <Text style={styles.kpiValue}>{kpis.ordersThisMonth}</Text>
            <Text style={styles.kpiLabel}>Pedidos mes{kpis.totalThisMonth > 0 ? ` · ${formatEur(kpis.totalThisMonth)}` : ''}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiValue}>{formatEur(kpis.totalToday)}</Text>
            <Text style={styles.kpiLabel}>Importe hoy</Text>
          </View>
          <TouchableOpacity style={[styles.kpi, styles.kpiAccent]} onPress={() => router.push('/(agent)/pedido/nuevo')}>
            <Text style={[styles.kpiValue, { color: '#fff', fontSize: 24 }]}>+</Text>
            <Text style={[styles.kpiLabel, { color: '#AFA9EC' }]}>Nuevo pedido</Text>
          </TouchableOpacity>
        </View>

        {/* Acceso rápido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceso rápido</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((a, i) => (
              <TouchableOpacity key={i} style={styles.quickCard} onPress={() => router.push(a.route as any)} activeOpacity={0.85}>
                <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                  <Text style={{ color: a.iconColor, fontSize: 14, fontWeight: '600' }}>{a.icon}</Text>
                </View>
                <Text style={styles.quickTitle}>{a.label}</Text>
                <Text style={styles.quickSub}>{a.sub} →</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Últimos pedidos */}
        <View style={[styles.section, { paddingBottom: 16 }]}>
          <Text style={styles.sectionTitle}>Últimos pedidos</Text>
          <View style={styles.ordersList}>
            {recentOrders.length === 0 && !loading && (
              <Text style={styles.emptyText}>Aún no hay pedidos</Text>
            )}
            {recentOrders.map((order: Order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderRow}
                onPress={() => router.push(`/(agent)/pedido/${order.id}` as any)}
                activeOpacity={0.85}
              >
                <Avatar name={order.client?.name ?? 'Sin cliente'} size={34} fontSize={11} />
                <View style={styles.orderInfo}>
                  <Text style={styles.orderClient}>{order.client?.name ?? 'Sin cliente'}</Text>
                  <Text style={styles.orderMeta}>
                    {order.supplier?.name} · {formatRelativeDate(order.created_at)}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{formatEur(order.total)}</Text>
                  <StatusBadge status={order.status} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <BottomTabBar activeTab="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 18, fontWeight: '500', color: colors.text },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  topbarActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 16 },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  kpi: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  kpiAccent: { backgroundColor: colors.purple },
  kpiValue: { fontSize: 20, fontWeight: '500', color: colors.text },
  kpiLabel: { fontSize: 10, color: colors.textMuted, marginTop: 3, textAlign: 'center', lineHeight: 13 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '500', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  quickIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  quickTitle: { fontSize: 13, fontWeight: '500', color: colors.text },
  quickSub: { fontSize: 11, color: colors.textMuted, marginTop: 'auto' },
  ordersList: { gap: 8 },
  orderRow: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderInfo: { flex: 1, minWidth: 0 },
  orderClient: { fontSize: 13, fontWeight: '500', color: colors.text },
  orderMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderAmount: { fontSize: 13, fontWeight: '500', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
});
