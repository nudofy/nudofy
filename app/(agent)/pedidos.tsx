// A-09 · Historial de pedidos (3 pestañas)
import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirmDestructive } from '@/lib/confirm';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge } from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { useOrders } from '@/hooks/useAgent';
import { formatEur, formatOrderDate } from '@/lib/format';
import type { Order } from '@/hooks/useAgent';

type TabKey = 'realizados' | 'pendientes' | 'cancelados';

const TAB_STATUS: Record<TabKey, Order['status'][]> = {
  realizados: ['confirmed', 'sent_to_supplier'],
  pendientes: ['draft', 'proposal_sent'],
  cancelados: ['cancelled'],
};

export default function PedidosScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('orders');
  const { orders, loading, deleteOrder, refetch } = useOrders();
  const [tab, setTab] = useState<TabKey>('realizados');
  const [search, setSearch] = useState('');
  const formatDate = (iso: string) => formatOrderDate(iso, i18n.language, { today: t('agent.today'), yesterday: t('agent.yesterday') });

  useFocusEffect(React.useCallback(() => { refetch(); }, [refetch]));

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

  const pendingCount = orders.filter(o => o.status === 'draft' || o.status === 'proposal_sent').length;
  const doneCount = orders.filter(o => o.status === 'confirmed' || o.status === 'sent_to_supplier').length;

  function handleDeleteDraft(id: string) {
    confirmDestructive(
      t('agent.discard_dialog_title'),
      t('agent.discard_dialog_body'),
      async () => { await deleteOrder(id); refetch(); },
      t('agent.discard')
    );
  }

  function handleOpenOrder(order: Order) {
    if (order.status === 'draft') {
      router.push({ pathname: '/(agent)/pedido/nuevo', params: { draftId: order.id } } as any);
    } else {
      router.push(`/(agent)/pedido/${order.id}` as any);
    }
  }

  // KPIs del periodo
  const totalFiltered = filtered.reduce((s, o) => s + o.total, 0);
  const ticketMedio = filtered.length > 0 ? totalFiltered / filtered.length : 0;

  return (
    <Screen>
      <TopBar
        title={t('agent.title')}
        onBack={() => router.push('/(agent)/home')}
        actions={[{ icon: 'Plus', onPress: () => router.push('/(agent)/pedido/nuevo'), accessibilityLabel: t('agent.new_order') }]}
      />

      {/* Buscador */}
      <View style={styles.searchBarWrap}>
        <View style={styles.inputWithIcon}>
          <Icon name="Search" size={16} color={colors.ink4} />
          <TextInput
            style={styles.inputEl}
            placeholder={t('agent.search_placeholder')}
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Pestañas */}
      <View style={styles.tabBar}>
        <TabBtn label={t('agent.tab_done')} count={doneCount} active={tab === 'realizados'} onPress={() => setTab('realizados')} />
        <TabBtn label={t('agent.tab_pending')} count={pendingCount} active={tab === 'pendientes'} onPress={() => setTab('pendientes')} />
        <TabBtn label={t('agent.tab_cancelled')} active={tab === 'cancelados'} onPress={() => setTab('cancelados')} />
      </View>

      {/* KPIs */}
      {filtered.length > 0 && (
        <View style={styles.kpiRow}>
          <Kpi value={String(filtered.length)} label={t('agent.kpi_orders')} />
          <Kpi value={formatEur(totalFiltered, i18n.language)} label={t('agent.kpi_revenue')} />
          <Kpi value={formatEur(ticketMedio, i18n.language)} label={t('agent.kpi_avg_ticket')} />
        </View>
      )}

      {/* Lista */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading && <Text variant="small" color="ink3" align="center" style={styles.emptyText}>{t('agent.loading')}</Text>}
        {!loading && filtered.length === 0 && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>{t('agent.empty')}</Text>
        )}
        {filtered.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            formatDate={formatDate}
            onPress={() => handleOpenOrder(order)}
            onDelete={order.status === 'draft' ? () => handleDeleteDraft(order.id) : undefined}
          />
        ))}
      </ScrollView>

      <BottomTabBar activeTab="pedidos" />
    </Screen>
  );
}

function TabBtn({ label, count, active, onPress }: {
  label: string; count?: number;
  active: boolean; onPress: () => void;
}) {
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <View style={styles.tabInner}>
        <Text variant="smallMedium" color={active ? 'ink' : 'ink3'}>{label}</Text>
        {!!count && (
          <View style={styles.tabCount}>
            <Text variant="caption" color="ink2">{count}</Text>
          </View>
        )}
      </View>
      {active && <View style={styles.tabIndicator} />}
    </Pressable>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.kpi}>
      <Text variant="heading">{value}</Text>
      <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function OrderCard({ order, onPress, onDelete, formatDate }: {
  order: Order; onPress: () => void; onDelete?: () => void; formatDate: (iso: string) => string;
}) {
  const { t, i18n } = useTranslation('orders');
  const isDraft = order.status === 'draft';
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={styles.cardHead}>
        <Avatar name={order.client?.name ?? '?'} size={38} fontSize={12} />
        <View style={styles.cardBody}>
          {order.order_number && <Text variant="caption" color="ink3">{order.order_number}</Text>}
          <Text variant="bodyMedium">{order.client?.name ?? (isDraft ? t('agent.no_client_draft') : t('agent.no_client'))}</Text>
          <Text variant="small" color="ink3" numberOfLines={1}>
            {order.supplier?.name ?? '—'}{order.catalog?.name ? ` · ${order.catalog.name}` : ''}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text variant="bodyMedium">{formatEur(order.total, i18n.language)}</Text>
          <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{formatDate(order.created_at)}</Text>
        </View>
      </View>
      <View style={styles.cardFoot}>
        <StatusBadge status={order.status} />
        <View style={styles.cardActions}>
          {isDraft ? (
            <>
              {onDelete && (
                <Pressable
                  style={styles.actBtn}
                  onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
                  hitSlop={6}
                >
                  <Text variant="caption" color="ink2">{t('agent.discard')}</Text>
                </Pressable>
              )}
              <Pressable style={[styles.actBtn, styles.actBtnPrimary]} onPress={onPress}>
                <Text variant="caption" color="brand">{t('agent.continue')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.actBtn}>
                <Text variant="caption" color="ink2">{t('agent.resend_pdf')}</Text>
              </Pressable>
              <Pressable style={styles.actBtn}>
                <Text variant="caption" color="ink2">{t('agent.duplicate')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBarWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: space[4], paddingVertical: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space[3], height: 40,
    backgroundColor: colors.white,
  },
  inputEl: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 0 },

  tabBar: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingHorizontal: space[4],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space[3], position: 'relative' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  tabCount: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: radius.full,
    minWidth: 18, alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: space[4], right: space[4],
    height: 2, backgroundColor: colors.ink,
  },

  kpiRow: {
    flexDirection: 'row',
    gap: space[2],
    padding: space[3], paddingBottom: 0,
  },
  kpi: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.line,
  },

  listContent: { padding: space[3], gap: space[2] },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  cardHead: {
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
  },
  cardBody: { flex: 1, minWidth: 0, gap: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardFoot: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderTopWidth: 1, borderTopColor: colors.line2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space[2],
  },
  cardActions: { flexDirection: 'row', gap: space[1] },
  actBtn: {
    paddingHorizontal: space[2], paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.line,
  },
  actBtnPrimary: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  emptyText: { paddingVertical: space[8] },
});
