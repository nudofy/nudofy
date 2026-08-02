// Gestión de tarifas del agente
// CRUD de tarifas (nombre, posición). Los precios por tarifa se gestionan
// en cada producto. La tarifa se asigna al cliente desde su ficha.

import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, TextInput,
  ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { confirmDestructive } from '@/lib/confirm';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentContext } from '@/contexts/AgentContext';
import { useToast } from '@/contexts/ToastContext';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { FeatureLock } from '@/components/ui';

type Tariff = {
  id: string;
  name: string;
  position: number;
  discount_percent: number | null;
};

export default function TarifasScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { t } = useTranslation('agent');
  const toast = useToast();
  const { user } = useAuth();
  const { agent } = useAgentContext();
  const { allowed, loading: gateLoading, requiredPlan } = useFeatureGate('custom_tariffs');

  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDiscount, setEditDiscount] = useState('');

  async function fetchTariffs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tariffs')
      .select('id, name, position, discount_percent')
      .order('position');
    if (error) toast.error(error.message);
    setTariffs((data ?? []) as Tariff[]);
    setLoading(false);
  }

  useEffect(() => { fetchTariffs(); }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    if (!agent?.id) {
      toast.error(t('tariffs.account_error'));
      return;
    }
    const discountNum = parseDiscount(newDiscount);
    const { error } = await supabase.from('tariffs').insert({
      agent_id: agent.id,
      name: newName.trim(),
      position: tariffs.length,
      discount_percent: discountNum,
    });
    if (error) { toast.error(error.message); return; }
    setNewName('');
    setNewDiscount('');
    setCreating(false);
    fetchTariffs();
  }

  function parseDiscount(s: string): number | null {
    const v = s.trim().replace(',', '.').replace('%', '');
    if (v === '') return null;
    const num = parseFloat(v);
    if (isNaN(num) || num < 0 || num > 100) return null;
    return num;
  }

  function startEdit(tariff: Tariff) {
    setEditingId(tariff.id);
    setEditName(tariff.name);
    setEditDiscount(tariff.discount_percent != null ? String(tariff.discount_percent) : '');
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase
      .from('tariffs')
      .update({
        name: editName.trim(),
        discount_percent: parseDiscount(editDiscount),
      })
      .eq('id', editingId);
    if (error) { toast.error(error.message); return; }
    setEditingId(null);
    fetchTariffs();
  }

  function handleDelete(tariff: Tariff) {
    confirmDestructive(
      t('tariffs.delete_title'),
      t('tariffs.delete_body', { name: tariff.name }),
      async () => {
        await supabase.from('tariffs').delete().eq('id', tariff.id);
        fetchTariffs();
      }
    );
  }

  if (gateLoading) return <Screen><TopBar title={t('tariffs.title')} onBack={() => goBack()} /></Screen>;

  if (!allowed) {
    return (
      <Screen>
        <TopBar title={t('tariffs.title')} onBack={() => goBack()} />
        <FeatureLock
          requiredPlan={requiredPlan}
          title={t('tariffs.gate_title', { plan: requiredPlan })}
          description={t('tariffs.gate_description')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title={t('tariffs.title')}
        onBack={() => goBack()}
        actions={[
          { icon: 'Plus', onPress: () => setCreating(true), accessibilityLabel: t('tariffs.new_tariff') },
        ]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.help}>
            <Icon name="Info" size={18} color={colors.brand} />
            <Text variant="small" color="ink2" style={{ flex: 1 }}>
              {t('tariffs.help_text')}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.ink} style={{ marginTop: space[6] }} />
          ) : tariffs.length === 0 && !creating ? (
            <View style={styles.empty}>
              <Text variant="small" color="ink3" align="center">
                {t('tariffs.no_tariffs')}
              </Text>
              <Button
                label={t('tariffs.create_first')}
                icon="Plus"
                onPress={() => setCreating(true)}
                style={{ marginTop: space[3] }}
              />
            </View>
          ) : (
            <View style={styles.list}>
              {tariffs.map(tariff => (
                <View key={tariff.id} style={styles.row}>
                  <View style={{ flex: 1, gap: 4 }}>
                    {editingId === tariff.id ? (
                      <>
                        <TextInput
                          style={styles.input}
                          value={editName}
                          onChangeText={setEditName}
                          autoFocus
                          placeholder={t('tariffs.name_placeholder')}
                          placeholderTextColor={colors.ink4}
                        />
                        <TextInput
                          style={styles.input}
                          value={editDiscount}
                          onChangeText={setEditDiscount}
                          keyboardType="decimal-pad"
                          placeholder={t('tariffs.discount_placeholder')}
                          placeholderTextColor={colors.ink4}
                        />
                      </>
                    ) : (
                      <>
                        <Text variant="bodyMedium">{tariff.name}</Text>
                        <Text variant="caption" color="ink3">
                          {tariff.discount_percent != null
                            ? t('tariffs.discount_label', { percent: tariff.discount_percent })
                            : t('tariffs.no_discount')}
                        </Text>
                      </>
                    )}
                  </View>
                  {editingId === tariff.id ? (
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
                      <Pressable onPress={() => startEdit(tariff)} hitSlop={8}>
                        <Icon name="Pencil" size={16} color={colors.ink3} />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(tariff)} hitSlop={8}>
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
              <Text variant="smallMedium" style={{ marginBottom: space[2] }}>{t('tariffs.new_tariff_title')}</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder={t('tariffs.name_example_placeholder')}
                placeholderTextColor={colors.ink4}
                autoFocus
              />
              <Text variant="caption" color="ink3" style={{ marginTop: space[2] }}>
                {t('tariffs.global_discount_label')}
              </Text>
              <TextInput
                style={[styles.input, { marginTop: 4 }]}
                value={newDiscount}
                onChangeText={setNewDiscount}
                keyboardType="decimal-pad"
                placeholder={t('tariffs.global_discount_placeholder')}
                placeholderTextColor={colors.ink4}
              />
              <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[2] }}>
                <Button
                  label={t('tariffs.cancel')}
                  variant="secondary"
                  size="sm"
                  onPress={() => { setCreating(false); setNewName(''); setNewDiscount(''); }}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('tariffs.create')}
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
