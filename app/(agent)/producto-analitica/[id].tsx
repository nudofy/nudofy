// Panel de Analítica para Agente — V1: ficha de detalle de producto
// Ver docs/nudofy-panel-analitica-spec.txt sección 5.3.1
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import {
  useProductMetrics, useProductClientBreakdown, unitsVariationPct, productRevenueVariationPct,
} from '@/hooks/useAgentAnalytics';
import type { ProductClientRow } from '@/hooks/useAgentAnalytics';

type Sort = 'units' | 'revenue' | 'last_order';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProductoAnaliticaScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { metrics, loading: loadingMetrics } = useProductMetrics();
  const { rows, loading: loadingRows } = useProductClientBreakdown(id);
  const [sort, setSort] = useState<Sort>('units');

  const product = useMemo(() => metrics.find(m => m.product_id === id), [metrics, id]);
  const unitsVariation = product ? unitsVariationPct(product) : null;
  const revenueVariation = product ? productRevenueVariationPct(product) : null;

  const sortedRows = useMemo(() => {
    const list = [...rows];
    if (sort === 'units') return list.sort((a, b) => b.units - a.units);
    if (sort === 'revenue') return list.sort((a, b) => b.revenue - a.revenue);
    return list.sort((a, b) => b.last_ordered_at.localeCompare(a.last_ordered_at));
  }, [rows, sort]);

  if (loadingMetrics) {
    return (
      <Screen>
        <TopBar title="Producto" onBack={() => goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={product?.product_name ?? 'Producto'} onBack={() => goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Resumen */}
        <View style={styles.summaryCard}>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            {product?.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Icon name="Package" size={24} color={colors.ink4} />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium">{product?.product_name}</Text>
              <Text variant="caption" color="ink3">{product?.supplier_name}</Text>
              {product?.reference && <Text variant="caption" color="ink4">Ref. {product.reference}</Text>}
            </View>
          </View>

          <View style={styles.highlightRow}>
            <View style={styles.highlightItem}>
              <Text variant="title">{product?.units_sold_period ?? 0}</Text>
              <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>Unidades (12 meses)</Text>
              {unitsVariation !== null && (
                <Text variant="caption" color={unitsVariation >= 0 ? 'success' : 'danger'}>
                  {unitsVariation >= 0 ? '+' : ''}{unitsVariation.toFixed(0)}%
                </Text>
              )}
            </View>
            <View style={styles.highlightDivider} />
            <View style={styles.highlightItem}>
              <Text variant="title">{formatEur(product?.revenue_period ?? 0)}</Text>
              <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>Facturación</Text>
              {revenueVariation !== null && (
                <Text variant="caption" color={revenueVariation >= 0 ? 'success' : 'danger'}>
                  {revenueVariation >= 0 ? '+' : ''}{revenueVariation.toFixed(0)}%
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Tiendas que lo han comprado */}
        <View style={styles.section}>
          <View style={styles.sortRow}>
            <Text variant="bodyMedium">Tiendas que lo compran</Text>
            <View style={styles.sortTabs}>
              <SortChip label="Unidades" active={sort === 'units'} onPress={() => setSort('units')} />
              <SortChip label="Facturación" active={sort === 'revenue'} onPress={() => setSort('revenue')} />
              <SortChip label="Último pedido" active={sort === 'last_order'} onPress={() => setSort('last_order')} />
            </View>
          </View>

          <View style={styles.card}>
            {loadingRows ? (
              <Text variant="small" color="ink3" align="center">Cargando...</Text>
            ) : sortedRows.length === 0 ? (
              <Text variant="small" color="ink3" align="center">Ninguna tienda ha comprado este producto todavía</Text>
            ) : (
              sortedRows.map((row, i) => (
                <ClientRow
                  key={row.client_id}
                  row={row}
                  isLast={i === sortedRows.length - 1}
                  onPress={() => router.push(`/(agent)/cliente/${row.client_id}` as any)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function SortChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text variant="caption" color={active ? 'white' : 'ink2'}>{label}</Text>
    </Pressable>
  );
}

function ClientRow({ row, isLast, onPress }: { row: ProductClientRow; isLast: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallMedium">{row.client_name}</Text>
        <Text variant="caption" color="ink3">Último pedido: {formatDate(row.last_ordered_at)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="bodyMedium">{row.units} ud.</Text>
        <Text variant="caption" color="ink3">{formatEur(row.revenue)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[4], paddingBottom: space[6] },

  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[4],
    gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surface2 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  highlightRow: { flexDirection: 'row', alignItems: 'center' },
  highlightItem: { flex: 1, alignItems: 'center', gap: 2 },
  highlightDivider: { width: 1, height: 48, backgroundColor: colors.line },

  section: { gap: space[2] },
  sortRow: { gap: space[2], paddingHorizontal: space[1] },
  sortTabs: { flexDirection: 'row', gap: space[1] },
  chip: {
    paddingHorizontal: space[2] + 2, paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  chipActive: { backgroundColor: colors.ink },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: space[2],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
});
