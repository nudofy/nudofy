// ADM-04 · Gestión de planes
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';

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

export default function AdminPlanesScreen() {
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
      Alert.alert('Error', 'No se pudo guardar el plan.');
    } else {
      setEditing(null);
      fetchPlans();
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

  const isFree = (key: string) => key === 'free' || key === 'free_pro';

  return (
    <AdminShell activeSection="planes" title="Planes">
      {loading ? (
        <ActivityIndicator color="#534AB7" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.list}>
          {plans.map(plan => (
            <View key={plan.key} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.badge, isFree(plan.key) && styles.badgeFree]}>
                  <Text style={[styles.badgeText, isFree(plan.key) && styles.badgeTextFree]}>
                    {plan.label}
                  </Text>
                </View>
                <Text style={styles.price}>
                  {plan.price === 0 ? 'Gratis' : `${plan.price} €/mes`}
                </Text>
              </View>
              <View style={styles.rowMeta}>
                <Text style={styles.meta}>
                  {plan.max_clients != null ? `${plan.max_clients} clientes` : 'Ilimitado'}
                </Text>
                <Text style={styles.meta}>
                  {plan.max_catalogs != null ? `${plan.max_catalogs} catálogos` : 'Ilimitado'}
                </Text>
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(plan)}>
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Modal de edición */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar plan — {editing?.label}</Text>

            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={editing?.label ?? ''}
              onChangeText={v => updateField('label', v)}
            />

            <Text style={styles.fieldLabel}>Precio (€/mes)</Text>
            <TextInput
              style={styles.input}
              value={editing?.price?.toString() ?? ''}
              keyboardType="numeric"
              onChangeText={v => updateField('price', v)}
            />

            <Text style={styles.fieldLabel}>Máx. clientes (vacío = ilimitado)</Text>
            <TextInput
              style={styles.input}
              value={editing?.max_clients?.toString() ?? ''}
              keyboardType="numeric"
              placeholder="Ilimitado"
              onChangeText={v => updateField('max_clients', v)}
            />

            <Text style={styles.fieldLabel}>Máx. catálogos (vacío = ilimitado)</Text>
            <TextInput
              style={styles.input}
              value={editing?.max_catalogs?.toString() ?? ''}
              keyboardType="numeric"
              placeholder="Ilimitado"
              onChangeText={v => updateField('max_catalogs', v)}
            />

            <Text style={styles.fieldLabel}>Máx. pedidos/mes (vacío = ilimitado)</Text>
            <TextInput
              style={styles.input}
              value={editing?.max_orders_month?.toString() ?? ''}
              keyboardType="numeric"
              placeholder="Ilimitado"
              onChangeText={v => updateField('max_orders_month', v)}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={savePlan} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#ebebeb',
    padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 10,
  },
  rowLeft: { flex: 1, gap: 4 },
  badge: {
    backgroundColor: '#EEEDFE', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeFree: { backgroundColor: '#E6F7EF' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#3C3489' },
  badgeTextFree: { color: '#1D7A4E' },
  price: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  rowMeta: { gap: 2 },
  meta: { fontSize: 11, color: '#999' },
  editBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0',
  },
  editBtnText: { fontSize: 13, fontWeight: '500', color: '#534AB7' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 4,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: '#888', marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#1a1a1a', marginTop: 4,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: '#666' },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#534AB7', alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
