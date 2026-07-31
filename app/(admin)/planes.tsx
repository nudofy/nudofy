// ADM-04 · Gestión de planes (sincronizado con la web nudofy.com)
// Lee y escribe en public.plans — fuente única de verdad.
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Pressable, Switch, ScrollView,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { confirmDestructive } from '@/lib/confirm';
import { colors, space, radius } from '@/theme';
import { Text, Button, Badge, Icon } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';

type Plan = {
  id: string;
  name: string;
  tagline: string | null;
  price_monthly: number | null;
  price_extra_agent: number | null;
  currency: string;
  trial_days: number;
  max_agents: number | null;
  agents_included: number | null;
  max_suppliers: number | null;
  max_catalogs: number | null;
  max_products: number | null;
  max_clients: number | null;
  max_orders_month: number | null;
  features: string[];
  cta_label: string;
  cta_href: string | null;
  highlighted: boolean;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_PLAN: Omit<Plan, 'id'> = {
  name: '',
  tagline: null,
  price_monthly: null,
  price_extra_agent: null,
  currency: 'EUR',
  trial_days: 15,
  max_agents: null,
  agents_included: 1,
  max_suppliers: null,
  max_catalogs: null,
  max_products: null,
  max_clients: null,
  max_orders_month: null,
  features: [],
  cta_label: 'Empezar',
  cta_href: null,
  highlighted: false,
  is_public: true,
  is_active: true,
  sort_order: 99,
};

const FREE_KEYS = ['free', 'free_pro'];
const isFree = (id: string) => FREE_KEYS.includes(id);

export default function AdminPlanesScreen() {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newId, setNewId] = useState('');
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  async function fetchPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('sort_order');
    if (error) {
      toast.error(t('planes.load_error'));
    } else if (data) {
      setPlans(data as Plan[]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchPlans(); }, []);

  async function savePlan() {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error(t('planes.name_required_error')); return; }
    setSaving(true);

    if (isNew) {
      if (!newId.trim()) { toast.error(t('planes.id_required_error')); setSaving(false); return; }
      const { error } = await supabase.from('plans').insert({ ...editing, id: newId.trim().toLowerCase().replace(/\s+/g, '_') });
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('plans').update({
        name: editing.name,
        tagline: editing.tagline,
        price_monthly: editing.price_monthly,
        price_extra_agent: editing.price_extra_agent,
        currency: editing.currency,
        trial_days: editing.trial_days,
        max_agents: editing.max_agents,
        agents_included: editing.agents_included,
        max_suppliers: editing.max_suppliers,
        max_catalogs: editing.max_catalogs,
        max_products: editing.max_products,
        max_clients: editing.max_clients,
        max_orders_month: editing.max_orders_month,
        features: editing.features,
        cta_label: editing.cta_label,
        cta_href: editing.cta_href,
        highlighted: editing.highlighted,
        is_public: editing.is_public,
        is_active: editing.is_active,
        sort_order: editing.sort_order,
      }).eq('id', editing.id);
      if (error) { toast.error(t('planes.save_error')); setSaving(false); return; }
    }

    setSaving(false);
    setEditing(null);
    setIsNew(false);
    setNewId('');
    fetchPlans();
    toast.success(isNew ? t('planes.plan_created') : t('planes.plan_updated'));
  }

  async function toggleActive(plan: Plan) {
    const { error } = await supabase
      .from('plans')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id);
    if (error) { toast.error(t('planes.update_error')); return; }
    toast.success(plan.is_active ? t('planes.plan_deactivated') : t('planes.plan_activated'));
    fetchPlans();
  }

  function confirmDelete(plan: Plan) {
    confirmDestructive(
      t('planes.delete_plan_title'),
      t('planes.delete_plan_body', { name: plan.name }),
      async () => {
        const { error } = await supabase.from('plans').delete().eq('id', plan.id);
        if (error) { toast.error(error.message); return; }
        toast.success(t('planes.plan_deleted'));
        fetchPlans();
      },
      t('planes.delete'),
    );
  }

  function openEdit(plan: Plan) {
    setIsNew(false);
    setNewId('');
    setRawInputs({});
    setEditing({ ...plan });
  }

  function openNew() {
    setIsNew(true);
    setNewId('');
    setRawInputs({});
    setEditing({ ...EMPTY_PLAN } as Plan);
  }

  function update<K extends keyof Plan>(field: K, value: Plan[K]) {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  }

  function updateNum(field: keyof Plan, value: string) {
    if (!editing) return;
    setRawInputs(prev => ({ ...prev, [field as string]: value }));
    const normalized = value.replace(',', '.').trim();
    if (normalized === '') { setEditing({ ...editing, [field]: null } as Plan); return; }
    if (normalized.endsWith('.')) return; // aún escribiendo decimal
    const num = parseFloat(normalized);
    if (!isNaN(num)) setEditing({ ...editing, [field]: num } as Plan);
  }

  function numVal(field: keyof Plan): string {
    if (field as string in rawInputs) return rawInputs[field as string];
    const v = (editing as any)?.[field];
    return v != null ? String(v).replace('.', ',') : '';
  }

  function priceLabel(plan: Plan) {
    if (plan.price_monthly == null) return t('planes.custom_price');
    if (plan.price_monthly === 0) return t('planes.free_price');
    return t('planes.price_per_month', { price: plan.price_monthly });
  }

  return (
    <AdminShell activeSection="planes" title={t('planes.title')}>
      {/* Botón nuevo plan */}
      <View style={styles.toolbar}>
        <Button label={t('planes.new_plan')} onPress={openNew} size="sm" />
      </View>

      {loading ? (
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          {t('planes.loading')}
        </Text>
      ) : (
        <View style={styles.list}>
          {plans.map(plan => (
            <View key={plan.id} style={[styles.row, !plan.is_active && styles.rowInactive]}>
              <View style={styles.rowLeft}>
                <View style={styles.rowHeader}>
                  <Badge
                    label={plan.name}
                    variant={isFree(plan.id) ? 'success' : 'neutral'}
                  />
                  {plan.highlighted && <Badge label={t('planes.highlighted')} variant="warning" />}
                  {!plan.is_public && <Badge label={t('planes.internal')} variant="neutral" />}
                  {!plan.is_active && <Badge label={t('planes.inactive')} variant="danger" />}
                  <Text variant="smallMedium">{priceLabel(plan)}</Text>
                </View>
                <View style={styles.rowMeta}>
                  <Text variant="caption" color="ink3">
                    {plan.max_clients != null ? t('planes.clients_count', { count: plan.max_clients }) : t('planes.unlimited_clients')}
                  </Text>
                  <Text variant="caption" color="ink4">·</Text>
                  <Text variant="caption" color="ink3">
                    {plan.max_products != null ? t('planes.products_count', { count: plan.max_products }) : t('planes.unlimited_products')}
                  </Text>
                  <Text variant="caption" color="ink4">·</Text>
                  <Text variant="caption" color="ink3">
                    {plan.max_orders_month != null ? t('planes.orders_count', { count: plan.max_orders_month }) : t('planes.unlimited_orders')}
                  </Text>
                </View>
              </View>

              {/* Acciones */}
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => toggleActive(plan)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
                >
                  <Icon
                    name={plan.is_active ? 'ToggleRight' : 'ToggleLeft'}
                    size={24}
                    color={plan.is_active ? colors.success : colors.ink4}
                  />
                </Pressable>
                <Pressable
                  onPress={() => openEdit(plan)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
                >
                  <Icon name="Pencil" size={18} color={colors.ink2} />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(plan)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
                >
                  <Icon name="Trash2" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal de edición / creación */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => { setEditing(null); setIsNew(false); }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text variant="bodyMedium">{isNew ? t('planes.new_plan_modal_title') : t('planes.edit_plan_modal_title', { name: editing?.name })}</Text>
              <Pressable
                onPress={() => { setEditing(null); setIsNew(false); }}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text variant="smallMedium" color="ink2">{t('planes.cancel')}</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
              {isNew && (
                <FormGroup label={t('planes.plan_id_label')} hint={t('planes.plan_id_hint')}>
                  <TextInput
                    style={styles.input}
                    value={newId}
                    onChangeText={v => setNewId(v.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder={t('planes.plan_id_placeholder')}
                    placeholderTextColor={colors.ink4}
                    autoCapitalize="none"
                  />
                </FormGroup>
              )}

              <FormGroup label={t('planes.name_label')}>
                <TextInput
                  style={styles.input}
                  value={editing?.name ?? ''}
                  onChangeText={v => update('name', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label={t('planes.tagline_label')} hint={t('planes.tagline_hint')}>
                <TextInput
                  style={styles.input}
                  value={editing?.tagline ?? ''}
                  onChangeText={v => update('tagline', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <View style={styles.formRow}>
                <FormGroup label={t('planes.price_label')} hint={t('planes.price_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('price_monthly')}
                    keyboardType="decimal-pad"
                    placeholder={t('planes.custom_price')}
                    onChangeText={v => updateNum('price_monthly', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label={t('planes.extra_agent_label')} hint={t('planes.extra_agent_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('price_extra_agent')}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    onChangeText={v => updateNum('price_extra_agent', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <View style={styles.formRow}>
                <FormGroup label={t('planes.max_clients_label')} hint={t('planes.unlimited_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('max_clients')}
                    keyboardType="number-pad"
                    placeholder={t('planes.unlimited_placeholder')}
                    onChangeText={v => updateNum('max_clients', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label={t('planes.max_suppliers_label')} hint={t('planes.unlimited_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('max_suppliers')}
                    keyboardType="number-pad"
                    placeholder={t('planes.unlimited_placeholder')}
                    onChangeText={v => updateNum('max_suppliers', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <View style={styles.formRow}>
                <FormGroup label={t('planes.max_products_label')} hint={t('planes.unlimited_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('max_products')}
                    keyboardType="number-pad"
                    placeholder={t('planes.unlimited_placeholder')}
                    onChangeText={v => updateNum('max_products', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <View style={styles.formRow}>
                <FormGroup label={t('planes.max_orders_label')} hint={t('planes.unlimited_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('max_orders_month')}
                    keyboardType="number-pad"
                    placeholder={t('planes.unlimited_placeholder')}
                    onChangeText={v => updateNum('max_orders_month', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label={t('planes.agents_included_label')} hint={t('planes.agents_included_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('agents_included')}
                    keyboardType="number-pad"
                    placeholder="1"
                    onChangeText={v => updateNum('agents_included', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label={t('planes.max_agents_label')} hint={t('planes.unlimited_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('max_agents')}
                    keyboardType="number-pad"
                    placeholder={t('planes.unlimited_placeholder')}
                    onChangeText={v => updateNum('max_agents', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <View style={styles.formRow}>
                <FormGroup label={t('planes.max_catalogs_label')} hint={t('planes.unlimited_hint')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('max_catalogs')}
                    keyboardType="number-pad"
                    placeholder={t('planes.unlimited_placeholder')}
                    onChangeText={v => updateNum('max_catalogs', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label={t('planes.trial_days_label')}>
                  <TextInput
                    style={styles.input}
                    value={numVal('trial_days') || '15'}
                    keyboardType="number-pad"
                    onChangeText={v => updateNum('trial_days', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <FormGroup label={t('planes.sort_order_label')} hint={t('planes.sort_order_hint')}>
                <TextInput
                  style={styles.input}
                  value={numVal('sort_order') || '99'}
                  keyboardType="number-pad"
                  onChangeText={v => updateNum('sort_order', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label={t('planes.features_label')} hint={t('planes.features_hint')}>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={(editing?.features ?? []).join('\n')}
                  onChangeText={v =>
                    update('features', v.split('\n').map(s => s.trim()).filter(Boolean))
                  }
                  multiline
                  numberOfLines={6}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label={t('planes.cta_label')}>
                <TextInput
                  style={styles.input}
                  value={editing?.cta_label ?? ''}
                  onChangeText={v => update('cta_label', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label={t('planes.cta_href_label')}>
                <TextInput
                  style={styles.input}
                  value={editing?.cta_href ?? ''}
                  onChangeText={v => update('cta_href', v)}
                  placeholder={t('planes.cta_href_placeholder')}
                  placeholderTextColor={colors.ink4}
                  autoCapitalize="none"
                />
              </FormGroup>

              <View style={styles.toggleGroup}>
                <ToggleRow
                  label={t('planes.toggle_active_label')}
                  hint={t('planes.toggle_active_hint')}
                  value={!!editing?.is_active}
                  onChange={v => update('is_active', v)}
                />
                <ToggleRow
                  label={t('planes.toggle_public_label')}
                  hint={t('planes.toggle_public_hint')}
                  value={!!editing?.is_public}
                  onChange={v => update('is_public', v)}
                />
                <ToggleRow
                  label={t('planes.toggle_highlighted_label')}
                  hint={t('planes.toggle_highlighted_hint')}
                  value={!!editing?.highlighted}
                  onChange={v => update('highlighted', v)}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label={t('planes.cancel')}
                variant="secondary"
                onPress={() => { setEditing(null); setIsNew(false); }}
                fullWidth
              />
              <Button
                label={saving ? t('planes.saving') : isNew ? t('planes.create_plan') : t('planes.save')}
                onPress={savePlan}
                disabled={saving}
                fullWidth
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AdminShell>
  );
}

function FormGroup({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.formGroup}>
      <View style={styles.formLabelRow}>
        <Text variant="smallMedium" color="ink2">{label}</Text>
        {hint && <Text variant="caption" color="ink4">{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function ToggleRow({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text variant="smallMedium">{label}</Text>
        {hint && <Text variant="caption" color="ink4">{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.brand }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { marginBottom: space[3], alignItems: 'flex-end' },
  emptyText: { paddingVertical: space[6] },

  list: { gap: space[2] },
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  rowInactive: { opacity: 0.55 },
  rowLeft: { flex: 1, gap: space[2] },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  rowMeta: { flexDirection: 'row', gap: space[1] + 2, flexWrap: 'wrap', alignItems: 'center' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  iconBtn: { padding: 6 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '92%',
  },
  modalHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalScroll: { },
  modalBody: { padding: space[3], gap: space[3] },
  modalFooter: {
    padding: space[3],
    borderTopWidth: 1, borderTopColor: colors.line2,
    flexDirection: 'row', gap: space[2],
  },

  formGroup: { gap: space[1] + 2, flex: 1 },
  formRow: { flexDirection: 'row', gap: space[2] },
  formLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    fontSize: 14, color: colors.ink,
    backgroundColor: colors.white,
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingVertical: space[2],
  },

  toggleGroup: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
    gap: space[3],
  },
});
