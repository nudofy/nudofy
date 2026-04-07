// ADM-04 · Gestión de planes
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AdminShell from '@/components/AdminShell';
import { useAdminAgents } from '@/hooks/useAdmin';

const PLANS = [
  {
    key: 'basic',
    label: 'Básico',
    price: 9,
    badgeBg: '#F1EFE8', badgeText: '#5F5E5A',
    limits: [
      { label: 'Clientes', value: '50', pct: 40 },
      { label: 'Catálogos', value: '5', pct: 20 },
      { label: 'Pedidos/mes', value: '100', pct: 30 },
    ],
    features: [
      { label: 'Portal del cliente', ok: false },
      { label: 'Estadísticas básicas', ok: true },
      { label: 'Exportación CSV', ok: false },
      { label: 'Soporte email', ok: true },
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: 19,
    featured: true,
    badgeBg: '#EEEDFE', badgeText: '#3C3489',
    limits: [
      { label: 'Clientes', value: '500', pct: 70 },
      { label: 'Catálogos', value: '30', pct: 60 },
      { label: 'Pedidos/mes', value: '1.000', pct: 65 },
    ],
    features: [
      { label: 'Portal del cliente', ok: true },
      { label: 'Estadísticas avanzadas', ok: true },
      { label: 'Exportación CSV', ok: true },
      { label: 'Soporte prioritario', ok: true },
    ],
  },
  {
    key: 'agency',
    label: 'Agencia',
    price: 39,
    badgeBg: '#E6F1FB', badgeText: '#0C447C',
    limits: [
      { label: 'Agentes incluidos', value: '5', pct: 50 },
      { label: 'Clientes', value: 'Ilimitados', pct: 100, unlimited: true },
      { label: 'Catálogos', value: 'Ilimitados', pct: 100, unlimited: true },
    ],
    features: [
      { label: 'Panel empresa multi-agente', ok: true },
      { label: 'Estadísticas consolidadas', ok: true },
      { label: 'API acceso', ok: true },
      { label: 'Soporte dedicado', ok: true },
    ],
  },
  {
    key: 'agency_pro',
    label: 'Agencia Pro',
    price: 79,
    enterprise: true,
    badgeBg: '#042C53', badgeText: '#85B7EB',
    limits: [
      { label: 'Agentes incluidos', value: '20', pct: 100 },
      { label: 'Clientes', value: 'Ilimitados', pct: 100, unlimited: true },
      { label: 'Catálogos', value: 'Ilimitados', pct: 100, unlimited: true },
    ],
    features: [
      { label: 'Todo de Agencia', ok: true },
      { label: 'Onboarding personalizado', ok: true },
      { label: 'SLA garantizado', ok: true },
      { label: 'Account manager', ok: true },
    ],
  },
];

export default function AdminPlanesScreen() {
  const { agents } = useAdminAgents();

  function agentCount(planKey: string) {
    return agents.filter(a => a.plan === planKey && a.active).length;
  }

  function planRevenue(planKey: string, price: number) {
    return agentCount(planKey) * price;
  }

  return (
    <AdminShell activeSection="planes" title="Planes">
      {/* Banner aviso */}
      {agents.filter(a => !a.active).length > 0 && (
        <View style={styles.warningBanner}>
          <View style={styles.wbIcon}>
            <Text style={styles.wbIconText}>⚠</Text>
          </View>
          <View style={styles.wbBody}>
            <Text style={styles.wbTitle}>Pagos pendientes</Text>
            <Text style={styles.wbText}>
              {agents.filter(a => !a.active).length} agentes con cuenta inactiva. Revisa facturación.
            </Text>
          </View>
        </View>
      )}

      {/* Grid de planes */}
      <View style={styles.plansGrid}>
        {PLANS.map(plan => {
          const count = agentCount(plan.key);
          const rev = planRevenue(plan.key, plan.price);
          return (
            <View
              key={plan.key}
              style={[
                styles.planCard,
                plan.featured && styles.planCardFeatured,
                plan.enterprise && styles.planCardEnterprise,
              ]}
            >
              {/* Header */}
              <View style={styles.planHeader}>
                <View style={[styles.planBadge, { backgroundColor: plan.badgeBg }]}>
                  <Text style={[styles.planBadgeText, { color: plan.badgeText }]}>{plan.label}</Text>
                </View>
                <Text style={styles.planName}>{plan.label}</Text>
                <Text style={styles.planPrice}>
                  {plan.price} <Text style={styles.planPriceSub}>€/mes</Text>
                </Text>
                <Text style={styles.planAgentsCount}>{count} agentes activos</Text>
              </View>

              {/* Límites */}
              <View style={styles.planLimits}>
                {plan.limits.map(l => (
                  <View key={l.label} style={styles.limitRow}>
                    <Text style={styles.limitLabel}>{l.label}</Text>
                    {!l.unlimited ? (
                      <>
                        <View style={styles.limitBarWrap}>
                          <View style={[styles.limitBar, { width: `${l.pct}%` as any }]} />
                        </View>
                        <Text style={styles.limitValue}>{l.value}</Text>
                      </>
                    ) : (
                      <Text style={styles.limitUnlimited}>Ilimitado</Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Features */}
              <View style={styles.planFeatures}>
                {plan.features.map(f => (
                  <View key={f.label} style={styles.featureRow}>
                    <View style={[styles.featureIcon, f.ok ? styles.featureIconOk : styles.featureIconNo]}>
                      <Text style={styles.featureIconText}>{f.ok ? '✓' : '✕'}</Text>
                    </View>
                    <Text style={[styles.featureLabel, !f.ok && styles.featureLabelNo]}>{f.label}</Text>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.planFooter}>
                <TouchableOpacity style={styles.planEditBtn}>
                  <Text style={styles.planEditBtnText}>Editar plan</Text>
                </TouchableOpacity>
                <View>
                  <Text style={styles.planRevenue}>{rev} €/mes</Text>
                  <Text style={styles.planStatsLabel}>{count} agentes</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  warningBanner: {
    backgroundColor: '#FAEEDA', borderRadius: 12,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  wbIcon: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: '#BA7517',
    alignItems: 'center', justifyContent: 'center',
  },
  wbIconText: { color: '#fff', fontSize: 16 },
  wbBody: { flex: 1 },
  wbTitle: { fontSize: 13, fontWeight: '600', color: '#633806' },
  wbText: { fontSize: 12, color: '#854F0B', marginTop: 2 },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  planCard: {
    flex: 1, minWidth: 240,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  planCardFeatured: { borderColor: '#534AB7' },
  planCardEnterprise: { borderColor: '#185FA5' },
  planHeader: {
    padding: 18, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  planBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 6, alignSelf: 'flex-start', marginBottom: 10,
  },
  planBadgeText: { fontSize: 10, fontWeight: '500' },
  planName: { fontSize: 17, fontWeight: '500', color: '#1a1a1a' },
  planPrice: { fontSize: 26, fontWeight: '500', color: '#534AB7', marginTop: 6 },
  planPriceSub: { fontSize: 13, color: '#999', fontWeight: '400' },
  planAgentsCount: { fontSize: 12, color: '#bbb', marginTop: 4 },
  planLimits: {
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0', gap: 8,
  },
  limitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  limitLabel: { fontSize: 11, color: '#999', width: 90 },
  limitBarWrap: { flex: 1, height: 4, backgroundColor: '#f0f0f0', borderRadius: 2 },
  limitBar: { height: 4, borderRadius: 2, backgroundColor: '#534AB7' },
  limitValue: { fontSize: 11, fontWeight: '500', color: '#1a1a1a', width: 50, textAlign: 'right' },
  limitUnlimited: { fontSize: 11, fontWeight: '500', color: '#1D9E75', flex: 1 },
  planFeatures: { padding: 14, flex: 1, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureIcon: {
    width: 15, height: 15, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  featureIconOk: { backgroundColor: '#EAF3DE' },
  featureIconNo: { backgroundColor: '#f5f5f3' },
  featureIconText: { fontSize: 9, fontWeight: '700', color: '#3B6D11' },
  featureLabel: { fontSize: 12, color: '#444', flex: 1 },
  featureLabelNo: { color: '#bbb' },
  planFooter: {
    padding: 14,
    borderTopWidth: 0.5, borderTopColor: '#f0f0f0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  planEditBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff',
  },
  planEditBtnText: { fontSize: 12, fontWeight: '500', color: '#534AB7' },
  planRevenue: { fontSize: 13, fontWeight: '600', color: '#534AB7', textAlign: 'right' },
  planStatsLabel: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: 1 },
});
