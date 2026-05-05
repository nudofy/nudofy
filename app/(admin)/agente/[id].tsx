// ADM-03 · Ficha de agente
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { useAdminAgentDetail, useAdminAgents } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

const PLAN_META: Record<string, { label: string; price: string; free?: boolean }> = {
  free:        { label: 'Free',         price: 'Gratis',   free: true },
  free_pro:    { label: 'Free Pro',     price: 'Gratis',   free: true },
  basic:       { label: 'Básico',       price: '9 €/mes'  },
  pro:         { label: 'Pro',           price: '19 €/mes' },
  agency:      { label: 'Agencia',       price: '39 €/mes' },
  agency_pro:  { label: 'Agencia Pro',   price: '79 €/mes' },
};

const PLANS = ['free', 'free_pro', 'basic', 'pro', 'agency', 'agency_pro'] as const;

const DURATIONS = [
  { label: '15 días', days: 15 },
  { label: '1 mes',   days: 30 },
  { label: 'Ilimitado', days: null },
];

export default function AdminAgenteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { agent, clientCount, orderCount, supplierCount, loading, refetch } = useAdminAgentDetail(id);
  const { updateAgentPlan, toggleAgentActive, updateAgentData } = useAdminAgents();
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number] | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(30);

  // Edición de datos
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agent) {
      setEditName(agent.name ?? '');
      setEditPhone(agent.phone ?? '');
    }
  }, [agent]);

  async function handleSaveData() {
    if (!agent) return;
    setSaving(true);
    const { error } = await updateAgentData(agent.id, {
      name: editName.trim(),
      phone: editPhone.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success('Agente actualizado');
    setEditing(false);
    refetch?.();
  }

  if (loading || !agent) {
    return (
      <AdminShell activeSection="agentes" title="Cargando..." onBack={() => router.back()}>
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          Cargando agente...
        </Text>
      </AdminShell>
    );
  }

  const plan = PLAN_META[agent.plan] ?? PLAN_META.basic;

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
    <AdminShell activeSection="agentes" title={agent.name} onBack={() => router.back()}>
      {/* Cabecera */}
      <View style={styles.agentHeader}>
        <Avatar name={agent.name} size={56} fontSize={20} />
        <View style={{ flex: 1, minWidth: 180, gap: 4 }}>
          <Text variant="heading">{agent.name}</Text>
          <Text variant="caption" color="ink3">
            {agent.email}{agent.phone ? ` · ${agent.phone}` : ''}
          </Text>
          <View style={styles.agentMeta}>
            <Badge label={plan.label} variant="neutral" />
            <Badge label={agent.active ? 'Activo' : 'Inactivo'} variant={agent.active ? 'success' : 'neutral'} />
            <Text variant="caption" color="ink4">Alta: {formatDate(agent.created_at)}</Text>
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
            <Text variant="bodyMedium">Datos del agente</Text>
            <Pressable
              onPress={() => editing ? handleSaveData() : setEditing(true)}
              hitSlop={8}
              disabled={saving}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text variant="smallMedium" color="ink2">
                {saving ? 'Guardando...' : editing ? 'Guardar' : 'Editar'}
              </Text>
            </Pressable>
          </View>
          {editing ? (
            <View>
              <EditField label="Nombre" value={editName} onChange={setEditName} />
              <EditField label="Email" value={agent.email} editable={false} />
              <EditField label="Teléfono" value={editPhone} onChange={setEditPhone} keyboardType="phone-pad" last />
            </View>
          ) : (
            <View>
              <FieldRow label="Nombre" value={agent.name} />
              <FieldRow label="Email" value={agent.email} />
              <FieldRow label="Teléfono" value={agent.phone ?? '—'} />
              <FieldRow label="ID" value={agent.id} mono />
              <FieldRow label="Usuario ID" value={agent.user_id} mono last />
            </View>
          )}
          {editing && (
            <View style={{ padding: space[3], paddingTop: 0 }}>
              <Pressable onPress={() => setEditing(false)} hitSlop={8}>
                <Text variant="small" color="ink3" align="center">Cancelar</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">Plan actual</Text>
            <Pressable
              onPress={() => setChangingPlan(!changingPlan)}
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text variant="smallMedium" color="ink2">
                {changingPlan ? 'Cancelar' : 'Cambiar plan'}
              </Text>
            </Pressable>
          </View>
          <FieldRow label="Plan" value={plan.label} />
          <FieldRow label="Precio" value={plan.price} />
          <FieldRow label="Estado pago" value="Al día" last />

          {changingPlan && (
            <View style={styles.planSelector}>
              {PLANS.map(p => {
                const pm = PLAN_META[p];
                const isActive = p === agent.plan;
                const isSelected = p === selectedPlan;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.planOpt,
                      isActive && styles.planOptActive,
                      isSelected && styles.planOptSelected,
                    ]}
                    onPress={() => handleSelectPlan(p)}
                  >
                    <Text variant="smallMedium">{pm.label}</Text>
                    <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{pm.price}</Text>
                    {isActive && (
                      <Text variant="caption" color="ink4" style={{ marginTop: 2 }}>actual</Text>
                    )}
                  </Pressable>
                );
              })}

              {selectedPlan && PLAN_META[selectedPlan].free && (
                <View style={{ width: '100%', marginTop: space[1] }}>
                  <Text variant="small" color="ink2" style={{ marginBottom: space[2] }}>
                    Duración del acceso gratuito
                  </Text>
                  <View style={styles.durationRow}>
                    {DURATIONS.map(d => (
                      <Pressable
                        key={d.label}
                        style={[styles.durationOpt, selectedDuration === d.days && styles.durationOptSelected]}
                        onPress={() => setSelectedDuration(d.days)}
                      >
                        <Text
                          variant="smallMedium"
                          style={{ color: selectedDuration === d.days ? colors.white : colors.ink2 }}
                        >
                          {d.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {selectedPlan && (
                <View style={{ width: '100%', marginTop: space[2] }}>
                  <Button
                    label={`Confirmar — ${PLAN_META[selectedPlan].label}${
                      PLAN_META[selectedPlan].free && selectedDuration
                        ? ` (${DURATIONS.find(d => d.days === selectedDuration)?.label})`
                        : PLAN_META[selectedPlan].free ? ' (Ilimitado)' : ''
                    }`}
                    onPress={confirmPlanChange}
                    fullWidth
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.dangerCard}>
        <Text variant="caption" color="ink3" style={styles.dangerTitle}>
          ACCIONES DE CUENTA
        </Text>
        <View style={styles.dangerActions}>
          <Button
            label={agent.active ? 'Desactivar cuenta' : 'Activar cuenta'}
            variant="secondary"
            onPress={handleToggleActive}
          />
          <Button label="Ver pedidos" variant="secondary" onPress={() => router.push(`/(admin)/agente/${agent.id}/pedidos` as any)} />
        </View>
      </View>
    </AdminShell>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiMini}>
      <Text variant="caption" color="ink3">{label}</Text>
      <Text variant="heading" style={{ marginTop: space[1] }}>{value}</Text>
    </View>
  );
}

function FieldRow({ label, value, mono, last }: {
  label: string; value: string; mono?: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text variant="small" color="ink3">{label}</Text>
      <Text
        variant={mono ? 'caption' : 'smallMedium'}
        color={mono ? 'ink3' : 'ink'}
        style={{ textAlign: 'right', flex: 1 }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function EditField({ label, value, onChange, editable = true, keyboardType, last }: {
  label: string; value: string; onChange?: (v: string) => void;
  editable?: boolean; keyboardType?: any; last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text variant="small" color="ink3" style={{ minWidth: 72 }}>{label}</Text>
      <TextInput
        style={[styles.editInput, !editable && { color: colors.ink3 }]}
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType={keyboardType}
        placeholderTextColor={colors.ink4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: { paddingVertical: space[6] },

  agentHeader: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[4],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
    flexWrap: 'wrap',
  },
  agentMeta: {
    flexDirection: 'row', gap: space[2], marginTop: space[2],
    flexWrap: 'wrap', alignItems: 'center',
  },

  kpiGrid: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  kpiMini: {
    flex: 1, minWidth: 130,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
  },

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

  fieldRow: {
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    flexDirection: 'row', alignItems: 'center', gap: space[3],
  },
  fieldRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },

  editInput: {
    flex: 1, textAlign: 'right',
    fontSize: 13, fontWeight: '500', color: colors.ink,
    paddingVertical: 2,
  },

  planSelector: {
    flexDirection: 'row', flexWrap: 'wrap', gap: space[2],
    padding: space[3],
  },
  planOpt: {
    flex: 1, minWidth: '45%',
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    padding: space[3],
    backgroundColor: colors.white,
  },
  planOptActive: { backgroundColor: colors.surface2 },
  planOptSelected: { borderColor: colors.ink, borderWidth: 2 },

  durationRow: { flexDirection: 'row', gap: space[2] },
  durationOpt: {
    flex: 1, paddingVertical: space[2] + 2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  durationOptSelected: { backgroundColor: colors.ink, borderColor: colors.ink },

  dangerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
    gap: space[2],
  },
  dangerTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  dangerActions: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
});
