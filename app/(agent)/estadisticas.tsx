// A-09 · Estadísticas del agente
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useStats } from '@/hooks/useAgent';
import type { MonthStat, YearStat } from '@/hooks/useAgent';

type Tab = 'mensual' | 'anual';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function EstadisticasScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('mensual');
  const { monthStats, yearStats, totalOrders, totalRevenue, loading } = useStats();

  const currentMonth = new Date().getMonth();
  const currentMonthStat = monthStats[currentMonth];
  const maxMonthTotal = Math.max(...monthStats.map(m => m.total), 1);
  const maxYearTotal  = Math.max(...yearStats.map(y => y.total), 1);

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Más</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Estadísticas</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* KPIs globales */}
        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiValue}>{totalOrders}</Text>
            <Text style={styles.kpiLabel}>Pedidos totales</Text>
          </View>
          <View style={[styles.kpi, styles.kpiAccent]}>
            <Text style={[styles.kpiValue, { color: '#fff' }]}>{formatEur(totalRevenue)}</Text>
            <Text style={[styles.kpiLabel, { color: '#AFA9EC' }]}>Facturación total</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['mensual', 'anual'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={styles.tabItem} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabActive]}>
                {t === 'mensual' ? 'Por mes' : 'Por año'}
              </Text>
              {tab === t && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <Text style={styles.empty}>Cargando...</Text>
        ) : tab === 'mensual' ? (
          <MensualTab
            stats={monthStats}
            currentMonth={currentMonth}
            currentStat={currentMonthStat}
            maxTotal={maxMonthTotal}
          />
        ) : (
          <AnualTab stats={yearStats} maxTotal={maxYearTotal} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MensualTab({ stats, currentMonth, currentStat, maxTotal }: {
  stats: MonthStat[];
  currentMonth: number;
  currentStat?: MonthStat;
  maxTotal: number;
}) {
  const year = new Date().getFullYear();

  return (
    <View style={styles.tabContent}>
      {/* Resumen mes actual */}
      <View style={styles.highlightCard}>
        <Text style={styles.highlightLabel}>Este mes ({stats[currentMonth]?.label} {year})</Text>
        <View style={styles.highlightRow}>
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>{currentStat?.orders ?? 0}</Text>
            <Text style={styles.highlightSub}>Pedidos</Text>
          </View>
          <View style={styles.highlightDivider} />
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>{formatEur(currentStat?.total ?? 0)}</Text>
            <Text style={styles.highlightSub}>Facturación</Text>
          </View>
        </View>
      </View>

      {/* Barras por mes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Facturación mensual {year}</Text>
        <View style={styles.barsWrap}>
          {stats.map((m) => {
            const pct = maxTotal > 0 ? m.total / maxTotal : 0;
            const isCurrent = m.month === currentMonth;
            return (
              <View key={m.month} style={styles.barCol}>
                <Text style={styles.barAmount}>
                  {m.total > 0 ? (m.total >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : `${Math.round(m.total)}`) : ''}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    { height: `${Math.max(pct * 100, m.total > 0 ? 4 : 0)}%` },
                    isCurrent && styles.barFillActive,
                  ]} />
                </View>
                <Text style={[styles.barLabel, isCurrent && styles.barLabelActive]}>{m.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Tabla mensual */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalle por mes</Text>
        {stats.filter(m => m.orders > 0).length === 0 ? (
          <Text style={styles.empty}>Sin pedidos confirmados este año</Text>
        ) : (
          stats.map((m) => m.orders > 0 && (
            <View key={m.month} style={[styles.tableRow, m.month === currentMonth && styles.tableRowActive]}>
              <Text style={[styles.tableLabel, m.month === currentMonth && { fontWeight: '600' }]}>
                {m.label} {m.year}
              </Text>
              <Text style={styles.tableOrders}>{m.orders} pedido{m.orders !== 1 ? 's' : ''}</Text>
              <Text style={styles.tableAmount}>{formatEur(m.total)}</Text>
            </View>
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
        <Text style={styles.empty}>Sin datos anuales</Text>
      ) : (
        <>
          {/* Barras por año */}
          {stats.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Facturación anual</Text>
              <View style={[styles.barsWrap, { gap: 16 }]}>
                {stats.map((y) => {
                  const pct = maxTotal > 0 ? y.total / maxTotal : 0;
                  return (
                    <View key={y.year} style={styles.barCol}>
                      <Text style={styles.barAmount}>
                        {y.total >= 1000 ? `${(y.total / 1000).toFixed(1)}k` : `${Math.round(y.total)}`}
                      </Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, styles.barFillActive, { height: `${Math.max(pct * 100, 4)}%` }]} />
                      </View>
                      <Text style={styles.barLabel}>{y.year}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tabla anual */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalle por año</Text>
            {stats.map((y) => (
              <View key={y.year} style={styles.tableRow}>
                <Text style={[styles.tableLabel, { fontWeight: '600' }]}>{y.year}</Text>
                <Text style={styles.tableOrders}>{y.orders} pedido{y.orders !== 1 ? 's' : ''}</Text>
                <Text style={styles.tableAmount}>{formatEur(y.total)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5, borderBottomColor: '#efefef' },
  back: { fontSize: 14, color: colors.purple, width: 60 },
  title: { fontSize: 16, fontWeight: '500', color: colors.text },
  kpiRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 14, paddingTop: 14 },
  kpi: {
    flex: 1, backgroundColor: colors.white,
    borderRadius: 14, padding: 16, gap: 4 },
  kpiAccent: { backgroundColor: colors.purple },
  kpiValue: { fontSize: 18, fontWeight: '600', color: colors.text },
  kpiLabel: { fontSize: 11, color: colors.textMuted },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 14, marginTop: 14,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  tabText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  tabActive: { color: colors.purple },
  tabIndicator: {
    position: 'absolute', bottom: 0,
    width: '60%', height: 2,
    backgroundColor: colors.purple, borderRadius: 1 },
  tabContent: { padding: 14, gap: 12 },
  highlightCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16, gap: 12 },
  highlightLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  highlightRow: { flexDirection: 'row', alignItems: 'center' },
  highlightItem: { flex: 1, alignItems: 'center', gap: 4 },
  highlightDivider: { width: 1, height: 40, backgroundColor: colors.border },
  highlightValue: { fontSize: 20, fontWeight: '600', color: colors.text },
  highlightSub: { fontSize: 11, color: colors.textMuted },
  card: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16, gap: 14 },
  cardTitle: { fontSize: 13, fontWeight: '500', color: colors.text },
  barsWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 120, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barAmount: { fontSize: 8, color: colors.textMuted, textAlign: 'center' },
  barTrack: {
    flex: 1, width: '100%',
    backgroundColor: '#F1EFE8', borderRadius: 4,
    justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: {
    width: '100%', backgroundColor: colors.purpleLight,
    borderRadius: 4 },
  barFillActive: { backgroundColor: colors.purple },
  barLabel: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  barLabelActive: { color: colors.purple, fontWeight: '600' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  tableRowActive: { backgroundColor: '#FAFAFE' },
  tableLabel: { flex: 1, fontSize: 13, color: colors.text },
  tableOrders: { fontSize: 12, color: colors.textMuted, marginRight: 12 },
  tableAmount: { fontSize: 13, fontWeight: '500', color: colors.purple, minWidth: 80, textAlign: 'right' },
  empty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 } });
