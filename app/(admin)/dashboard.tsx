// ADM-01 · Dashboard de administración
import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { useAdminKPIs, useAdminAgents } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PLAN_LABELS: Record<string, string> = {
  basic:       'Básico',
  pro:         'Pro',
  agency:      'Agencia',
  agency_pro:  'Agencia Pro',
};

const MONTHS = ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'];
const BAR_HEIGHTS = [55, 60, 70, 65, 75, 80, 100];

const PLAN_REVENUE = [
  { plan: 'Pro',      agents: 186, price: 19, rev: 3534 },
  { plan: 'Básico',  agents: 48,  price: 9,  rev: 432  },
  { plan: 'Agencia', agents: 14,  price: 39, rev: 546  },
];
const MAX_REV = Math.max(...PLAN_REVENUE.map(p => p.rev));

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { kpis } = useAdminKPIs();
  const { agents, loading: agentsLoading } = useAdminAgents();

  const recentAgents = agents.slice(0, 5);

  return (
    <AdminShell activeSection="dashboard">
      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label="Ingresos mensuales"
          value={formatEur(kpis.mrr)}
          delta={`+${kpis.mrrDelta.toFixed(0)}% vs mes anterior`}
          trend="up"
          accent
        />
        <KpiCard
          label="Agentes activos"
          value={kpis.activeAgents.toString()}
          delta={`+${kpis.agentsDelta} nuevos este mes`}
          trend="up"
        />
        <KpiCard
          label="Pedidos generados"
          value={kpis.ordersThisMonth.toString()}
          delta="Este mes"
          trend="neutral"
        />
        <KpiCard
          label="Pagos pendientes"
          value={kpis.pendingPayments.toString()}
          delta={kpis.pendingPayments > 0 ? `${kpis.pendingPayments} agentes con cuota vencida` : 'Todo al día'}
          trend={kpis.pendingPayments === 0 ? 'up' : 'down'}
        />
      </View>

      {/* Gráfico evolución + por plan */}
      <View style={styles.rowCards}>
        {/* Bar chart */}
        <View style={[styles.card, { flex: 1.3 }]}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">Evolución de ingresos</Text>
          </View>
          <View style={styles.chartArea}>
            {MONTHS.map((m, i) => (
              <View key={m} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${BAR_HEIGHTS[i]}%` as any },
                      i === MONTHS.length - 1 && styles.barActive,
                    ]}
                  />
                </View>
                <Text variant="caption" color="ink4">{m}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartFooter}>
            <ChartStat value={formatEur(kpis.mrr)} label="Este mes" />
            <ChartStat value="3.990 €" label="Mes anterior" />
            <ChartStat value="26.480 €" label="Acumulado año" />
          </View>
        </View>

        {/* Por plan */}
        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">Ingresos por plan</Text>
          </View>
          {PLAN_REVENUE.map((p, i) => (
            <View key={p.plan} style={[styles.planRow, i === PLAN_REVENUE.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ width: 90 }}>
                <Text variant="smallMedium">{p.plan}</Text>
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                  {p.agents} ag · {p.price} €/mes
                </Text>
              </View>
              <View style={styles.planBarWrap}>
                <View style={[styles.planBar, { width: `${(p.rev / MAX_REV) * 100}%` as any }]} />
              </View>
              <Text variant="smallMedium" style={{ width: 60, textAlign: 'right' }}>
                {formatEur(p.rev)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabla agentes recientes */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">Últimos agentes registrados</Text>
          <Pressable
            onPress={() => router.push('/(admin)/agentes')}
            hitSlop={8}
            style={({ pressed }) => [styles.cardLink, pressed && { opacity: 0.6 }]}
          >
            <Text variant="smallMedium" color="ink2">Ver todos</Text>
            <Icon name="ArrowRight" size={16} color={colors.ink2} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHead}>
              {['Agente', 'Plan', 'Alta', 'Estado'].map(h => (
                <Text
                  key={h}
                  variant="caption"
                  color="ink3"
                  style={[styles.th, h === 'Agente' ? { width: 200 } : { width: 120 }]}
                >
                  {h.toUpperCase()}
                </Text>
              ))}
            </View>
            {agentsLoading && (
              <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
                Cargando...
              </Text>
            )}
            {!agentsLoading && recentAgents.length === 0 && (
              <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
                Sin agentes registrados
              </Text>
            )}
            {recentAgents.map((agent, i) => (
              <Pressable
                key={agent.id}
                style={({ pressed }) => [
                  styles.tableRow,
                  i === recentAgents.length - 1 && { borderBottomWidth: 0 },
                  pressed && { backgroundColor: colors.line2 },
                ]}
                onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
              >
                <View style={[styles.td, { width: 200 }]}>
                  <View style={styles.agentCell}>
                    <Avatar name={agent.name} size={32} fontSize={12} />
                    <View style={{ flex: 1 }}>
                      <Text variant="smallMedium" numberOfLines={1}>{agent.name}</Text>
                      <Text variant="caption" color="ink3" numberOfLines={1}>{agent.email}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.td, { width: 120 }]}>
                  <Badge label={PLAN_LABELS[agent.plan] ?? 'Básico'} variant="neutral" />
                </View>
                <View style={[styles.td, { width: 120 }]}>
                  <Text variant="small" color="ink2">{formatDate(agent.created_at)}</Text>
                </View>
                <View style={[styles.td, { width: 120 }]}>
                  <Badge
                    label={agent.active ? 'Activo' : 'Inactivo'}
                    variant={agent.active ? 'success' : 'neutral'}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </AdminShell>
  );
}

function KpiCard({ label, value, delta, trend, accent }: {
  label: string; value: string; delta: string;
  trend: 'up' | 'down' | 'neutral'; accent?: boolean;
}) {
  const deltaColor = accent
    ? 'rgba(255,255,255,0.8)'
    : trend === 'up' ? colors.success
    : trend === 'down' ? colors.danger
    : colors.ink3;

  return (
    <View style={[styles.kpiCard, accent && styles.kpiCardAccent]}>
      <Text
        variant="caption"
        style={{ color: accent ? 'rgba(255,255,255,0.85)' : colors.ink3 }}
      >
        {label}
      </Text>
      <Text
        variant="display"
        style={{ color: accent ? colors.white : colors.ink, marginTop: space[1] }}
      >
        {value}
      </Text>
      <Text
        variant="caption"
        style={{ color: deltaColor, marginTop: space[1] }}
      >
        {delta}
      </Text>
    </View>
  );
}

function ChartStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.cfItem}>
      <Text variant="smallMedium">{value}</Text>
      <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  kpiCard: {
    flex: 1, minWidth: 150,
    backgroundColor: colors.white,
    borderRadius: radius.md, padding: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  kpiCardAccent: { backgroundColor: colors.brand, borderColor: colors.brand },

  rowCards: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
    minWidth: 280,
  },
  cardHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  chartArea: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: space[3], paddingTop: space[3],
    height: 120, gap: 6,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: colors.line, borderRadius: 3 },
  barActive: { backgroundColor: colors.ink },

  chartFooter: {
    flexDirection: 'row', justifyContent: 'space-around',
    padding: space[3],
    borderTopWidth: 1, borderTopColor: colors.line2,
  },
  cfItem: { alignItems: 'center' },

  planRow: {
    paddingHorizontal: space[3], paddingVertical: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  planBarWrap: {
    flex: 1, height: 6,
    backgroundColor: colors.line2, borderRadius: 3,
    overflow: 'hidden',
  },
  planBar: { height: 6, borderRadius: 3, backgroundColor: colors.ink },

  tableHead: {
    flexDirection: 'row', backgroundColor: colors.surface2,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  th: {
    paddingVertical: space[2] + 2, paddingHorizontal: space[3],
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    alignItems: 'center',
  },
  td: { paddingVertical: space[2] + 4, paddingHorizontal: space[3], justifyContent: 'center' },
  agentCell: { flexDirection: 'row', alignItems: 'center', gap: space[2] },

  emptyText: { paddingVertical: space[6] },
});
