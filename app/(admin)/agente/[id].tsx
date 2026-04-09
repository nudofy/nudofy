// ADM-03 · Ficha de agente
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { useAdminAgentDetail, useAdminAgents } from '@/hooks/useAdmin';
import type { AdminAgent } from '@/hooks/useAdmin';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

const PLAN_META: Record<string, { bg: string; text: string; label: string; price: string; free?: boolean }> = {
  free:        { bg: '#E6F7EF', text: '#1D7A4E', label: 'Free',         price: 'Gratis',   free: true },
  free_pro:    { bg: '#E6F7EF', text: '#1D7A4E', label: 'Free Pro',     price: 'Gratis',   free: true },
  basic:       { bg: '#F1EFE8', text: '#5F5E5A', label: 'Básico',       price: '9 €/mes'  },
  pro:         { bg: '#EEEDFE', text: '#3C3489', label: 'Pro',           price: '19 €/mes' },
  agency:      { bg: '#E6F1FB', text: '#0C447C', label: 'Agencia',       price: '39 €/mes' },
  agency_pro:  { bg: '#042C53', text: '#85B7EB', label: 'Agencia Pro',   price: '79 €/mes' },
};

const PLANS = ['free', 'free_pro', 'basic', 'pro', 'agency', 'agency_pro'] as const;

const DURATIONS = [
  { label: '15 días', days: 15 },
  { label: '1 mes',   days: 30 },
  { label: 'Ilimitado', days: null },
];

export default function AdminAgenteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agent, clientCount, orderCount, supplierCount, loading } = useAdminAgentDetail(id);
  const { updateAgentPlan, toggleAgentActive } = useAdminAgents();
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number] | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(30);

  if (loading || !agent) {
    return (
      <AdminShell activeSection="agentes" title="Cargando...">
        <Text style={styles.emptyText}>Cargando agente...</Text>
      </AdminShell>
    );
  }

  const plan = PLAN_META[agent.plan] ?? PLAN_META.basic;
  const initials = agent.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  function handleSelectPlan(newPlan: typeof PLANS[number]) {
    setSelectedPlan(newPlan);
    setSelectedDuration(PLAN_META[newPlan].free ? 30 : null);
  }

  async function confirmPlanChange() {
    if (!selectedPlan) return;
    const pm = PLAN_META[selectedPlan];
    let expiresAt: string | null = null;
    if (pm.free && selectedDuration !== null) {
      const d = new Date();
      d.setDate(d.getDate() + selectedDuration);
      expiresAt = d.toISOString();
    }
    await updateAgentPlan(agent!.id, selectedPlan, expiresAt);
    setChangingPlan(false);
    setSelectedPlan(null);
  }

  function handleToggleActive() {
    Alert.alert(
      agent!.active ? 'Desactivar agente' : 'Activar agente',
      `¿${agent!.active ? 'Desactivar' : 'Activar'} la cuenta de ${agent!.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: agent!.active ? 'Desactivar' : 'Activar',
          style: agent!.active ? 'destructive' : 'default',
          onPress: () => toggleAgentActive(agent!.id, !agent!.active),
        },
      ]
    );
  }

  return (
    <AdminShell activeSection="agentes" title={agent.name}>
      {/* Cabecera del agente */}
      <View style={styles.agentHeader}>
        <View style={styles.agentAv}>
          <Text style={styles.agentAvText}>{initials}</Text>
        </View>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentContact}>{agent.email}{agent.phone ? ` · ${agent.phone}` : ''}</Text>
          <View style={styles.agentMeta}>
            <View style={[styles.tag, { backgroundColor: plan.bg }]}>
              <Text style={[styles.tagText, { color: plan.text }]}>{plan.label}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: agent.active ? '#EAF3DE' : '#F1EFE8' }]}>
              <Text style={[styles.tagText, { color: agent.active ? '#3B6D11' : '#888' }]}>
                {agent.active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            <Text style={styles.metaTxt}>Alta: {formatDate(agent.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiMini label="Clientes" value={clientCount.toString()} />
        <KpiMini label="Pedidos totales" value={orderCount.toString()} />
        <KpiMini label="Proveedores" value={supplierCount.toString()} />
        <KpiMini label="Plan actual" value={plan.price} />
      </View>

      {/* Datos + Plan */}
      <View style={styles.rowCards}>
        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Datos del agente</Text>
          </View>
          <FieldRow label="Nombre" value={agent.name} />
          <FieldRow label="Email" value={agent.email} />
          <FieldRow label="Teléfono" value={agent.phone ?? '—'} />
          <FieldRow label="ID" value={agent.id} mono />
          <FieldRow label="Usuario ID" value={agent.user_id} mono />
        </View>

        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Plan actual</Text>
            <TouchableOpacity onPress={() => setChangingPlan(!changingPlan)}>
              <Text style={styles.cardEdit}>Cambiar plan</Text>
            </TouchableOpacity>
          </View>
          <FieldRow label="Plan" value={plan.label} highlight />
          <FieldRow label="Precio" value={plan.price} />
          <FieldRow label="Estado pago" value="Al día" />

          {changingPlan && (
            <View style={styles.planSelector}>
              {PLANS.map(p => {
                const pm = PLAN_META[p];
                const isActive = p === agent.plan;
                const isSelected = p === selectedPlan;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.planOpt, isActive && styles.planOptActive, isSelected && styles.planOptSelected]}
                    onPress={() => handleSelectPlan(p)}
                  >
                    <Text style={[styles.planOptName, (isActive || isSelected) && styles.planOptNameSelected]}>
                      {pm.label}
                    </Text>
                    <Text style={styles.planOptPrice}>{pm.price}</Text>
                    {isActive && <Text style={styles.planOptCurrent}>actual</Text>}
                  </TouchableOpacity>
                );
              })}

              {/* Selector de duración para planes free */}
              {selectedPlan && PLAN_META[selectedPlan].free && (
                <View style={styles.durationWrap}>
                  <Text style={styles.durationTitle}>Duración del acceso gratuito</Text>
                  <View style={styles.durationRow}>
                    {DURATIONS.map(d => (
                      <TouchableOpacity
                        key={d.label}
                        style={[styles.durationOpt, selectedDuration === d.days && styles.durationOptSelected]}
                        onPress={() => setSelectedDuration(d.days)}
                      >
                        <Text style={[styles.durationOptText, selectedDuration === d.days && styles.durationOptTextSelected]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Botón confirmar */}
              {selectedPlan && (
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmPlanChange}>
                  <Text style={styles.confirmBtnText}>
                    Confirmar — {PLAN_META[selectedPlan].label}
                    {PLAN_META[selectedPlan].free && selectedDuration
                      ? ` (${DURATIONS.find(d => d.days === selectedDuration)?.label})`
                      : PLAN_META[selectedPlan].free ? ' (Ilimitado)' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Acciones peligrosas */}
      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Acciones de cuenta</Text>
        <View style={styles.dangerActions}>
          <TouchableOpacity
            style={[styles.dangerBtn, agent.active ? styles.dangerBtnDestructive : styles.dangerBtnSuccess]}
            onPress={handleToggleActive}
          >
            <Text style={[styles.dangerBtnText, agent.active ? styles.dangerBtnTextRed : styles.dangerBtnTextGreen]}>
              {agent.active ? 'Desactivar cuenta' : 'Activar cuenta'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>Ver pedidos</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AdminShell>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiMini}>
      <Text style={styles.kpiMiniLabel}>{label}</Text>
      <Text style={styles.kpiMiniValue}>{value}</Text>
    </View>
  );
}

function FieldRow({ label, value, mono, highlight }: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.fieldMono, highlight && styles.fieldHighlight]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 },
  agentHeader: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8',
    padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 16,
    flexWrap: 'wrap',
  },
  agentAv: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#EEEDFE',
    alignItems: 'center', justifyContent: 'center',
  },
  agentAvText: { fontSize: 17, fontWeight: '500', color: '#3C3489' },
  agentInfo: { flex: 1, minWidth: 180 },
  agentName: { fontSize: 17, fontWeight: '500', color: '#1a1a1a' },
  agentContact: { fontSize: 12, color: '#999', marginTop: 3 },
  agentMeta: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' },
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '500' },
  metaTxt: { fontSize: 11, color: '#bbb' },
  kpiGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  kpiMini: {
    flex: 1, minWidth: 120,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 0.5, borderColor: '#e8e8e8',
    padding: 13, paddingHorizontal: 16,
  },
  kpiMiniLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  kpiMiniValue: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
  rowCards: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8',
    overflow: 'hidden', minWidth: 260,
  },
  cardHeader: {
    padding: 13, paddingHorizontal: 18,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  cardEdit: { fontSize: 12, color: '#534AB7' },
  fieldRow: {
    paddingHorizontal: 18, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8', gap: 12,
  },
  fieldLabel: { fontSize: 12, color: '#bbb', flexShrink: 0 },
  fieldValue: { fontSize: 12, fontWeight: '500', color: '#1a1a1a', textAlign: 'right', flex: 1 },
  fieldMono: { fontSize: 10, color: '#999' },
  fieldHighlight: { color: '#534AB7' },
  planSelector: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14,
  },
  planOpt: {
    flex: 1, minWidth: '45%',
    borderWidth: 1.5, borderColor: '#e8e8e8',
    borderRadius: 10, padding: 10,
  },
  planOptActive: { borderColor: '#ccc', backgroundColor: '#fafafa' },
  planOptSelected: { borderColor: '#534AB7', backgroundColor: '#EEEDFE' },
  planOptName: { fontSize: 12, fontWeight: '500', color: '#1a1a1a' },
  planOptNameSelected: { color: '#3C3489' },
  planOptPrice: { fontSize: 11, color: '#999', marginTop: 2 },
  planOptCurrent: { fontSize: 9, color: '#999', marginTop: 2 },
  durationWrap: { width: '100%', marginTop: 4 },
  durationTitle: { fontSize: 12, color: '#666', marginBottom: 8 },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationOpt: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center',
  },
  durationOptSelected: { borderColor: '#534AB7', backgroundColor: '#EEEDFE' },
  durationOptText: { fontSize: 12, color: '#555' },
  durationOptTextSelected: { color: '#3C3489', fontWeight: '600' },
  confirmBtn: {
    width: '100%', paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#534AB7', alignItems: 'center', marginTop: 4,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  dangerCard: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8',
    padding: 16, gap: 12,
  },
  dangerTitle: { fontSize: 13, fontWeight: '500', color: '#555' },
  dangerActions: { flexDirection: 'row', gap: 8 },
  dangerBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 9, borderWidth: 1, borderColor: '#e8e8e8', backgroundColor: '#fff',
  },
  dangerBtnDestructive: { borderColor: '#F09595' },
  dangerBtnSuccess: { borderColor: '#A8DFC9' },
  dangerBtnText: { fontSize: 12, fontWeight: '500', color: '#555' },
  dangerBtnTextRed: { color: '#A32D2D' },
  dangerBtnTextGreen: { color: '#1D9E75' },
});
