// Panel de Analítica para Agente — V1: "Mi cartera"
// Ranking de clientes por facturación + alerta de riesgo de fuga + lista de acción semanal.
// Ver docs/nudofy-panel-analitica-spec.txt
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { useAgentContext } from '@/contexts/AgentContext';
import {
  useClientMetrics, buildPriorityList, getRiskLevel, revenueVariationPct, riskReasonLabel, DEFAULT_RISK_MULTIPLIER,
} from '@/hooks/useAgentAnalytics';
import type { ClientMetric, RiskLevel } from '@/hooks/useAgentAnalytics';

type Sort = 'revenue' | 'risk' | 'ticket';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function normalizePhoneForWhatsApp(raw: string): string {
  const startsWithPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (startsWithPlus || digits.length >= 10) return digits;
  if (digits.length === 9) return '34' + digits;
  return digits;
}

const RISK_META: Record<RiskLevel, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  al_dia: { label: 'Al día', variant: 'success' },
  atencion: { label: 'Atención', variant: 'warning' },
  riesgo: { label: 'Riesgo de fuga', variant: 'danger' },
  sin_historico: { label: 'Sin histórico', variant: 'neutral' },
};

const RISK_WEIGHT: Record<RiskLevel, number> = { riesgo: 3, atencion: 2, sin_historico: 0, al_dia: 0 };

export default function AnaliticaScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const toast = useToast();
  const { agent } = useAgentContext();
  const { metrics, loading } = useClientMetrics();
  const [sort, setSort] = useState<Sort>('revenue');
  const riskMultiplier = agent?.risk_multiplier ?? DEFAULT_RISK_MULTIPLIER;

  const totalRevenue = useMemo(() => metrics.reduce((s, m) => s + m.total_revenue_period, 0), [metrics]);
  const totalRevenuePrev = useMemo(() => metrics.reduce((s, m) => s + m.total_revenue_prev_period, 0), [metrics]);
  const variation = totalRevenuePrev > 0 ? ((totalRevenue - totalRevenuePrev) / totalRevenuePrev) * 100 : null;

  const priorityList = useMemo(() => buildPriorityList(metrics, riskMultiplier, 5), [metrics, riskMultiplier]);

  const ranking = useMemo(() => {
    const list = [...metrics].filter(m => m.total_orders > 0);
    if (sort === 'revenue') return list.sort((a, b) => b.total_revenue_period - a.total_revenue_period);
    if (sort === 'ticket') return list.sort((a, b) => (b.avg_ticket ?? 0) - (a.avg_ticket ?? 0));
    return list.sort((a, b) => {
      const w = RISK_WEIGHT[getRiskLevel(b, riskMultiplier)] - RISK_WEIGHT[getRiskLevel(a, riskMultiplier)];
      return w !== 0 ? w : b.total_revenue_period - a.total_revenue_period;
    });
  }, [metrics, sort, riskMultiplier]);

  async function callClient(phone?: string | null) {
    if (!phone) { toast.error('Este cliente no tiene teléfono guardado'); return; }
    const url = `tel:${phone.replace(/\s/g, '')}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) { toast.error('No se pudo abrir el marcador'); return; }
    await Linking.openURL(url);
  }

  async function whatsappClient(phone?: string | null, name?: string) {
    if (!phone) { toast.error('Este cliente no tiene teléfono guardado'); return; }
    const url = `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(`Hola ${name ?? ''}, `.trim() + ' ')}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) { toast.error('No se pudo abrir WhatsApp'); return; }
    await Linking.openURL(url);
  }

  return (
    <Screen>
      <TopBar title="Mi cartera" onBack={() => goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Resumen */}
        <View style={styles.summaryCard}>
          <Text variant="caption" color="ink3">Facturación cartera · últimos 12 meses</Text>
          <Text variant="heading" style={{ marginTop: 4 }}>{formatEur(totalRevenue)}</Text>
          {variation !== null && (
            <View style={styles.variationRow}>
              <Icon name={variation >= 0 ? 'TrendingUp' : 'TrendingDown'} size={14} color={variation >= 0 ? colors.success : colors.danger} />
              <Text variant="caption" color={variation >= 0 ? 'success' : 'danger'}>
                {variation >= 0 ? '+' : ''}{variation.toFixed(1)}% vs periodo anterior
              </Text>
            </View>
          )}
        </View>

        {/* Lista de acción priorizada */}
        <View style={styles.section}>
          <Text variant="bodyMedium" style={{ paddingHorizontal: space[1] }}>Contactar esta semana</Text>
          {loading ? (
            <Text variant="small" color="ink3" align="center" style={styles.empty}>Cargando...</Text>
          ) : priorityList.filter(m => getRiskLevel(m, riskMultiplier) !== 'al_dia').length === 0 ? (
            <View style={styles.card}>
              <Text variant="small" color="ink3" align="center">Ningún cliente en riesgo ahora mismo</Text>
            </View>
          ) : (
            priorityList.filter(m => getRiskLevel(m, riskMultiplier) !== 'al_dia').map(m => (
              <PriorityCard
                key={m.client_id}
                metric={m}
                riskMultiplier={riskMultiplier}
                onPress={() => router.push(`/(agent)/cliente/${m.client_id}` as any)}
                onCall={() => callClient(m.phone)}
                onWhatsApp={() => whatsappClient(m.phone, m.name)}
              />
            ))
          )}
        </View>

        {/* Acceso al ranking de productos */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.linkCard, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(agent)/analitica-productos' as any)}
        >
          <Icon name="Package" size={18} color={colors.ink2} />
          <Text variant="bodyMedium" style={{ flex: 1 }}>Ranking de productos</Text>
          <Icon name="ChevronRight" size={18} color={colors.ink4} />
        </Pressable>

        {/* Ranking completo */}
        <View style={styles.section}>
          <View style={styles.sortRow}>
            <Text variant="bodyMedium">Ranking de clientes</Text>
            <View style={styles.sortTabs}>
              <SortChip label="Facturación" active={sort === 'revenue'} onPress={() => setSort('revenue')} />
              <SortChip label="Riesgo" active={sort === 'risk'} onPress={() => setSort('risk')} />
              <SortChip label="Ticket" active={sort === 'ticket'} onPress={() => setSort('ticket')} />
            </View>
          </View>

          <View style={styles.card}>
            {loading ? (
              <Text variant="small" color="ink3" align="center">Cargando...</Text>
            ) : ranking.length === 0 ? (
              <Text variant="small" color="ink3" align="center">Sin clientes con pedidos todavía</Text>
            ) : (
              ranking.map((m, i) => (
                <RankRow
                  key={m.client_id}
                  metric={m}
                  riskMultiplier={riskMultiplier}
                  isLast={i === ranking.length - 1}
                  onPress={() => router.push(`/(agent)/cliente/${m.client_id}` as any)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function PriorityCard({ metric, riskMultiplier, onPress, onCall, onWhatsApp }: {
  metric: ClientMetric; riskMultiplier: number; onPress: () => void; onCall: () => void; onWhatsApp: () => void;
}) {
  const risk = getRiskLevel(metric, riskMultiplier);
  const meta = RISK_META[risk];
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <View style={styles.priorityHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium">{metric.name}</Text>
          <Text variant="caption" color="ink3">{riskReasonLabel(metric)}</Text>
        </View>
        <Badge label={meta.label} variant={meta.variant} />
      </View>
      <View style={styles.priorityActions}>
        <QuickAction icon="Phone" label="Llamar" onPress={onCall} />
        <QuickAction icon="MessageCircle" label="WhatsApp" onPress={onWhatsApp} />
      </View>
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.quickAction, pressed && { backgroundColor: colors.surface2 }]} onPress={onPress}>
      <Icon name={icon} size={16} color={colors.ink2} />
      <Text variant="smallMedium">{label}</Text>
    </Pressable>
  );
}

function SortChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text variant="caption" color={active ? 'white' : 'ink2'}>{label}</Text>
    </Pressable>
  );
}

function RankRow({ metric, riskMultiplier, isLast, onPress }: { metric: ClientMetric; riskMultiplier: number; isLast: boolean; onPress: () => void }) {
  const risk = getRiskLevel(metric, riskMultiplier);
  const meta = RISK_META[risk];
  const variation = revenueVariationPct(metric);
  return (
    <Pressable
      style={({ pressed }) => [styles.rankRow, !isLast && styles.rankRowBorder, pressed && { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallMedium">{metric.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Badge label={meta.label} variant={meta.variant} />
          {variation !== null && (
            <Text variant="caption" color={variation >= 0 ? 'success' : 'danger'}>
              {variation >= 0 ? '+' : ''}{variation.toFixed(0)}%
            </Text>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="bodyMedium">{formatEur(metric.total_revenue_period)}</Text>
        {metric.avg_ticket != null && (
          <Text variant="caption" color="ink3">ticket {formatEur(metric.avg_ticket)}</Text>
        )}
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
    borderWidth: 1, borderColor: colors.line,
  },
  variationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },

  section: { gap: space[2] },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

  priorityHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  priorityActions: { flexDirection: 'row', gap: space[2] },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  quickAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: space[2],
    borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.line,
  },

  sortRow: { gap: space[2], paddingHorizontal: space[1] },
  sortTabs: { flexDirection: 'row', gap: space[1] },
  chip: {
    paddingHorizontal: space[2] + 2, paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  chipActive: { backgroundColor: colors.ink },

  rankRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: space[2],
  },
  rankRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },

  empty: { paddingVertical: space[6] },
});
