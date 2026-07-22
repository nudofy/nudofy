// A-01 · Inicio del agente · redesign v2
import React from 'react';
import {
  RefreshControl, ScrollView, StyleSheet, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '@/theme';
import {
  Badge, Button, Icon, PressableCard, Screen, Text, TopBar,
} from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { useDashboardKPIs } from '@/hooks/useAgent';
import { useAgentContext } from '@/contexts/AgentContext';
import { formatEur } from '@/lib/format';
import type { Order } from '@/hooks/useAgent';
import type { IconName } from '@/components/ui/Icon';

type QuickAction = {
  icon: IconName;
  label: string;
  sub: string;
  route: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('agent');
  const { agent } = useAgentContext();
  const { kpis, recentOrders, loading, refetch } = useDashboardKPIs();
  const [refreshing, setRefreshing] = React.useState(false);

  function formatRelativeDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / 3600000;
    if (hours < 1) return t('home.moment_ago');
    if (hours < 24) return t('home.hours_ago', { count: Math.floor(hours) });
    if (hours < 48) return t('home.yesterday');
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  }

  const firstName = agent?.name?.split(' ')[0] ?? '';

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? t('home.greeting_morning') :
    now.getHours() < 20 ? t('home.greeting_afternoon') : t('home.greeting_evening');
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
  const dateStr = now.toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const quickActions: QuickAction[] = [
    { icon: 'Users',        label: t('home.qa_clients_label'),   sub: t('home.qa_clients_sub'),   route: '/(agent)/clientes' },
    { icon: 'Package',      label: t('home.qa_suppliers_label'), sub: t('home.qa_suppliers_sub'), route: '/(agent)/catalogos' },
    { icon: 'ClipboardList',label: t('home.qa_orders_label'),    sub: t('home.qa_orders_sub'),    route: '/(agent)/pedidos' },
    { icon: 'ChartBar',     label: t('home.qa_stats_label'),     sub: t('home.qa_stats_sub'),     route: '/(agent)/estadisticas' },
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
            onPress: () => router.push('/(agent)/notificaciones'),
            accessibilityLabel: t('home.notifications_label'),
          },
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
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
            <Text variant="small" color="ink3">{t('home.kpi_orders_month')}</Text>
            <Text variant="display" style={{ marginTop: space[1] }}>
              {kpis.ordersThisMonth}
            </Text>
            {kpis.totalThisMonth > 0 && (
              <Text variant="small" color="ink3" style={{ marginTop: 2 }}>
                {formatEur(kpis.totalThisMonth, i18n.language)}
              </Text>
            )}
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiCell}>
            <Text variant="small" color="ink3">{t('home.kpi_amount_today')}</Text>
            <Text variant="display" style={{ marginTop: space[1] }}>
              {formatEur(kpis.totalToday, i18n.language)}
            </Text>
          </View>
        </View>

        {/* ── CTA primario destacado ── */}
        <View style={styles.ctaWrap}>
          <Button
            label={t('home.new_order')}
            icon="Plus"
            fullWidth
            onPress={() => router.push('/(agent)/pedido/nuevo')}
          />
        </View>

        {/* ── Acceso rápido ── */}
        <View style={styles.section}>
          <Text variant="caption" color="ink3">{t('home.quick_access')}</Text>
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
            <Text variant="caption" color="ink3">{t('home.recent_orders')}</Text>
            {recentOrders.length > 0 && (
              <Text
                variant="small"
                color="ink2"
                onPress={() => router.push('/(agent)/pedidos')}
              >
                {t('home.view_all')}
              </Text>
            )}
          </View>

          {recentOrders.length === 0 && !loading ? (
            <View style={styles.empty}>
              <Icon name="Inbox" size={24} color={colors.ink4} />
              <Text variant="body" color="ink3" align="center" style={{ marginTop: space[2] }}>
                {t('home.no_orders_yet')}
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
                    name={order.client?.name ?? t('home.no_client')}
                    size={36}
                    fontSize={12}
                  />
                  <View style={styles.orderInfo}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {order.client?.name ?? t('home.no_client')}
                    </Text>
                    <Text variant="small" color="ink3" numberOfLines={1}>
                      {order.supplier?.name} · {formatRelativeDate(order.created_at)}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text variant="bodyMedium">{formatEur(order.total, i18n.language)}</Text>
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
