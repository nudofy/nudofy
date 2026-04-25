// A-01 · Inicio del agente · redesign v2
import React from 'react';
import {
  RefreshControl, ScrollView, StyleSheet, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space } from '@/theme';
import {
  Badge, Button, Icon, PressableCard, Screen, Text, TopBar,
} from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { useDashboardKPIs, useAgent } from '@/hooks/useAgent';
import type { Order } from '@/hooks/useAgent';
import type { IconName } from '@/components/ui/Icon';

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

type QuickAction = {
  icon: IconName;
  label: string;
  sub: string;
  route: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const { agent } = useAgent();
  const { kpis, recentOrders, loading } = useDashboardKPIs();
  const [refreshing, setRefreshing] = React.useState(false);

  const firstName = agent?.name?.split(' ')[0] ?? '';

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Buenos días' :
    now.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches';
  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  async function onRefresh() {
    setRefreshing(true);
    setRefreshing(false);
  }

  const quickActions: QuickAction[] = [
    { icon: 'Users',        label: 'Clientes',      sub: 'Gestionar cartera',      route: '/(agent)/clientes' },
    { icon: 'Package',      label: 'Proveedores',   sub: 'Catálogos y productos',  route: '/(agent)/catalogos' },
    { icon: 'ClipboardList',label: 'Mis pedidos',   sub: 'Confirmados y borradores', route: '/(agent)/pedidos' },
    { icon: 'ChartBar',     label: 'Estadísticas',  sub: 'Ventas y rendimiento',   route: '/(agent)/estadisticas' },
  ];

  return (
    <Screen>
      <TopBar
        left={
          <View>
            <Text variant="heading">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </Text>
            <Text variant="small" color="ink3" style={{ marginTop: 2 }}>{dateCap}</Text>
          </View>
        }
        actions={[
          {
            icon: 'Bell',
            onPress: () => router.push('/(agent)/pedidos'),
            accessibilityLabel: 'Notificaciones',
          },
        ]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space[6] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink3}
          />
        }
      >
        {/* ── KPIs ── */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCell}>
            <Text variant="small" color="ink3">Pedidos este mes</Text>
            <Text variant="display" style={{ marginTop: space[1] }}>
              {kpis.ordersThisMonth}
            </Text>
            {kpis.totalThisMonth > 0 && (
              <Text variant="small" color="ink3" style={{ marginTop: 2 }}>
                {formatEur(kpis.totalThisMonth)}
              </Text>
            )}
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiCell}>
            <Text variant="small" color="ink3">Importe hoy</Text>
            <Text variant="display" style={{ marginTop: space[1] }}>
              {formatEur(kpis.totalToday)}
            </Text>
          </View>
        </View>

        {/* ── CTA primario destacado ── */}
        <View style={styles.ctaWrap}>
          <Button
            label="Nuevo pedido"
            icon="Plus"
            fullWidth
            onPress={() => router.push('/(agent)/pedido/nuevo')}
          />
        </View>

        {/* ── Acceso rápido ── */}
        <View style={styles.section}>
          <Text variant="caption" color="ink3">Acceso rápido</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((a) => (
              <PressableCard
                key={a.label}
                padding="md"
                onPress={() => router.push(a.route as any)}
                style={styles.quickCard}
              >
                <View style={styles.quickIconWrap}>
                  <Icon name={a.icon} size={20} color={colors.ink} />
                </View>
                <Text variant="bodyMedium">{a.label}</Text>
                <Text variant="small" color="ink3" numberOfLines={1}>{a.sub}</Text>
              </PressableCard>
            ))}
          </View>
        </View>

        {/* ── Últimos pedidos ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="caption" color="ink3">Últimos pedidos</Text>
            {recentOrders.length > 0 && (
              <Text
                variant="small"
                color="ink2"
                onPress={() => router.push('/(agent)/pedidos')}
              >
                Ver todo
              </Text>
            )}
          </View>

          {recentOrders.length === 0 && !loading ? (
            <View style={styles.empty}>
              <Icon name="Inbox" size={24} color={colors.ink4} />
              <Text variant="body" color="ink3" align="center" style={{ marginTop: space[2] }}>
                Aún no hay pedidos
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {recentOrders.map((order: Order) => (
                <PressableCard
                  key={order.id}
                  padding="md"
                  onPress={() => router.push(`/(agent)/pedido/${order.id}` as any)}
                  style={styles.orderRow}
                >
                  <Avatar
                    name={order.client?.name ?? 'Sin cliente'}
                    size={36}
                    fontSize={12}
                  />
                  <View style={styles.orderInfo}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {order.client?.name ?? 'Sin cliente'}
                    </Text>
                    <Text variant="small" color="ink3" numberOfLines={1}>
                      {order.supplier?.name} · {formatRelativeDate(order.created_at)}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text variant="bodyMedium">{formatEur(order.total)}</Text>
                    <StatusBadge status={order.status} />
                  </View>
                </PressableCard>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomTabBar activeTab="home" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // KPIs
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: space[5],
    paddingHorizontal: space[4],
  },
  kpiCell: { flex: 1 },
  kpiDivider: { width: 1, backgroundColor: colors.line, marginHorizontal: space[4] },

  // CTA
  ctaWrap: {
    paddingHorizontal: space[4],
    paddingTop: space[5],
    paddingBottom: space[2],
  },

  // Secciones
  section: {
    paddingHorizontal: space[4],
    paddingTop: space[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[3],
  },

  // Quick actions
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginTop: space[3],
  },
  quickCard: {
    width: '48.5%',
    gap: space[2],
  },
  quickIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space[1],
  },

  // Orders
  ordersList: { gap: space[2] },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  orderInfo: { flex: 1, minWidth: 0 },
  orderRight: { alignItems: 'flex-end', gap: 4 },

  // Empty
  empty: {
    paddingVertical: space[10],
    alignItems: 'center',
  },
});
