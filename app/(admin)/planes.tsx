// ADM-04 · Gestión de planes (sincronizado con la web nudofy.com)
// Lee y escribe en public.plans — fuente única de verdad.
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Pressable, Switch, ScrollView,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { colors, space, radius } from '@/theme';
import { Text, Button, Badge } from '@/components/ui';
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

const FREE_KEYS = ['free', 'free_pro'];
const isFree = (id: string) => FREE_KEYS.includes(id);

export default function AdminPlanesScreen() {
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const { error } = await supabase
      .from('plans')
      .update({
        name: editing.name,
        tagline: editing.tagline,
        price_monthly: editing.price_monthly,
        price_extra_agent: editing.price_extra_agent,
        max_agents: editing.max_agents,
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
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast.error('No se pudo guardar el plan.');
    } else {
      setEditing(null);
      fetchPlans();
      toast.success('Plan actualizado');
    }
  }

  function openEdit(plan: Plan) {
    setEditing({ ...plan });
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
      {loading ? (
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          Cargando planes...
        </Text>
      ) : (
        <View style={styles.list}>
          {plans.map(plan => (
            <View key={plan.id} style={styles.row}>
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
                    {plan.max_catalogs != null ? `${plan.max_catalogs} catálogos` : 'Catálogos ilimitados'}
                  </Text>
                  <Text variant="caption" color="ink4">·</Text>
                  <Text variant="caption" color="ink3">
                    {plan.max_orders_month != null ? `${plan.max_orders_month} pedidos/mes` : 'Pedidos ilimitados'}
                  </Text>
                </View>
              </View>
              <Button
                label="Editar"
                variant="secondary"
                size="sm"
                onPress={() => openEdit(plan)}
              />
            </View>
          ))}
        </View>
      )}

      {/* Modal de edición */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text variant="bodyMedium">Editar plan — {editing?.name}</Text>
              <Pressable
                onPress={() => setEditing(null)}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text variant="smallMedium" color="ink2">Cancelar</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
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

              <FormGroup label="Características" hint="Una por línea — se mostrarán como bullets en la web">
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
                  label="Destacado"
                  hint="Marca el plan como 'Más popular' en la web"
                  value={!!editing?.highlighted}
                  onChange={v => update('highlighted', v)}
                />
                <ToggleRow
                  label="Visible en /precios"
                  hint="Si está apagado, no se muestra en la web pública"
                  value={!!editing?.is_public}
                  onChange={v => update('is_public', v)}
                />
                <ToggleRow
                  label="Activo"
                  hint="Si está apagado, no se puede asignar a nuevos agentes"
                  value={!!editing?.is_active}
                  onChange={v => update('is_active', v)}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => setEditing(null)}
                fullWidth
              />
              <Button
                label={saving ? 'Guardando...' : 'Guardar'}
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
  rowLeft: { flex: 1, gap: space[2] },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  rowMeta: { flexDirection: 'row', gap: space[1] + 2, flexWrap: 'wrap', alignItems: 'center' },

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
