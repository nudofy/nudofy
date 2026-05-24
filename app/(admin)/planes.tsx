// ADM-04 · Gestión de planes (sincronizado con la web nudofy.com)
// Lee y escribe en public.plans — fuente única de verdad.
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Pressable, Switch, ScrollView,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
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
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newId, setNewId] = useState('');

  async function fetchPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('sort_order');
    if (error) {
      toast.error('No se pudieron cargar los planes');
    } else if (data) {
      setPlans(data as Plan[]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchPlans(); }, []);

  async function savePlan() {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);

    if (isNew) {
      if (!newId.trim()) { toast.error('El ID del plan es obligatorio'); setSaving(false); return; }
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
      if (error) { toast.error('No se pudo guardar el plan.'); setSaving(false); return; }
    }

    setSaving(false);
    setEditing(null);
    setIsNew(false);
    setNewId('');
    fetchPlans();
    toast.success(isNew ? 'Plan creado' : 'Plan actualizado');
  }

  async function toggleActive(plan: Plan) {
    const { error } = await supabase
      .from('plans')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id);
    if (error) { toast.error('No se pudo actualizar'); return; }
    toast.success(plan.is_active ? 'Plan desactivado' : 'Plan activado');
    fetchPlans();
  }

  function confirmDelete(plan: Plan) {
    Alert.alert(
      'Eliminar plan',
      `¿Eliminar "${plan.name}"? Los agentes que lo tengan asignado no se verán afectados, pero no se podrá asignar a nuevos agentes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            const { error } = await supabase.from('plans').delete().eq('id', plan.id);
            if (error) { toast.error(error.message); return; }
            toast.success('Plan eliminado');
            fetchPlans();
          }
        },
      ]
    );
  }

  function openEdit(plan: Plan) {
    setIsNew(false);
    setNewId('');
    setEditing({ ...plan });
  }

  function openNew() {
    setIsNew(true);
    setNewId('');
    setEditing({ ...EMPTY_PLAN } as Plan);
  }

  function update<K extends keyof Plan>(field: K, value: Plan[K]) {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  }

  function updateNum(field: keyof Plan, value: string) {
    if (!editing) return;
    const v = value.trim();
    setEditing({ ...editing, [field]: v === '' ? null : Number(v) } as Plan);
  }

  function priceLabel(plan: Plan) {
    if (plan.price_monthly == null) return 'A medida';
    if (plan.price_monthly === 0) return 'Gratis';
    return `${plan.price_monthly} €/mes`;
  }

  return (
    <AdminShell activeSection="planes" title="Planes">
      {/* Botón nuevo plan */}
      <View style={styles.toolbar}>
        <Button label="+ Nuevo plan" onPress={openNew} size="sm" />
      </View>

      {loading ? (
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          Cargando planes...
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
                  {plan.highlighted && <Badge label="Destacado" variant="warning" />}
                  {!plan.is_public && <Badge label="Interno" variant="neutral" />}
                  {!plan.is_active && <Badge label="Inactivo" variant="danger" />}
                  <Text variant="smallMedium">{priceLabel(plan)}</Text>
                </View>
                <View style={styles.rowMeta}>
                  <Text variant="caption" color="ink3">
                    {plan.max_clients != null ? `${plan.max_clients} clientes` : 'Clientes ilimitados'}
                  </Text>
                  <Text variant="caption" color="ink4">·</Text>
                  <Text variant="caption" color="ink3">
                    {plan.max_products != null ? `${plan.max_products} productos` : 'Productos ilimitados'}
                  </Text>
                  <Text variant="caption" color="ink4">·</Text>
                  <Text variant="caption" color="ink3">
                    {plan.max_orders_month != null ? `${plan.max_orders_month} pedidos/mes` : 'Pedidos ilimitados'}
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
              <Text variant="bodyMedium">{isNew ? 'Nuevo plan' : `Editar — ${editing?.name}`}</Text>
              <Pressable
                onPress={() => { setEditing(null); setIsNew(false); }}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text variant="smallMedium" color="ink2">Cancelar</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
              {isNew && (
                <FormGroup label="ID del plan" hint="Único, sin espacios (ej: basic, pro_plus)">
                  <TextInput
                    style={styles.input}
                    value={newId}
                    onChangeText={v => setNewId(v.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="ej: pro_plus"
                    placeholderTextColor={colors.ink4}
                    autoCapitalize="none"
                  />
                </FormGroup>
              )}

              <FormGroup label="Nombre">
                <TextInput
                  style={styles.input}
                  value={editing?.name ?? ''}
                  onChangeText={v => update('name', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label="Tagline" hint="Frase corta bajo el nombre">
                <TextInput
                  style={styles.input}
                  value={editing?.tagline ?? ''}
                  onChangeText={v => update('tagline', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <View style={styles.formRow}>
                <FormGroup label="Precio (€/mes)" hint="Vacío = a medida">
                  <TextInput
                    style={styles.input}
                    value={editing?.price_monthly?.toString() ?? ''}
                    keyboardType="numeric"
                    placeholder="A medida"
                    onChangeText={v => updateNum('price_monthly', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label="Extra/agente (€)" hint="Solo Empresa">
                  <TextInput
                    style={styles.input}
                    value={editing?.price_extra_agent?.toString() ?? ''}
                    keyboardType="numeric"
                    placeholder="—"
                    onChangeText={v => updateNum('price_extra_agent', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <View style={styles.formRow}>
                <FormGroup label="Máx. clientes" hint="Vacío = ilimitado">
                  <TextInput
                    style={styles.input}
                    value={editing?.max_clients?.toString() ?? ''}
                    keyboardType="numeric"
                    placeholder="Ilimitado"
                    onChangeText={v => updateNum('max_clients', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label="Máx. productos" hint="Vacío = ilimitado">
                  <TextInput
                    style={styles.input}
                    value={editing?.max_products?.toString() ?? ''}
                    keyboardType="numeric"
                    placeholder="Ilimitado"
                    onChangeText={v => updateNum('max_products', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <View style={styles.formRow}>
                <FormGroup label="Máx. pedidos/mes" hint="Vacío = ilimitado">
                  <TextInput
                    style={styles.input}
                    value={editing?.max_orders_month?.toString() ?? ''}
                    keyboardType="numeric"
                    placeholder="Ilimitado"
                    onChangeText={v => updateNum('max_orders_month', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label="Agentes incluidos" hint="De serie en el precio base">
                  <TextInput
                    style={styles.input}
                    value={editing?.agents_included?.toString() ?? ''}
                    keyboardType="numeric"
                    placeholder="1"
                    onChangeText={v => updateNum('agents_included', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label="Máx. agentes" hint="Vacío = ilimitado">
                  <TextInput
                    style={styles.input}
                    value={editing?.max_agents?.toString() ?? ''}
                    keyboardType="numeric"
                    placeholder="Ilimitado"
                    onChangeText={v => updateNum('max_agents', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <View style={styles.formRow}>
                <FormGroup label="Máx. catálogos" hint="Vacío = ilimitado">
                  <TextInput
                    style={styles.input}
                    value={editing?.max_catalogs?.toString() ?? ''}
                    keyboardType="numeric"
                    placeholder="Ilimitado"
                    onChangeText={v => updateNum('max_catalogs', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
                <FormGroup label="Días de trial">
                  <TextInput
                    style={styles.input}
                    value={editing?.trial_days?.toString() ?? '15'}
                    keyboardType="numeric"
                    onChangeText={v => updateNum('trial_days', v)}
                    placeholderTextColor={colors.ink4}
                  />
                </FormGroup>
              </View>

              <FormGroup label="Orden (sort)" hint="Número menor = aparece antes">
                <TextInput
                  style={styles.input}
                  value={editing?.sort_order?.toString() ?? '99'}
                  keyboardType="numeric"
                  onChangeText={v => updateNum('sort_order', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label="Características" hint="Una por línea — bullets en la web">
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

              <FormGroup label="Texto del botón (CTA)">
                <TextInput
                  style={styles.input}
                  value={editing?.cta_label ?? ''}
                  onChangeText={v => update('cta_label', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label="URL del botón (CTA)">
                <TextInput
                  style={styles.input}
                  value={editing?.cta_href ?? ''}
                  onChangeText={v => update('cta_href', v)}
                  placeholder="/contacto o https://app.nudofy.com/registro?plan=..."
                  placeholderTextColor={colors.ink4}
                  autoCapitalize="none"
                />
              </FormGroup>

              <View style={styles.toggleGroup}>
                <ToggleRow
                  label="Activo"
                  hint="Si está apagado, no se puede asignar a nuevos agentes"
                  value={!!editing?.is_active}
                  onChange={v => update('is_active', v)}
                />
                <ToggleRow
                  label="Visible en /precios"
                  hint="Si está apagado, no se muestra en la web pública"
                  value={!!editing?.is_public}
                  onChange={v => update('is_public', v)}
                />
                <ToggleRow
                  label="Destacado"
                  hint="Marca el plan como 'Más popular' en la web"
                  value={!!editing?.highlighted}
                  onChange={v => update('highlighted', v)}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => { setEditing(null); setIsNew(false); }}
                fullWidth
              />
              <Button
                label={saving ? 'Guardando...' : isNew ? 'Crear plan' : 'Guardar'}
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
