// ADM-04 · Gestión de planes
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Pressable,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { colors, space, radius } from '@/theme';
import { Text, Button, Badge } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';

type PlanDef = {
  key: string;
  label: string;
  price: number;
  max_clients: number | null;
  max_catalogs: number | null;
  max_orders_month: number | null;
  active: boolean;
  sort_order: number;
};

const isFree = (key: string) => key === 'free' || key === 'free_pro';

export default function AdminPlanesScreen() {
  const toast = useToast();
  const [plans, setPlans] = useState<PlanDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlanDef | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchPlans() {
    const { data } = await supabase
      .from('plan_definitions')
      .select('*')
      .order('sort_order');
    if (data) setPlans(data);
    setLoading(false);
  }

  useEffect(() => { fetchPlans(); }, []);

  async function savePlan() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('plan_definitions')
      .update({
        label: editing.label,
        price: editing.price,
        max_clients: editing.max_clients,
        max_catalogs: editing.max_catalogs,
        max_orders_month: editing.max_orders_month,
      })
      .eq('key', editing.key);
    setSaving(false);
    if (error) {
      toast.error('No se pudo guardar el plan.');
    } else {
      setEditing(null);
      fetchPlans();
      toast.success('Plan actualizado');
    }
  }

  function openEdit(plan: PlanDef) {
    setEditing({ ...plan });
  }

  function updateField(field: keyof PlanDef, value: string) {
    if (!editing) return;
    const numFields = ['price', 'max_clients', 'max_catalogs', 'max_orders_month'];
    if (numFields.includes(field)) {
      setEditing({ ...editing, [field]: value === '' ? null : Number(value) });
    } else {
      setEditing({ ...editing, [field]: value });
    }
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
            <View key={plan.key} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowHeader}>
                  <Badge
                    label={plan.label}
                    variant={isFree(plan.key) ? 'success' : 'neutral'}
                  />
                  <Text variant="smallMedium">
                    {plan.price === 0 ? 'Gratis' : `${plan.price} €/mes`}
                  </Text>
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
              <Text variant="bodyMedium">Editar plan — {editing?.label}</Text>
              <Pressable
                onPress={() => setEditing(null)}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text variant="smallMedium" color="ink2">Cancelar</Text>
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <FormGroup label="Nombre">
                <TextInput
                  style={styles.input}
                  value={editing?.label ?? ''}
                  onChangeText={v => updateField('label', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label="Precio (€/mes)">
                <TextInput
                  style={styles.input}
                  value={editing?.price?.toString() ?? ''}
                  keyboardType="numeric"
                  onChangeText={v => updateField('price', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label="Máx. clientes" hint="Vacío = ilimitado">
                <TextInput
                  style={styles.input}
                  value={editing?.max_clients?.toString() ?? ''}
                  keyboardType="numeric"
                  placeholder="Ilimitado"
                  onChangeText={v => updateField('max_clients', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label="Máx. catálogos" hint="Vacío = ilimitado">
                <TextInput
                  style={styles.input}
                  value={editing?.max_catalogs?.toString() ?? ''}
                  keyboardType="numeric"
                  placeholder="Ilimitado"
                  onChangeText={v => updateField('max_catalogs', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>

              <FormGroup label="Máx. pedidos/mes" hint="Vacío = ilimitado">
                <TextInput
                  style={styles.input}
                  value={editing?.max_orders_month?.toString() ?? ''}
                  keyboardType="numeric"
                  placeholder="Ilimitado"
                  onChangeText={v => updateField('max_orders_month', v)}
                  placeholderTextColor={colors.ink4}
                />
              </FormGroup>
            </View>

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
  },
  modalHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalBody: { padding: space[3], gap: space[3] },
  modalFooter: {
    padding: space[3],
    borderTopWidth: 1, borderTopColor: colors.line2,
    flexDirection: 'row', gap: space[2],
  },

  formGroup: { gap: space[1] + 2 },
  formLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    fontSize: 14, color: colors.ink,
    backgroundColor: colors.white,
  },
});
