// Gestión de tarifas del agente
// CRUD de tarifas (nombre, posición). Los precios por tarifa se gestionan
// en cada producto. La tarifa se asigna al cliente desde su ficha.

import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, TextInput,
  Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

type Tariff = {
  id: string;
  name: string;
  position: number;
};

export default function TarifasScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  async function fetchTariffs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tariffs')
      .select('id, name, position')
      .order('position');
    if (error) toast.error(error.message);
    setTariffs((data ?? []) as Tariff[]);
    setLoading(false);
  }

  useEffect(() => { fetchTariffs(); }, []);

  async function handleCreate() {
    if (!newName.trim() || !user?.id) return;
    const { error } = await supabase.from('tariffs').insert({
      agent_id: user.id,
      name: newName.trim(),
      position: tariffs.length,
    });
    if (error) { toast.error(error.message); return; }
    setNewName('');
    setCreating(false);
    fetchTariffs();
  }

  function startEdit(t: Tariff) {
    setEditingId(t.id);
    setEditName(t.name);
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase
      .from('tariffs')
      .update({ name: editName.trim() })
      .eq('id', editingId);
    if (error) { toast.error(error.message); return; }
    setEditingId(null);
    fetchTariffs();
  }

  function handleDelete(t: Tariff) {
    Alert.alert(
      'Eliminar tarifa',
      `¿Eliminar la tarifa "${t.name}"? Se borrarán también los precios de cada producto en esa tarifa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('tariffs').delete().eq('id', t.id);
            fetchTariffs();
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <TopBar
        title="Tarifas"
        onBack={() => router.back()}
        actions={[
          { icon: 'Plus', onPress: () => setCreating(true), accessibilityLabel: 'Nueva tarifa' },
        ]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.help}>
            <Icon name="Info" size={18} color={colors.brand} />
            <Text variant="small" color="ink2" style={{ flex: 1 }}>
              Crea tarifas para asignarlas a tus clientes. Después puedes definir un precio
              específico por tarifa en cada producto. Si un producto no tiene precio para
              una tarifa, se usa el precio base.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.ink} style={{ marginTop: space[6] }} />
          ) : tariffs.length === 0 && !creating ? (
            <View style={styles.empty}>
              <Text variant="small" color="ink3" align="center">
                Aún no tienes tarifas creadas.
              </Text>
              <Button
                label="Crear primera tarifa"
                icon="Plus"
                onPress={() => setCreating(true)}
                style={{ marginTop: space[3] }}
              />
            </View>
          ) : (
            <View style={styles.list}>
              {tariffs.map(t => (
                <View key={t.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    {editingId === t.id ? (
                      <TextInput
                        style={styles.input}
                        value={editName}
                        onChangeText={setEditName}
                        autoFocus
                        placeholderTextColor={colors.ink4}
                      />
                    ) : (
                      <Text variant="bodyMedium">{t.name}</Text>
                    )}
                  </View>
                  {editingId === t.id ? (
                    <>
                      <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                        <Icon name="X" size={18} color={colors.ink3} />
                      </Pressable>
                      <Pressable onPress={handleSaveEdit} hitSlop={8}>
                        <Icon name="Check" size={18} color={colors.brand} />
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={() => startEdit(t)} hitSlop={8}>
                        <Icon name="Pencil" size={16} color={colors.ink3} />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(t)} hitSlop={8}>
                        <Icon name="Trash2" size={16} color={colors.danger} />
                      </Pressable>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}

          {creating && (
            <View style={styles.createBox}>
              <Text variant="smallMedium" style={{ marginBottom: space[2] }}>Nueva tarifa</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Ej: Mayorista, Tienda VIP, Tarifa 2..."
                placeholderTextColor={colors.ink4}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[2] }}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  size="sm"
                  onPress={() => { setCreating(false); setNewName(''); }}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Crear"
                  size="sm"
                  onPress={handleCreate}
                  disabled={!newName.trim()}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[3] },
  help: {
    flexDirection: 'row',
    gap: space[2],
    backgroundColor: colors.brandSoft,
    padding: space[3],
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[6],
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.line,
  },
  list: { gap: space[2] },
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  createBox: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: 10,
    fontSize: 14, color: colors.ink, backgroundColor: colors.white,
  },
});
