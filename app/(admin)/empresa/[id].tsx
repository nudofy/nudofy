// ADM-07 · Ficha de empresa
import React, { useState } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, TextInput, Linking,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AdminShell from '@/components/AdminShell';
import { useAdminCompanyDetail } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Badge } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { confirmDestructive, confirmAction, alertInfo } from '@/lib/confirm';

// Valores alineados con la tabla `plans` (fuente de verdad). 999999 = centinela
// que la UI muestra como ∞. Empresa (agency_pro) es precio a medida: ver isCustomPricing.
// maxAgents = agentes incluidos en el precio base; priceExtraAgent = coste de cada
// agente adicional por encima de ese número (null si el plan no admite extras).
const PLAN_LIMITS: Record<string, { maxAgents: number; maxClients: number; maxProducts: number; price: number; priceExtraAgent: number | null }> = {
  free:       { maxAgents: 999, maxClients: 999999, maxProducts: 999999, price: 0,  priceExtraAgent: null },
  free_pro:   { maxAgents: 999, maxClients: 999999, maxProducts: 999999, price: 0,  priceExtraAgent: null },
  basic:      { maxAgents: 1,   maxClients: 80,     maxProducts: 1500,   price: 15, priceExtraAgent: null },
  pro:        { maxAgents: 1,   maxClients: 300,    maxProducts: 3000,   price: 39, priceExtraAgent: null },
  agency:     { maxAgents: 8,   maxClients: 650,    maxProducts: 5000,   price: 89, priceExtraAgent: 15   },
  agency_pro: { maxAgents: 999, maxClients: 999999, maxProducts: 999999, price: 0,  priceExtraAgent: null },
};

// Planes que un admin puede asignar a una empresa (Free/Free Pro son de uso interno, no aplican aquí).
const COMPANY_PLANS = ['basic', 'pro', 'agency', 'agency_pro'] as const;

function UsageBar({ label, current, max, unlimitedLabel, last }: { label: string; current: number; max: number; unlimitedLabel: string; last?: boolean }) {
  const pct = max > 0 && max < 999999 ? Math.min((current / max) * 100, 100) : 0;
  const barColor = pct >= 90 ? colors.danger : pct >= 70 ? colors.warning : colors.success;
  return (
    <View style={[styles.usageRow, !last && styles.fieldRowBorder]}>
      <View style={styles.usageTop}>
        <Text variant="small" color="ink2">{label}</Text>
        <Text variant="smallMedium">
          {current.toLocaleString('es-ES')}
          {max < 999999 ? ` / ${max.toLocaleString('es-ES')}` : ` (${unlimitedLabel})`}
        </Text>
      </View>
      {max < 999999 && (
        <View style={styles.usageBarWrap}>
          <View style={[styles.usageBar, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        </View>
      )}
    </View>
  );
}

export default function AdminEmpresaDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('admin');
  const toast = useToast();

  function formatDate(iso: string) {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function formatEur(n: number) {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return n.toLocaleString(locale, { minimumFractionDigits: 0 }) + ' €';
  }

  const PLAN_META: Record<string, { label: string; maxAgents: number; maxClients: number; maxProducts: number; price: number; priceExtraAgent: number | null }> = {
    free:     { label: t('agente_detail.plan_free'),    ...PLAN_LIMITS.free },
    free_pro: { label: t('agente_detail.plan_free_pro'), ...PLAN_LIMITS.free_pro },
    basic:    { label: t('shared.plan_basic'), ...PLAN_LIMITS.basic },
    pro:      { label: t('shared.plan_pro'),   ...PLAN_LIMITS.pro },
    agency:   { label: t('shared.plan_agency'), ...PLAN_LIMITS.agency },
    agency_pro: { label: t('shared.plan_agency_pro'), ...PLAN_LIMITS.agency_pro },
  };
  const { id } = useLocalSearchParams<{ id: string }>();
  const { company, agents, invoices, clientCount, productCount, loading, updateCompany, toggleActive } = useAdminCompanyDetail(id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNif, setEditNif] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Cambiar plan
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof COMPANY_PLANS[number] | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  async function confirmPlanChange() {
    if (!selectedPlan) return;
    setSavingPlan(true);
    const { error } = await updateCompany({ plan: selectedPlan });
    if (!error) {
      // usePlanLimits comprueba agents.plan, no companies.plan — hay que
      // propagar el cambio a todos los agentes de la empresa o los límites
      // reales se quedarían con el plan viejo. agents.plan no admite
      // 'agency_pro' (solo companies.plan lo hace), así que Empresa se
      // traduce a 'agency' para el agente individual.
      const agentSyncPlan = selectedPlan === 'agency_pro' ? 'agency' : selectedPlan;
      await supabase.from('agents').update({ plan: agentSyncPlan }).eq('company_id', company!.id);
    }
    setSavingPlan(false);
    if (error) { toast.error(error); return; }
    toast.success(t('empresa_detail.plan_updated'));
    setChangingPlan(false);
    setSelectedPlan(null);
  }

  // Cambiar contraseña admin
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 6) { toast.error(t('empresa_detail.min_chars_error')); return; }
    if (newPassword !== confirmPassword) { toast.error(t('empresa_detail.passwords_mismatch')); return; }
    const adminAgent = agents.find(a => a.role === 'admin') ?? agents[0];
    if (!adminAgent?.user_id) { toast.error(t('empresa_detail.no_admin_user_error')); return; }
    setSavingPassword(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/reset-user-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ user_id: adminAgent.user_id, new_password: newPassword }),
    });
    const json = await res.json();
    setSavingPassword(false);
    if (!res.ok || json.error) { toast.error(json.error ?? t('empresa_detail.password_change_error')); return; }
    toast.success(t('empresa_detail.password_updated'));
    setShowPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
  }

  if (loading || !company) {
    return (
      <AdminShell activeSection="agentes" title={t('empresa_detail.loading_title')}>
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          {t('empresa_detail.loading_body')}
        </Text>
      </AdminShell>
    );
  }

  const plan = PLAN_META[company.plan] ?? PLAN_META.agency;
  const initials = company.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const activeAgentCount = agents.filter(a => a.active).length;
  const isCustomPricing = company.plan === 'agency_pro';
  const basePrice = plan.price ?? 0;
  // El precio base incluye plan.maxAgents agentes; solo se cobra priceExtraAgent
  // por cada agente activo por encima de ese número (si el plan admite extras).
  const extraAgentCount = plan.priceExtraAgent != null ? Math.max(0, activeAgentCount - plan.maxAgents) : 0;
  const monthlyTotal = basePrice + extraAgentCount * (plan.priceExtraAgent ?? 0);

  const showUpgrade = company.plan === 'agency' && (
    activeAgentCount / plan.maxAgents > 0.7 ||
    clientCount / plan.maxClients > 0.7 ||
    productCount / plan.maxProducts > 0.7
  );

  function startEdit() {
    setEditName(company!.name);
    setEditNif(company!.nif ?? '');
    setEditAddress(company!.address ?? '');
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await updateCompany({ name: editName, nif: editNif, address: editAddress });
    setSaving(false);
    if (error) toast.error(error);
    else { setEditing(false); toast.success(t('empresa_detail.company_updated')); }
  }

  function handleToggleActive() {
    const confirm = company!.active ? confirmDestructive : confirmAction;
    confirm(
      company!.active ? t('empresa_detail.suspend_company_title') : t('empresa_detail.activate_company_title'),
      t('empresa_detail.confirm_toggle_company', {
        action: company!.active ? t('empresa_detail.suspend') : t('empresa_detail.activate'),
        name: company!.name,
        extra: company!.active ? t('empresa_detail.agents_lose_access') : '',
      }),
      async () => {
        const { error } = await toggleActive(!company!.active);
        if (error) toast.error(error);
      },
      company!.active ? t('empresa_detail.suspend') : t('empresa_detail.activate'),
    );
  }

  function handleDelete() {
    confirmDestructive(
      t('empresa_detail.delete_company_title'),
      t('empresa_detail.delete_company_body', { name: company!.name }),
      async () => {
        const { error } = await supabase.functions.invoke('delete-company', {
          body: { companyId: company!.id },
        });
        if (error) alertInfo(t('shared.error_title'), error.message ?? t('empresa_detail.delete_company_error'));
        else router.back();
      },
      t('empresa_detail.delete'),
    );
  }

  async function handleProposeUpgrade() {
    // Buscar el email del admin de la empresa
    const adminAgent = agents.find(a => a.role === 'admin');
    const email = adminAgent?.email ?? '';
    if (!email) { toast.error(t('empresa_detail.no_admin_email_error')); return; }

    const subject = `Nudofy · Propuesta de upgrade a Empresa — ${company!.name}`;
    const body =
`Hola,

Hemos revisado el uso de tu cuenta en Nudofy y queremos proponerte una mejora de plan.

Tu empresa ${company!.name} está utilizando actualmente el plan Agencia y se está acercando a los límites:
• Agentes activos: ${activeAgentCount} / ${plan.maxAgents}
• Clientes: ${clientCount} / ${plan.maxClients}
• Productos: ${productCount} / ${plan.maxProducts}

El plan Empresa te ofrece un límite a medida por encima de Agencia (agentes, clientes y productos), con soporte dedicado y onboarding personalizado.

Si quieres saber más o hacer el cambio, responde a este email y te ayudamos en el proceso.

Un saludo,
Equipo Nudofy`;

    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) { toast.error(t('empresa_detail.mail_client_error')); return; }
    await Linking.openURL(url);
  }

  return (
    <AdminShell activeSection="agentes" title={t('empresa_detail.title')}>
      {/* Breadcrumb + acciones */}
      <View style={styles.pageHeader}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.breadcrumb, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Icon name="ArrowLeft" size={16} color={colors.ink2} />
          <Text variant="smallMedium" color="ink2">{t('empresa_detail.breadcrumb_agentes')}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <View style={styles.pageActions}>
          <Button
            label={t('empresa_detail.change_password')}
            variant="secondary"
            size="sm"
            onPress={() => setShowPasswordModal(true)}
          />
          <Button
            label={t('empresa_detail.delete')}
            variant="danger"
            size="sm"
            onPress={handleDelete}
          />
          <Button
            label={company.active ? t('empresa_detail.suspend') : t('empresa_detail.activate')}
            variant="secondary"
            size="sm"
            onPress={handleToggleActive}
          />
          {editing ? (
            <Button label={t('empresa_detail.save')} size="sm" onPress={handleSave} loading={saving} />
          ) : (
            <Button label={t('empresa_detail.edit')} size="sm" onPress={startEdit} />
          )}
        </View>
      </View>

      {/* Cabecera empresa */}
      <View style={styles.companyHeader}>
        <View style={styles.companyAv}>
          <Text variant="heading" color="ink2">{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="heading">{company.name}</Text>
          <Text variant="caption" color="ink3">{t('empresa_detail.signup_label', { date: formatDate(company.created_at) })}</Text>
          <View style={styles.companyMeta}>
            <Badge label={t('empresa_detail.plan_prefix', { plan: plan.label })} variant="neutral" />
            <Badge
              label={company.active ? t('empresa_detail.active') : t('empresa_detail.suspended')}
              variant={company.active ? 'success' : 'neutral'}
            />
          </View>
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label={t('empresa_detail.kpi_active_agents')}
          value={`${activeAgentCount}${plan.maxAgents < 999 ? ` / ${plan.maxAgents}` : ''}`}
          sub={plan.maxAgents < 999 ? t('empresa_detail.slots_available', { count: plan.maxAgents - activeAgentCount }) : t('empresa_detail.unlimited')}
        />
        <KpiCard
          label={t('empresa_detail.kpi_total_clients')}
          value={`${clientCount.toLocaleString('es-ES')}${plan.maxClients < 999999 ? ` / ${plan.maxClients.toLocaleString('es-ES')}` : ''}`}
          sub={plan.maxClients < 999999 ? t('empresa_detail.available_suffix', { count: plan.maxClients - clientCount }) : t('empresa_detail.unlimited')}
        />
        <KpiCard
          label={t('empresa_detail.kpi_products')}
          value={`${productCount.toLocaleString('es-ES')}${plan.maxProducts < 999999 ? ` / ${plan.maxProducts.toLocaleString('es-ES')}` : ''}`}
          sub={plan.maxProducts < 999999 ? t('empresa_detail.available_suffix', { count: plan.maxProducts - productCount }) : t('empresa_detail.unlimited')}
        />
        <KpiCard
          label={t('empresa_detail.kpi_monthly_billing')}
          value={isCustomPricing ? t('empresa_detail.custom_price') : formatEur(monthlyTotal)}
          sub={
            isCustomPricing
              ? t('empresa_detail.custom_price_sub')
              : extraAgentCount > 0
                ? t('empresa_detail.agents_price_breakdown', { count: extraAgentCount, price: plan.priceExtraAgent })
                : t('empresa_detail.agents_included_flat', { count: plan.maxAgents })
          }
          accent
        />
      </View>

      {/* Upgrade banner */}
      {showUpgrade && (
        <View style={styles.upgradeBanner}>
          <View style={styles.upgradeIcon}>
            <Icon name="TrendingUp" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="bodyMedium">{t('empresa_detail.upgrade_suggestion_title')}</Text>
            <Text variant="caption" color="ink3">
              {t('empresa_detail.upgrade_suggestion_body')}
            </Text>
            <View style={{ alignSelf: 'flex-start', marginTop: space[1] }}>
              <Button label={t('empresa_detail.propose_upgrade')} variant="secondary" size="sm" onPress={handleProposeUpgrade} />
            </View>
          </View>
        </View>
      )}

      {/* Datos empresa */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">{t('empresa_detail.company_data_title')}</Text>
          {!editing && (
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              <Pressable
                onPress={() => { setChangingPlan(!changingPlan); setSelectedPlan(null); }}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text variant="smallMedium" color="ink2">
                  {changingPlan ? t('empresa_detail.cancel') : t('empresa_detail.change_plan')}
                </Text>
              </Pressable>
              <Pressable
                onPress={startEdit}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text variant="smallMedium" color="ink2">{t('empresa_detail.edit')}</Text>
              </Pressable>
            </View>
          )}
        </View>
        {editing ? (
          <View style={styles.editBody}>
            <EditField label={t('empresa_detail.business_name')}>
              <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholderTextColor={colors.ink4} />
            </EditField>
            <EditField label={t('empresa_detail.nif')}>
              <TextInput style={styles.editInput} value={editNif} onChangeText={setEditNif} placeholder="B-12345678" placeholderTextColor={colors.ink4} autoCapitalize="characters" />
            </EditField>
            <EditField label={t('empresa_detail.fiscal_address')}>
              <TextInput style={styles.editInput} value={editAddress} onChangeText={setEditAddress} placeholder="C/ Mayor 1, Madrid" placeholderTextColor={colors.ink4} />
            </EditField>
            <View style={styles.editActions}>
              <Button label={t('empresa_detail.cancel')} variant="secondary" onPress={() => setEditing(false)} />
              <Button label={t('empresa_detail.save')} onPress={handleSave} loading={saving} />
            </View>
          </View>
        ) : (
          <>
            <FieldRow label={t('empresa_detail.business_name')} value={company.name} />
            <FieldRow label={t('empresa_detail.nif')} value={company.nif ?? '—'} />
            <FieldRow label={t('empresa_detail.fiscal_address')} value={company.address ?? '—'} />
            <FieldRow label={t('empresa_detail.active_plan')} value={isCustomPricing ? t('empresa_detail.plan_custom', { plan: plan.label }) : t('empresa_detail.plan_per_month', { plan: plan.label, amount: formatEur(monthlyTotal) })} last={!changingPlan} />
            {changingPlan && (
              <View style={styles.planSelector}>
                {COMPANY_PLANS.map(p => {
                  const pm = PLAN_META[p];
                  const isActive = p === company.plan;
                  const isSelected = p === selectedPlan;
                  return (
                    <Pressable
                      key={p}
                      style={[
                        styles.planOpt,
                        isActive && styles.planOptActive,
                        isSelected && styles.planOptSelected,
                      ]}
                      onPress={() => setSelectedPlan(p)}
                    >
                      <Text variant="smallMedium">{pm.label}</Text>
                      <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                        {p === 'agency_pro' ? t('empresa_detail.custom_price') : formatEur(pm.price)}
                      </Text>
                      {isActive && (
                        <Text variant="caption" color="ink4" style={{ marginTop: 2 }}>{t('empresa_detail.current_badge')}</Text>
                      )}
                    </Pressable>
                  );
                })}
                {selectedPlan && (
                  <View style={{ width: '100%', marginTop: space[2] }}>
                    <Button
                      label={t('empresa_detail.confirm_plan', { plan: PLAN_META[selectedPlan].label })}
                      onPress={confirmPlanChange}
                      loading={savingPlan}
                      fullWidth
                    />
                  </View>
                )}
              </View>
            )}
            <FieldRow label={t('empresa_detail.signup_short')} value={formatDate(company.created_at)} last />
          </>
        )}
      </View>

      {/* Uso del plan */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">{t('empresa_detail.plan_usage_title')}</Text>
        </View>
        <UsageBar label={t('empresa_detail.usage_agents')} current={activeAgentCount} max={plan.maxAgents} unlimitedLabel={t('empresa_detail.unlimited')} />
        <UsageBar label={t('empresa_detail.usage_clients')} current={clientCount} max={plan.maxClients} unlimitedLabel={t('empresa_detail.unlimited')} />
        <UsageBar label={t('empresa_detail.usage_products')} current={productCount} max={plan.maxProducts} unlimitedLabel={t('empresa_detail.unlimited')} last />
      </View>

      {/* Agentes */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">{t('empresa_detail.company_agents_title')}</Text>
          <Text variant="caption" color="ink3">{agents.length}</Text>
        </View>
        {agents.length === 0 ? (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
            {t('empresa_detail.no_agents_yet')}
          </Text>
        ) : (
          agents.map((agent, i) => {
            const ag2 = agent.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
            const isAdmin = agent.role === 'admin';
            return (
              <View
                key={agent.id}
                style={[styles.agentRow, i < agents.length - 1 && styles.fieldRowBorder]}
              >
                <View style={styles.agentAv}>
                  <Text variant="smallMedium" color="ink2">{ag2}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.agentNameRow}>
                    <Text variant="smallMedium">{agent.name}</Text>
                    <Badge label={isAdmin ? t('empresa_detail.role_admin') : t('empresa_detail.role_agent')} variant="neutral" />
                  </View>
                  <Text variant="caption" color="ink3">{agent.email}</Text>
                  <Text variant="caption" color="ink3">
                    {t('empresa_detail.agent_stats', { clients: agent.client_count, orders: agent.order_count_month })}
                  </Text>
                </View>
                <Button
                  label={t('empresa_detail.view')}
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
                />
              </View>
            );
          })
        )}
      </View>

      {/* Facturas */}
      {invoices.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">{t('empresa_detail.invoices_history_title')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {[t('empresa_detail.col_period'), t('empresa_detail.col_amount'), t('empresa_detail.col_vat'), t('empresa_detail.col_total'), t('empresa_detail.col_status')].map((h, i) => (
                  <Text
                    key={h}
                    variant="caption"
                    color="ink3"
                    style={[styles.th, { width: [130, 100, 90, 100, 120][i] }]}
                  >
                    {h.toUpperCase()}
                  </Text>
                ))}
              </View>
              {invoices.map((inv, i) => {
                const statusLabel = inv.status === 'paid' ? t('empresa_detail.invoice_paid') : inv.status === 'pending' ? t('empresa_detail.invoice_pending') : t('empresa_detail.invoice_overdue');
                const statusVariant: 'success' | 'warning' | 'danger' =
                  inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'danger';
                return (
                  <View
                    key={inv.id}
                    style={[styles.tableRow, i === invoices.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={[styles.td, { width: 130 }]}>
                      <Text variant="small" color="ink">{inv.period}</Text>
                    </View>
                    <View style={[styles.td, { width: 100 }]}>
                      <Text variant="small" color="ink">{formatEur(inv.amount)}</Text>
                    </View>
                    <View style={[styles.td, { width: 90 }]}>
                      <Text variant="small" color="ink">{formatEur(inv.iva)}</Text>
                    </View>
                    <View style={[styles.td, { width: 100 }]}>
                      <Text variant="smallMedium">{formatEur(inv.total)}</Text>
                    </View>
                    <View style={[styles.td, { width: 120 }]}>
                      <Badge label={statusLabel} variant={statusVariant} />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
      {/* Modal cambiar contraseña */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowPasswordModal(false)}>
            <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text variant="bodyMedium">{t('empresa_detail.change_password')}</Text>
                <Pressable onPress={() => setShowPasswordModal(false)} hitSlop={8}>
                  <Text variant="small" color="ink3">✕</Text>
                </Pressable>
              </View>
              <View style={{ padding: space[4], gap: space[2] }}>
                <Text variant="small" color="ink3">
                  {t('empresa_detail.new_password_for_admin', { name: company.name })}
                </Text>
                <TextInput
                  style={styles.pwInput}
                  placeholder={t('empresa_detail.new_password_placeholder')}
                  placeholderTextColor={colors.ink4}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.pwInput}
                  placeholder={t('empresa_detail.confirm_password_placeholder')}
                  placeholderTextColor={colors.ink4}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Button
                  label={t('empresa_detail.save_password')}
                  onPress={handleChangePassword}
                  loading={savingPassword}
                  fullWidth
                  style={{ marginTop: space[2] }}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </AdminShell>
  );
}

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <View style={[styles.kpi, accent && styles.kpiAccent]}>
      <Text
        variant="caption"
        style={{ color: accent ? 'rgba(255,255,255,0.85)' : colors.ink3 }}
      >
        {label}
      </Text>
      <Text
        variant="heading"
        style={{ color: accent ? colors.white : colors.ink, marginTop: space[1] }}
      >
        {value}
      </Text>
      <Text
        variant="caption"
        style={{ color: accent ? 'rgba(255,255,255,0.85)' : colors.ink3, marginTop: space[1] }}
      >
        {sub}
      </Text>
    </View>
  );
}

function FieldRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text variant="small" color="ink3">{label}</Text>
      <Text variant="smallMedium" style={{ textAlign: 'right', flex: 1 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="smallMedium">{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    flexWrap: 'wrap',
  },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageActions: { flexDirection: 'row', gap: space[1] },

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

  companyHeader: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[4],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
  },
  companyAv: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  companyMeta: {
    flexDirection: 'row', gap: space[2], marginTop: space[2],
    flexWrap: 'wrap', alignItems: 'center',
  },

  kpiGrid: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  kpi: {
    flex: 1, minWidth: 150,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
  },
  kpiAccent: { backgroundColor: colors.brand, borderColor: colors.brand },

  upgradeBanner: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
    flexDirection: 'row', gap: space[3], alignItems: 'flex-start',
  },
  upgradeIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
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

  editBody: { padding: space[3], gap: space[3] },
  editInput: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    fontSize: 14, color: colors.ink,
    backgroundColor: colors.white,
  },
  editActions: { flexDirection: 'row', gap: space[2], marginTop: space[1] },

  usageRow: {
    padding: space[3],
    gap: space[1],
  },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  usageBarWrap: { height: 6, backgroundColor: colors.line2, borderRadius: 3, overflow: 'hidden' },
  usageBar: { height: 6, borderRadius: 3 },

  agentRow: {
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
  },
  agentAv: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  agentNameRow: { flexDirection: 'row', alignItems: 'center', gap: space[1], flexWrap: 'wrap' },

  tableHead: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
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

  emptyText: { paddingVertical: space[6] },

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
