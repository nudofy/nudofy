// C-05 · Historial de pedidos del cliente
import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, Pressable,
  StyleSheet, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import StatusBadge from '@/components/StatusBadge';
import { useClientData, useClientOrders } from '@/hooks/useClient';

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
    <Screen>
      <TopBar title="Mis pedidos" />

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Icon name="Search" size={16} color={colors.ink3} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nº pedido o proveedor..."
          placeholderTextColor={colors.ink4}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        <FilterPill
          label="Todos"
          active={statusFilter === null && supplierFilter === null}
          onPress={() => { setStatusFilter(null); setSupplierFilter(null); }}
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
        {loading && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Cargando...</Text>
        )}
        {!loading && filtered.length === 0 && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
            Sin pedidos en esta sección
          </Text>
        )}
        {filtered.map(order => (
          <Pressable
            key={order.id}
            style={({ pressed }) => [styles.orderCard, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/(client)/pedido/${order.id}` as any)}
          >
            <View style={styles.cardHead}>
              <View style={styles.supplierLogo}>
                <Text variant="bodyMedium" color="ink2">
                  {((order as any).supplier?.name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="ink3">{order.order_number ?? '—'}</Text>
                <Text variant="bodyMedium" style={{ marginTop: 2 }} numberOfLines={1}>
                  {(order as any).supplier?.name ?? '—'}
                </Text>
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }} numberOfLines={1}>
                  {(order as any).catalog?.name ?? '—'}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <Text variant="bodyMedium">{formatEur(order.total)}</Text>
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                  {formatDate(order.created_at)}
                </Text>
              </View>
            </View>
            <View style={styles.cardFoot}>
              <StatusBadge status={order.status} />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <ClientBottomTabBar activeTab="pedidos" />
    </Screen>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <Text
        variant="smallMedium"
        style={{ color: active ? colors.white : colors.ink2 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function KpiCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text variant="bodyMedium">{value}</Text>
      <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: space[3], paddingVertical: space[2],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: colors.ink,
    paddingVertical: 4,
  },

  filtersScroll: {
    maxHeight: 52,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  filtersContent: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    gap: space[1], flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: space[3], paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },

  kpiRow: {
    flexDirection: 'row', padding: space[3], gap: space[2], paddingBottom: 0,
  },
  kpiCard: {
    flex: 1, backgroundColor: colors.white,
    borderRadius: radius.md, padding: space[3],
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.line,
  },

  listContent: { padding: space[3], gap: space[2] },

  orderCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  cardHead: {
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
  },
  supplierLogo: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  cardRight: { alignItems: 'flex-end' },
  cardFoot: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderTopWidth: 1, borderTopColor: colors.line2,
  },

  emptyText: { paddingVertical: space[8] },
});
