// A-09 · Estadísticas del agente
import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text } from '@/components/ui';
import { useStats, useAgent } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import type { MonthStat, YearStat } from '@/hooks/useAgent';

type MonthOrder = { id: string; order_number?: string; total: number; created_at: string; client?: { name: string }; supplier?: { name: string } };

type Tab = 'mensual' | 'anual';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function EstadisticasScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('mensual');
  const { monthStats, yearStats, totalOrders, totalRevenue, loading } = useStats();
  const { agent } = useAgent();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthOrders, setMonthOrders] = useState<MonthOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentMonthStat = monthStats[currentMonth];
  const maxMonthTotal = Math.max(...monthStats.map(m => m.total), 1);
  const maxYearTotal = Math.max(...yearStats.map(y => y.total), 1);

  useEffect(() => {
    if (selectedMonth === null || !agent) { setMonthOrders([]); return; }
    setLoadingOrders(true);
    const from = new Date(currentYear, selectedMonth, 1).toISOString();
    const to = new Date(currentYear, selectedMonth + 1, 1).toISOString();
    supabase
      .from('orders')
      .select('id, order_number, total, created_at, client:clients(name), supplier:suppliers(name)')
      .eq('agent_id', agent.id)
      .in('status', ['confirmed', 'sent_to_supplier', 'proposal_sent'])
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMonthOrders((data ?? []) as MonthOrder[]);
        setLoadingOrders(false);
      });
  }, [selectedMonth, agent]);

  return (
    <Screen>
      <TopBar title="Estadísticas" onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* KPIs globales */}
        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text variant="heading">{totalOrders}</Text>
            <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>Pedidos totales</Text>
          </View>
          <View style={[styles.kpi, styles.kpiAccent]}>
            <Text variant="heading" style={{ color: colors.white }}>{formatEur(totalRevenue)}</Text>
            <Text variant="caption" style={{ color: colors.white, opacity: 0.85, marginTop: 2 }}>
              Facturación total
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['mensual', 'anual'] as Tab[]).map(t => (
            <Pressable
              key={t}
              style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.7 }]}
              onPress={() => setTab(t)}
            >
              <Text variant="smallMedium" color={tab === t ? 'ink' : 'ink3'}>
                {t === 'mensual' ? 'Por mes' : 'Por año'}
              </Text>
              {tab === t && <View style={styles.tabIndicator} />}
            </Pressable>
          ))}
        </View>

        {loading ? (
          <Text variant="small" color="ink3" align="center" style={styles.empty}>Cargando...</Text>
        ) : tab === 'mensual' ? (
          <MensualTab
            stats={monthStats}
            currentMonth={currentMonth}
            currentStat={currentMonthStat}
            maxTotal={maxMonthTotal}
            selectedMonth={selectedMonth}
            onSelectMonth={(m) => setSelectedMonth(prev => prev === m ? null : m)}
            monthOrders={monthOrders}
            loadingOrders={loadingOrders}
          />
        ) : (
          <AnualTab stats={yearStats} maxTotal={maxYearTotal} />
        )}
      </ScrollView>
    </Screen>
  );
}

function MensualTab({ stats, currentMonth, currentStat, maxTotal, selectedMonth, onSelectMonth, monthOrders, loadingOrders }: {
  stats: MonthStat[];
  currentMonth: number;
  currentStat?: MonthStat;
  maxTotal: number;
  selectedMonth: number | null;
  onSelectMonth: (m: number) => void;
  monthOrders: MonthOrder[];
  loadingOrders: boolean;
}) {
  const year = new Date().getFullYear();
  const selectedStat = selectedMonth !== null ? stats[selectedMonth] : null;

  return (
    <View style={styles.tabContent}>
      {/* Resumen mes actual */}
      <View style={styles.card}>
        <Text variant="caption" color="ink3">
          Este mes ({stats[currentMonth]?.label} {year})
        </Text>
        <View style={styles.highlightRow}>
          <View style={styles.highlightItem}>
            <Text variant="title">{currentStat?.orders ?? 0}</Text>
            <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>Pedidos</Text>
          </View>
          <View style={styles.highlightDivider} />
          <View style={styles.highlightItem}>
            <Text variant="title">{formatEur(currentStat?.total ?? 0)}</Text>
            <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>Facturación</Text>
          </View>
        </View>
      </View>

      {/* Barras por mes — pulsables */}
      <View style={styles.card}>
        <Text variant="bodyMedium">Facturación mensual {year}</Text>
        <View style={styles.barsWrap}>
          {stats.map((m) => {
            const pct = maxTotal > 0 ? m.total / maxTotal : 0;
            const isCurrent = m.month === currentMonth;
            const isSelected = m.month === selectedMonth;
            return (
              <Pressable key={m.month} style={styles.barCol} onPress={() => onSelectMonth(m.month)}>
                <Text variant="caption" color="ink4" style={styles.barAmount}>
                  {m.total > 0 ? (m.total >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : `${Math.round(m.total)}`) : ''}
                </Text>
                <View style={[styles.barTrack, isSelected && { backgroundColor: colors.brandSoft }]}>
                  <View style={[
                    styles.barFill,
                    { height: `${Math.max(pct * 100, m.total > 0 ? 4 : 0)}%` },
                    (isCurrent || isSelected) && styles.barFillActive,
                    isSelected && styles.barFillSelected,
                  ]} />
                </View>
                <Text
                  variant="caption"
                  color={isSelected ? 'brand' : isCurrent ? 'ink' : 'ink3'}
                  style={[styles.barLabel, isSelected && { fontWeight: '700' }]}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedMonth !== null && (
          <Text variant="caption" color="ink3" align="center">
            Toca el mismo mes para cerrar
          </Text>
        )}
      </View>

      {/* Pedidos del mes seleccionado */}
      {selectedMonth !== null && (
        <View style={styles.card}>
          <Text variant="bodyMedium">
            {selectedStat?.label} {year} · {selectedStat?.orders ?? 0} pedido{(selectedStat?.orders ?? 0) !== 1 ? 's' : ''}
          </Text>
          {loadingOrders ? (
            <ActivityIndicator size="small" color={colors.ink3} />
          ) : monthOrders.length === 0 ? (
            <Text variant="small" color="ink3" align="center" style={styles.empty}>
              Sin pedidos confirmados este mes
            </Text>
          ) : (
            monthOrders.map((o, i) => (
              <View key={o.id} style={[styles.tableRow, i < monthOrders.length - 1 && styles.tableRowBorder]}>
                <View style={{ flex: 1, gap: 2 }}>
                  {o.order_number ? <Text variant="caption" color="ink3">{o.order_number}</Text> : null}
                  <Text variant="smallMedium">{(o.client as any)?.name ?? '—'}</Text>
                  <Text variant="caption" color="ink3">{(o.supplier as any)?.name ?? '—'}</Text>
                </View>
                <Text variant="bodyMedium" style={styles.tableAmount}>{formatEur(o.total)}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* Tabla mensual */}
      <View style={styles.card}>
        <Text variant="bodyMedium">Detalle por mes</Text>
        {stats.filter(m => m.orders > 0).length === 0 ? (
          <Text variant="small" color="ink3" align="center" style={styles.empty}>
            Sin pedidos confirmados este año
          </Text>
        ) : (
          stats.map((m, i) => m.orders > 0 && (
            <Pressable
              key={m.month}
              style={[styles.tableRow, i < stats.length - 1 && styles.tableRowBorder, m.month === selectedMonth && { backgroundColor: colors.surface }]}
              onPress={() => onSelectMonth(m.month)}
            >
              <Text
                variant={m.month === currentMonth ? 'bodyMedium' : 'body'}
                style={{ flex: 1 }}
              >
                {m.label} {m.year}
              </Text>
              <Text variant="small" color="ink3" style={{ marginRight: space[3] }}>
                {m.orders} pedido{m.orders !== 1 ? 's' : ''}
              </Text>
              <Text variant="bodyMedium" style={styles.tableAmount}>
                {formatEur(m.total)}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

function AnualTab({ stats, maxTotal }: { stats: YearStat[]; maxTotal: number }) {
  return (
    <View style={styles.tabContent}>
      {stats.length === 0 ? (
        <Text variant="small" color="ink3" align="center" style={styles.empty}>
          Sin datos anuales
        </Text>
      ) : (
        <>
          {/* Barras por año */}
          <View style={styles.card}>
            <Text variant="bodyMedium">Facturación anual</Text>
            <View style={[styles.barsWrap, { gap: 16 }]}>
              {stats.map((y) => {
                const pct = maxTotal > 0 ? y.total / maxTotal : 0;
                return (
                  <View key={y.year} style={[styles.barCol, stats.length === 1 && { maxWidth: 80 }]}>
                    <Text variant="caption" color="ink4" style={styles.barAmount}>
                      {y.total >= 1000 ? `${(y.total / 1000).toFixed(1)}k` : `${Math.round(y.total)}`}
                    </Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, styles.barFillActive, { height: `${Math.max(pct * 100, 4)}%` }]} />
                    </View>
                    <Text variant="caption" color="ink3" style={styles.barLabel}>
                      {y.year}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Tabla anual */}
          <View style={styles.card}>
            <Text variant="bodyMedium">Detalle por año</Text>
            {stats.map((y, i) => (
              <View
                key={y.year}
                style={[styles.tableRow, i < stats.length - 1 && styles.tableRowBorder]}
              >
                <Text variant="bodyMedium" style={{ flex: 1 }}>{y.year}</Text>
                <Text variant="small" color="ink3" style={{ marginRight: space[3] }}>
                  {y.orders} pedido{y.orders !== 1 ? 's' : ''}
                </Text>
                <Text variant="bodyMedium" style={styles.tableAmount}>
                  {formatEur(y.total)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[4] },

  kpiRow: {
    flexDirection: 'row', gap: space[2],
    paddingHorizontal: space[3], paddingTop: space[3],
  },
  kpi: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  kpiAccent: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: space[3], marginTop: space[3],
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  tabItem: {
    flex: 1, alignItems: 'center',
    paddingVertical: space[3],
  },
  tabIndicator: {
    position: 'absolute', bottom: 0,
    width: '60%', height: 2,
    backgroundColor: colors.ink,
    borderRadius: 1,
  },

  tabContent: { padding: space[3], gap: space[2] },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

  highlightRow: { flexDirection: 'row', alignItems: 'center' },
  highlightItem: { flex: 1, alignItems: 'center', gap: 2 },
  highlightDivider: { width: 1, height: 40, backgroundColor: colors.line },

  barsWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 120, gap: 4,
  },
  barCol: {
    flex: 1, alignItems: 'center', gap: 4,
    height: '100%', justifyContent: 'flex-end',
  },
  barAmount: { fontSize: 9, textAlign: 'center' },
  barTrack: {
    flex: 1, width: '100%',
    backgroundColor: colors.surface2,
    borderRadius: 4,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.line,
    borderRadius: 4,
  },
  barFillActive: { backgroundColor: colors.ink },
  barLabel: { fontSize: 9, textAlign: 'center' },

  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: space[2],
  },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  tableAmount: { minWidth: 80, textAlign: 'right' },

  empty: { paddingVertical: space[6] },
});
