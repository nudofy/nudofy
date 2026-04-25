// A-10 · Perfil y ajustes del agente
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, Pressable,
  ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { useAgent } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

export default function PerfilScreen() {
  const router = useRouter();
  const toast = useToast();
  const { agent } = useAgent();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name ?? '');
      setPhone(agent.phone ?? '');
      setEmail(agent.email ?? '');
    }
  }, [agent]);

  async function handleSave() {
    if (!agent) return;
    setSaving(true);
    const { error } = await supabase
      .from('agents')
      .update({ name: name.trim(), phone: phone.trim() || null })
      .eq('id', agent.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setEditing(false);
    toast.success('Perfil actualizado');
  }

  async function handleChangePassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'nudofy://reset-password',
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Hemos enviado un enlace a ${email} para cambiar tu contraseña.`);
  }

  return (
    <Screen>
      <TopBar
        title="Perfil y ajustes"
        onBack={() => router.back()}
        actions={[{
          icon: editing ? 'Check' : 'Pencil',
          onPress: () => editing ? handleSave() : setEditing(true),
          accessibilityLabel: editing ? 'Guardar' : 'Editar',
          disabled: saving,
        }]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Datos personales */}
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Datos personales</Text>
            <View style={styles.sectionBody}>
              <View style={[styles.field, styles.fieldBorder]}>
                <Text variant="caption" color="ink3">Nombre</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.ink4}
                  />
                ) : (
                  <Text variant="body" style={{ marginTop: 4 }}>{name || '—'}</Text>
                )}
              </View>

              <View style={[styles.field, styles.fieldBorder]}>
                <Text variant="caption" color="ink3">Email</Text>
                <Text variant="body" style={{ marginTop: 4 }}>{email || '—'}</Text>
                <Text variant="caption" color="ink4" style={{ marginTop: 2 }}>
                  El email no se puede cambiar desde aquí
                </Text>
              </View>

              <View style={[styles.field, styles.fieldBorder]}>
                <Text variant="caption" color="ink3">Teléfono</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="000 000 000"
                    placeholderTextColor={colors.ink4}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text variant="body" style={{ marginTop: 4 }}>{phone || '—'}</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text variant="caption" color="ink3">Plan</Text>
                <Text variant="bodyMedium" style={{ marginTop: 4, textTransform: 'capitalize' }}>
                  {agent?.plan ?? '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Seguridad */}
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Seguridad</Text>
            <View style={styles.sectionBody}>
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
                onPress={handleChangePassword}
              >
                <Icon name="KeyRound" size={18} color={colors.ink2} />
                <Text variant="body" style={{ flex: 1 }}>Cambiar contraseña</Text>
                <Icon name="ChevronRight" size={18} color={colors.ink4} />
              </Pressable>
            </View>
          </View>

          {editing && (
            <Button
              label="Guardar cambios"
              onPress={handleSave}
              loading={saving}
              fullWidth
              style={{ marginTop: space[2] }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[4] },

  section: { gap: space[2] },
  sectionTitle: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginLeft: space[1],
  },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },

  field: {
    paddingHorizontal: space[3], paddingVertical: space[3],
  },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  input: {
    fontSize: 15, color: colors.ink,
    marginTop: 4, paddingVertical: 2,
  },

  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[3], paddingVertical: space[3],
    gap: space[3],
  },
});
