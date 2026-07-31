// ADM-03 · Ficha de agente
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AdminShell from '@/components/AdminShell';
import { useAdminAgentDetail, useAdminAgents } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { confirmDestructive, confirmAction } from '@/lib/confirm';

const PLANS = ['free', 'free_pro', 'basic', 'pro', 'agency'] as const;

export default function AdminAgenteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation('admin');
  const toast = useToast();

  function formatDate(iso: string) {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  }

  const PLAN_META: Record<string, { label: string; price: string; free?: boolean }> = {
    free:     { label: t('agente_detail.plan_free'),    price: t('agente_detail.free_price'), free: true },
    free_pro: { label: t('agente_detail.plan_free_pro'), price: t('agente_detail.free_price'), free: true },
    basic:    { label: t('shared.plan_basic'), price: '15 €/mes' },
    pro:      { label: t('shared.plan_pro'),   price: '39 €/mes' },
    agency:   { label: t('shared.plan_agency'), price: '89 €/mes' },
  };

  const DURATIONS = [
    { label: t('agente_detail.duration_15'), days: 15 },
    { label: t('agente_detail.duration_1month'), days: 30 },
    { label: t('agente_detail.duration_unlimited'), days: null },
  ];
  const { agent, clientCount, orderCount, supplierCount, loading, refetch } = useAdminAgentDetail(id);
  const { updateAgentPlan, toggleAgentActive, updateAgentData, deleteAgent } = useAdminAgents();
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number] | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(30);

  // Cambiar contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 6) { toast.error(t('agente_detail.min_chars_error')); return; }
    if (newPassword !== confirmPassword) { toast.error(t('agente_detail.passwords_mismatch')); return; }
    if (!agent?.user_id) { toast.error(t('agente_detail.no_user_error')); return; }
    setSavingPassword(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/reset-user-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ user_id: agent.user_id, new_password: newPassword }),
    });
    const json = await res.json();
    setSavingPassword(false);
    if (!res.ok || json.error) { toast.error(json.error ?? t('agente_detail.password_change_error')); return; }
    toast.success(t('agente_detail.password_updated'));
    setShowPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
  }

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
    toast.success(t('agente_detail.agent_updated'));
    setEditing(false);
    refetch?.();
  }

  if (loading || !agent) {
    return (
      <AdminShell activeSection="agentes" title={t('agente_detail.loading_title')} onBack={() => router.back()}>
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          {t('agente_detail.loading_body')}
        </Text>
      </AdminShell>
    );
  }

  const plan = PLAN_META[agent.plan] ?? PLAN_META.basic;

  const trialActive = !!agent.plan_expires_at && new Date(agent.plan_expires_at) > new Date();
  const paymentStatusLabel = trialActive
    ? t('agente_detail.trial_active', {
        count: Math.max(0, Math.ceil((new Date(agent.plan_expires_at!).getTime() - Date.now()) / 86400000)),
        date: formatDate(agent.plan_expires_at!),
      })
    : agent.stripe_subscription_id
      ? t('agente_detail.up_to_date')
      : agent.plan_expires_at
        ? t('agente_detail.trial_expired')
        : t('agente_detail.no_subscription');

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
    const { error } = await updateAgentPlan(agent!.id, selectedPlan, expiresAt);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t('agente_detail.plan_updated'));
    setChangingPlan(false);
    setSelectedPlan(null);
    refetch?.();
  }

  function handleToggleActive() {
    const confirm = agent!.active ? confirmDestructive : confirmAction;
    confirm(
      agent!.active ? t('agente_detail.deactivate_agent_title') : t('agente_detail.activate_agent_title'),
      t('agente_detail.confirm_toggle_account', { action: agent!.active ? t('agente_detail.deactivate') : t('agente_detail.activate'), name: agent!.name }),
      () => toggleAgentActive(agent!.id, !agent!.active),
      agent!.active ? t('agente_detail.deactivate') : t('agente_detail.activate'),
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
            <Badge label={agent.active ? t('shared.active') : t('shared.inactive')} variant={agent.active ? 'success' : 'neutral'} />
            <Text variant="caption" color="ink4">{t('agente_detail.signup_label', { date: formatDate(agent.created_at) })}</Text>
          </View>
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiMini label={t('agente_detail.kpi_clients')} value={clientCount.toString()} />
        <KpiMini label={t('agente_detail.kpi_total_orders')} value={orderCount.toString()} />
        <KpiMini label={t('agente_detail.kpi_suppliers')} value={supplierCount.toString()} />
        <KpiMini label={t('agente_detail.kpi_current_plan')} value={plan.price} />
      </View>

      {/* Datos + Plan */}
      <View style={styles.rowCards}>
        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">{t('agente_detail.agent_data_title')}</Text>
            <Pressable
              onPress={() => editing ? handleSaveData() : setEditing(true)}
              hitSlop={8}
              disabled={saving}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text variant="smallMedium" color="ink2">
                {saving ? t('agente_detail.saving') : editing ? t('agente_detail.save') : t('agente_detail.edit')}
              </Text>
            </Pressable>
          </View>
          {editing ? (
            <View>
              <EditField label={t('agente_detail.name')} value={editName} onChange={setEditName} />
              <EditField label={t('agente_detail.email')} value={agent.email} editable={false} />
              <EditField label={t('agente_detail.phone')} value={editPhone} onChange={setEditPhone} keyboardType="phone-pad" last />
            </View>
          ) : (
            <View>
              <FieldRow label={t('agente_detail.name')} value={agent.name} />
              <FieldRow label={t('agente_detail.email')} value={agent.email} />
              <FieldRow label={t('agente_detail.phone')} value={agent.phone ?? '—'} />
              <FieldRow label={t('agente_detail.id_label')} value={agent.id} mono />
              <FieldRow label={t('agente_detail.user_id_label')} value={agent.user_id} mono last />
            </View>
          )}
          {editing && (
            <View style={{ padding: space[3], paddingTop: 0 }}>
              <Pressable onPress={() => setEditing(false)} hitSlop={8}>
                <Text variant="small" color="ink3" align="center">{t('shared.cancel')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">{t('agente_detail.current_plan_title')}</Text>
            {!agent.company_id && (
              <Pressable
                onPress={() => setChangingPlan(!changingPlan)}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text variant="smallMedium" color="ink2">
                  {changingPlan ? t('shared.cancel') : t('agente_detail.change_plan')}
                </Text>
              </Pressable>
            )}
          </View>
          <FieldRow label={t('agente_detail.plan_label')} value={plan.label} />
          <FieldRow label={t('agente_detail.price_label')} value={plan.price} />
          <FieldRow label={t('agente_detail.payment_status')} value={paymentStatusLabel} last={!agent.company_id} />

          {/* Este agente tiene una empresa 1:1 (toda cuenta Básico/Pro/Agencia
              la tiene) — un trigger de BD (trg_sync_agent_plan) fuerza
              agents.plan a coincidir con companies.plan en cada UPDATE, así
              que cambiarlo aquí directamente no hace nada (revierte en
              silencio). Hay que cambiarlo desde la ficha de la empresa. */}
          {agent.company_id && (
            <View style={{ padding: space[3], paddingTop: space[2] }}>
              <Text variant="small" color="ink3" style={{ marginBottom: space[2] }}>
                {t('agente_detail.plan_managed_by_company')}
              </Text>
              <Button
                label={t('agente_detail.go_to_company')}
                variant="secondary"
                onPress={() => router.push(`/(admin)/empresa/${agent.company_id}` as any)}
              />
            </View>
          )}

          {!agent.company_id && changingPlan && (
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
                      <Text variant="caption" color="ink4" style={{ marginTop: 2 }}>{t('agente_detail.current_badge')}</Text>
                    )}
                  </Pressable>
                );
              })}

              {selectedPlan && PLAN_META[selectedPlan].free && (
                <View style={{ width: '100%', marginTop: space[1] }}>
                  <Text variant="small" color="ink2" style={{ marginBottom: space[2] }}>
                    {t('agente_detail.free_access_duration')}
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
                    label={t('agente_detail.confirm_plan', { plan: `${PLAN_META[selectedPlan].label}${
                      PLAN_META[selectedPlan].free && selectedDuration
                        ? ` (${DURATIONS.find(d => d.days === selectedDuration)?.label})`
                        : PLAN_META[selectedPlan].free ? t('agente_detail.unlimited_suffix') : ''
                    }` })}
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
          {t('agente_detail.account_actions_title')}
        </Text>
        <View style={styles.dangerActions}>
          <Button
            label={agent.active ? t('agente_detail.deactivate_account') : t('agente_detail.activate_account')}
            variant="secondary"
            onPress={handleToggleActive}
          />
          <Button label={t('agente_detail.change_password')} variant="secondary" onPress={() => setShowPasswordModal(true)} />
          <Button label={t('agente_detail.view_orders')} variant="secondary" onPress={() => router.push(`/(admin)/agente/${agent.id}/pedidos` as any)} />
          <Button
            label={t('agente_detail.delete_agent')}
            variant="secondary"
            onPress={() => confirmDestructive(
              t('agente_detail.delete_agent'),
              t('agente_detail.delete_agent_body', { name: agent.name }),
              async () => {
                const { error } = await deleteAgent(agent!.id);
                if (error) { toast.error(error); return; }
                toast.success(t('agente_detail.agent_deleted'));
                router.back();
              },
              t('shared.delete'),
            )}
          />
        </View>
      </View>

      {/* Modal cambiar contraseña */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowPasswordModal(false)}>
            <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text variant="bodyMedium">{t('agente_detail.change_password')}</Text>
                <Pressable onPress={() => setShowPasswordModal(false)} hitSlop={8}>
                  <Text variant="small" color="ink3">✕</Text>
                </Pressable>
              </View>
              <ScrollView style={{ padding: space[4] }} showsVerticalScrollIndicator={false}>
                <Text variant="small" color="ink3" style={{ marginBottom: space[3] }}>
                  {t('agente_detail.new_password_for', { name: agent.name })}
                </Text>
                <TextInput
                  style={styles.pwInput}
                  placeholder={t('agente_detail.new_password_placeholder')}
                  placeholderTextColor={colors.ink4}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.pwInput, { marginTop: space[2] }]}
                  placeholder={t('agente_detail.confirm_password_placeholder')}
                  placeholderTextColor={colors.ink4}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Button
                  label={t('agente_detail.save_password')}
                  onPress={handleChangePassword}
                  loading={savingPassword}
                  fullWidth
                  style={{ marginTop: space[4] }}
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: space[4],
  },
  modal: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    width: '100%', maxWidth: 420, overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: space[4], borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  pwInput: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, padding: space[3],
    fontSize: 14, color: colors.ink,
  },
});
