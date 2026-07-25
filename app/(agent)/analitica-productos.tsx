// Panel de Analítica para Agente — V1 punto 3: ranking de productos
// Ver docs/nudofy-panel-analitica-spec.txt sección 5.3
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import { useProductMetrics, unitsVariationPct } from '@/hooks/useAgentAnalytics';
import type { ProductMetric } from '@/hooks/useAgentAnalytics';

type Sort = 'units' | 'revenue';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

export default function AnaliticaProductosScreen() {
  const router = useRouter();
  const { metrics, loading } = useProductMetrics();
  const [sort, setSort] = useState<Sort>('units');
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);

  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    metrics.forEach(m => map.set(m.supplier_id, m.supplier_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [metrics]);

  const ranking = useMemo(() => {
    const list = metrics
      .filter(m => m.units_sold_period > 0)
      .filter(m => !supplierFilter || m.supplier_id === supplierFilter);
    return list.sort((a, b) => sort === 'units'
      ? b.units_sold_period - a.units_sold_period
      : b.revenue_period - a.revenue_period);
  }, [metrics, sort, supplierFilter]);

  return (
    <Screen>
      <TopBar title="Ranking de productos" onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.sortRow}>
          <View style={styles.sortTabs}>
            <SortChip label="Unidades" active={sort === 'units'} onPress={() => setSort('units')} />
            <SortChip label="Facturación" active={sort === 'revenue'} onPress={() => setSort('revenue')} />
          </View>
        </View>

        {suppliers.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <SortChip label="Todas las marcas" active={!supplierFilter} onPress={() => setSupplierFilter(null)} />
            {suppliers.map(s => (
              <SortChip key={s.id} label={s.name} active={supplierFilter === s.id} onPress={() => setSupplierFilter(s.id)} />
            ))}
          </ScrollView>
        )}

        <View style={styles.card}>
          {loading ? (
            <Text variant="small" color="ink3" align="center">Cargando...</Text>
          ) : ranking.length === 0 ? (
            <Text variant="small" color="ink3" align="center">Sin ventas de producto en este periodo</Text>
          ) : (
            ranking.map((m, i) => (
              <ProductRow
                key={m.product_id}
                metric={m}
                isLast={i === ranking.length - 1}
                onPress={() => router.push(`/(agent)/producto-analitica/${m.product_id}` as any)}
              />
            ))
          )}
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

function ProductRow({ metric, isLast, onPress }: { metric: ProductMetric; isLast: boolean; onPress: () => void }) {
  const variation = unitsVariationPct(metric);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      {metric.image_url ? (
        <Image source={{ uri: metric.image_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Icon name="Package" size={18} color={colors.ink4} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallMedium" numberOfLines={1}>{metric.product_name}</Text>
        <Text variant="caption" color="ink3" numberOfLines={1}>{metric.supplier_name}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text variant="bodyMedium">{metric.units_sold_period} ud.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="caption" color="ink3">{formatEur(metric.revenue_period)}</Text>
          {variation !== null && (
            <>
              <Icon name={variation >= 0 ? 'TrendingUp' : 'TrendingDown'} size={12} color={variation >= 0 ? colors.success : colors.danger} />
              <Text variant="caption" color={variation >= 0 ? 'success' : 'danger'}>
                {variation >= 0 ? '+' : ''}{variation.toFixed(0)}%
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[3], paddingBottom: space[6] },

  sortRow: { paddingHorizontal: space[1] },
  sortTabs: { flexDirection: 'row', gap: space[1] },
  filterRow: { gap: space[1], paddingHorizontal: space[1] },
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
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[2],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  thumb: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surface2 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
