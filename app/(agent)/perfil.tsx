// A-10 · Perfil y ajustes del agente
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, Pressable,
  ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { confirmDestructive } from '@/lib/confirm';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { useAgentContext } from '@/contexts/AgentContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

export default function PerfilScreen() {
  const router = useRouter();
  const toast = useToast();
  const { agent } = useAgentContext();
  const { signOut, session } = useAuth();
  const [editing, setEditing] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
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

  async function handleExportData() {
    if (!agent) return;
    const { data: clients } = await supabase
      .from('clients').select('name, email, phone, address, nif, fiscal_name, payment_method, notes').eq('agent_id', agent.id);
    const { data: orders } = await supabase
      .from('orders').select('id, created_at, status, total').eq('agent_id', agent.id);

    const exportData = {
      exportDate: new Date().toISOString(),
      agent: { name: agent.name, email: agent.email, phone: agent.phone, plan: agent.plan },
      clients: clients ?? [],
      orders: orders ?? [],
    };

    const json = JSON.stringify(exportData, null, 2);
    // En móvil compartimos via Share
    const { Share } = await import('react-native');
    await Share.share({ message: json, title: 'Mis datos Nudofy' });
  }

  function handleDeleteAccount() {
    confirmDestructive(
      'Eliminar cuenta',
      'Se borrarán permanentemente tu cuenta, todos tus clientes, catálogos, pedidos y datos. Esta acción no se puede deshacer.',
      confirmDeleteAccount
    );
  }

  async function confirmDeleteAccount() {
    if (!session) return;
    setDeletingAccount(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Error al eliminar la cuenta');
      } else {
        await signOut();
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setDeletingAccount(false);
    }
  }

  async function handleChangePassword() {
    if (!email) return;
    // En web 'nudofy://reset-password' no lo entiende el navegador — mandar
    // una URL https real de vuelta a este mismo sitio.
    const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'nudofy://reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      const msg = error.status === 429 || /rate limit/i.test(error.message ?? '')
        ? 'Ya se ha enviado un enlace hace poco. Espera un minuto e inténtalo de nuevo.'
        : error.message;
      toast.error(msg);
      return;
    }
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

          {/* Privacidad y datos */}
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Privacidad y datos</Text>
            <View style={styles.sectionBody}>
              <Pressable
                style={({ pressed }) => [styles.actionRow, styles.fieldBorder, pressed && { opacity: 0.7 }]}
                onPress={handleExportData}
              >
                <Icon name="Download" size={18} color={colors.ink2} />
                <Text variant="body" style={{ flex: 1 }}>Exportar mis datos</Text>
                <Icon name="ChevronRight" size={18} color={colors.ink4} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
                onPress={() => Linking.openURL('https://nudofy.com/privacidad')}
              >
                <Icon name="Shield" size={18} color={colors.ink2} />
                <Text variant="body" style={{ flex: 1 }}>Política de privacidad</Text>
                <Icon name="ChevronRight" size={18} color={colors.ink4} />
              </Pressable>
            </View>
          </View>

          {/* Zona peligrosa */}
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Zona de peligro</Text>
            <View style={styles.sectionBody}>
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
              >
                <Icon name="Trash2" size={18} color={colors.danger ?? '#E73121'} />
                <Text variant="body" style={{ flex: 1, color: colors.danger ?? '#E73121' }}>
                  {deletingAccount ? 'Eliminando...' : 'Eliminar mi cuenta'}
                </Text>
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
        <Text variant="caption" color="ink4" align="center" style={{ paddingBottom: space[4] }}>
          v{Constants.expoConfig?.version ?? '—'}
        </Text>
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
