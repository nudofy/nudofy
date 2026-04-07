// ADM-01 · Dashboard de administración
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { useAdminKPIs, useAdminAgents } from '@/hooks/useAdmin';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PLAN_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  basic:       { bg: '#F1EFE8', text: '#5F5E5A', label: 'Básico'      },
  pro:         { bg: '#EEEDFE', text: '#3C3489', label: 'Pro'          },
  agency:      { bg: '#E6F1FB', text: '#0C447C', label: 'Agencia'      },
  agency_pro:  { bg: '#042C53', text: '#85B7EB', label: 'Agencia Pro'  },
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
  const { kpis, loading: kpisLoading } = useAdminKPIs();
  const { agents, loading: agentsLoading } = useAdminAgents();

  const recentAgents = agents.slice(0, 5);

  return (
    <AdminShell activeSection="dashboard">
      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label="Ingresos mensuales"
          value={formatEur(kpis.mrr)}
          delta={`▲ ${kpis.mrrDelta.toFixed(0)}% vs mes anterior`}
          deltaUp
          accent
        />
        <KpiCard
          label="Agentes activos"
          value={kpis.activeAgents.toString()}
          delta={`▲ ${kpis.agentsDelta} nuevos este mes`}
          deltaUp
        />
        <KpiCard
          label="Pedidos generados"
          value={kpis.ordersThisMonth.toString()}
          delta="Este mes"
          deltaUp
        />
        <KpiCard
          label="Pagos pendientes"
          value={kpis.pendingPayments.toString()}
          delta={kpis.pendingPayments > 0 ? `${kpis.pendingPayments} agentes con cuota vencida` : 'Todo al día'}
          deltaUp={kpis.pendingPayments === 0}
        />
      </View>

      {/* Gráfico evolución + por plan */}
      <View style={styles.rowCards}>
        {/* Bar chart */}
        <View style={[styles.card, { flex: 1.3 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Evolución de ingresos</Text>
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
                <Text style={styles.barLabel}>{m}</Text>
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
            <Text style={styles.cardTitle}>Ingresos por plan</Text>
          </View>
          {PLAN_REVENUE.map(p => (
            <View key={p.plan} style={styles.planRow}>
              <View style={{ width: 80 }}>
                <Text style={styles.planName}>{p.plan}</Text>
                <Text style={styles.planAgents}>{p.agents} ag · {p.price} €/mes</Text>
              </View>
              <View style={styles.planBarWrap}>
                <View style={[styles.planBar, { width: `${(p.rev / MAX_REV) * 100}%` as any }]} />
              </View>
              <Text style={styles.planRevenue}>{formatEur(p.rev)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabla agentes recientes */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Últimos agentes registrados</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/agentes')}>
            <Text style={styles.cardLink}>Ver todos →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHead}>
              {['Agente', 'Plan', 'Alta', 'Estado'].map(h => (
                <Text key={h} style={[styles.th, h === 'Agente' ? { width: 180 } : { width: 100 }]}>{h}</Text>
              ))}
            </View>
            {agentsLoading && (
              <Text style={styles.emptyText}>Cargando...</Text>
            )}
            {recentAgents.map(agent => {
              const plan = PLAN_COLORS[agent.plan] ?? PLAN_COLORS.basic;
              return (
                <TouchableOpacity
                  key={agent.id}
                  style={styles.tableRow}
                  onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.td, { width: 180 }]}>
                    <View style={styles.agentCell}>
                      <View style={[styles.av, { backgroundColor: '#EEEDFE' }]}>
                        <Text style={[styles.avText, { color: '#3C3489' }]}>
                          {agent.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.agentName}>{agent.name}</Text>
                        <Text style={styles.agentEmail}>{agent.email}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.td, { width: 100 }]}>
                    <View style={[styles.tag, { backgroundColor: plan.bg }]}>
                      <Text style={[styles.tagText, { color: plan.text }]}>{plan.label}</Text>
                    </View>
                  </View>
                  <View style={[styles.td, { width: 100 }]}>
                    <Text style={styles.tdText}>{formatDate(agent.created_at)}</Text>
                  </View>
                  <View style={[styles.td, { width: 100 }]}>
                    <View style={[styles.tag, { backgroundColor: agent.active ? '#EAF3DE' : '#F1EFE8' }]}>
                      <Text style={[styles.tagText, { color: agent.active ? '#3B6D11' : '#888' }]}>
                        {agent.active ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </AdminShell>
  );
}

function KpiCard({ label, value, delta, deltaUp, accent }: {
  label: string; value: string; delta: string; deltaUp: boolean; accent?: boolean;
}) {
  return (
    <View style={[styles.kpiCard, accent && styles.kpiCardAccent]}>
      <Text style={[styles.kpiLabel, accent && styles.kpiLabelAccent]}>{label}</Text>
      <Text style={[styles.kpiValue, accent && styles.kpiValueAccent]}>{value}</Text>
      <Text style={[
        styles.kpiDelta,
        deltaUp ? styles.kpiDeltaUp : styles.kpiDeltaDown,
        accent && { color: '#C0BBF0' },
      ]}>
        {delta}
      </Text>
    </View>
  );
}

function ChartStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.cfItem}>
      <Text style={styles.cfVal}>{value}</Text>
      <Text style={styles.cfLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  kpiCard: {
    flex: 1, minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: '#e8e8e8',
  },
  kpiCardAccent: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  kpiLabel: { fontSize: 11, color: '#999', marginBottom: 6 },
  kpiLabelAccent: { color: '#AFA9EC' },
  kpiValue: { fontSize: 24, fontWeight: '500', color: '#1a1a1a' },
  kpiValueAccent: { color: '#fff' },
  kpiDelta: { fontSize: 11, marginTop: 5 },
  kpiDeltaUp: { color: '#3B6D11' },
  kpiDeltaDown: { color: '#A32D2D' },
  rowCards: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8', overflow: 'hidden',
    minWidth: 260,
  },
  cardHeader: {
    padding: 14, paddingHorizontal: 18,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  cardLink: { fontSize: 12, color: '#534AB7' },
  chartArea: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 18, paddingTop: 16,
    height: 100, gap: 6,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#EEEDFE', borderRadius: 3 },
  barActive: { backgroundColor: '#534AB7' },
  barLabel: { fontSize: 10, color: '#bbb' },
  chartFooter: {
    flexDirection: 'row', justifyContent: 'space-around',
    padding: 12, paddingHorizontal: 18,
    borderTopWidth: 0.5, borderTopColor: '#f0f0f0',
    marginTop: 10,
  },
  cfItem: { alignItems: 'center' },
  cfVal: { fontSize: 12, fontWeight: '500', color: '#1a1a1a' },
  cfLbl: { fontSize: 10, color: '#bbb', marginTop: 1 },
  planRow: {
    paddingHorizontal: 18, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8',
  },
  planName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  planAgents: { fontSize: 10, color: '#999', marginTop: 2 },
  planBarWrap: { flex: 1, height: 5, backgroundColor: '#f0f0f0', borderRadius: 3 },
  planBar: { height: 5, borderRadius: 3, backgroundColor: '#534AB7' },
  planRevenue: { fontSize: 13, fontWeight: '500', color: '#534AB7', width: 60, textAlign: 'right' },
  tableHead: {
    flexDirection: 'row', backgroundColor: '#fafafa',
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  th: {
    fontSize: 11, fontWeight: '500', color: '#999',
    padding: 10, paddingHorizontal: 18,
  },
  tableRow: {
    flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8',
  },
  td: { padding: 11, paddingHorizontal: 18, justifyContent: 'center' },
  tdText: { fontSize: 13, color: '#1a1a1a' },
  agentCell: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  av: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  avText: { fontSize: 10, fontWeight: '500' },
  agentName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  agentEmail: { fontSize: 11, color: '#bbb' },
  tag: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  tagText: { fontSize: 10, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 },
});
