// C-07 · Perfil del cliente
import React, { useState } from 'react';
import {
  View, ScrollView, Pressable,
  StyleSheet, Switch, TextInput, Modal, Alert, Linking,
  KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button, Badge } from '@/components/ui';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/useClient';
import { useToast } from '@/contexts/ToastContext';
import type { IconName } from '@/components/ui/Icon';

export default function ClientPerfilScreen() {
  const toast = useToast();
  const { signOut, session } = useAuth();
  const { client, agent, loading } = useClientData();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [notifPedidos, setNotifPedidos] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  async function handleExportData() {
    if (!client) return;
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, created_at, status, total')
      .eq('client_id', client.id);

    const exportData = {
      exportDate: new Date().toISOString(),
      client: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        nif: client.nif,
        fiscal_name: client.fiscal_name,
        payment_method: client.payment_method,
      },
      orders: orders ?? [],
    };

    const json = JSON.stringify(exportData, null, 2);
    await Share.share({ message: json, title: 'Mis datos Nudofy' });
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrará permanentemente tu acceso al portal y todos tus datos. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmDeleteAccount },
      ]
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
    if (newPwd.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (newPwd !== confirmPwd) { toast.error('Las contraseñas no coinciden'); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Contraseña actualizada correctamente');
    setPwdModal(false);
    setNewPwd('');
    setConfirmPwd('');
  }

  if (loading) {
    return (
      <Screen>
        <TopBar title="Mi perfil" />
        <Text variant="small" color="ink3" align="center" style={{ marginTop: space[8] }}>
          Cargando...
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Mi perfil" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tarjeta de perfil */}
        <View style={styles.profileCard}>
          <Avatar name={client?.name ?? 'C'} size={56} fontSize={20} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="title">{client?.name ?? '—'}</Text>
            {client?.client_type && (
              <View style={{ alignSelf: 'flex-start' }}>
                <Badge label={client.client_type} variant="neutral" />
              </View>
            )}
            <Text variant="caption" color="ink3">{client?.email ?? '—'}</Text>
          </View>
        </View>

        {/* Datos establecimiento */}
        <Section title="Mi establecimiento">
          <DataRow label="Nombre" value={client?.name ?? '—'} />
          {client?.fiscal_name && <DataRow label="Razón social" value={client.fiscal_name} />}
          {client?.nif && <DataRow label="NIF/CIF" value={client.nif} />}
          {client?.address && <DataRow label="Dirección" value={client.address} />}
          {client?.phone && <DataRow label="Teléfono" value={client.phone} />}
          {client?.email && <DataRow label="Email" value={client.email} />}
          {client?.payment_method && <DataRow label="Forma de pago" value={client.payment_method} last />}
        </Section>

        {/* Mi agente */}
        {agent && (
          <Section title="Mi agente">
            <DataRow label="Nombre" value={agent.name} />
            <DataRow label="Email" value={agent.email} />
            {agent.phone && <DataRow label="Teléfono" value={agent.phone} last />}
          </Section>
        )}

        {/* Notificaciones */}
        <Section title="Notificaciones">
          <View style={[styles.switchRow, styles.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text variant="body">Estado de pedidos</Text>
              <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                Actualizaciones sobre tus pedidos
              </Text>
            </View>
            <Switch
              value={notifPedidos}
              onValueChange={setNotifPedidos}
              trackColor={{ true: colors.ink, false: colors.line }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text variant="body">Nuevos catálogos</Text>
              <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                Novedades de tus proveedores
              </Text>
            </View>
            <Switch
              value={notifPromos}
              onValueChange={setNotifPromos}
              trackColor={{ true: colors.ink, false: colors.line }}
              thumbColor={colors.white}
            />
          </View>
        </Section>

        {/* Seguridad */}
        <Section title="Seguridad">
          <MenuItem icon="KeyRound" label="Cambiar contraseña" onPress={() => setPwdModal(true)} last />
        </Section>

        {/* Privacidad y datos */}
        <Section title="Privacidad y datos">
          <MenuItem
            icon="Download"
            label="Exportar mis datos"
            onPress={handleExportData}
          />
          <MenuItem
            icon="Shield"
            label="Política de privacidad"
            onPress={() => Linking.openURL('https://nudofy.com/privacidad')}
            last
          />
        </Section>

        {/* Zona peligrosa */}
        <Section title="Zona de peligro">
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            <Icon name="Trash2" size={18} color={colors.danger ?? '#E73121'} />
            <Text variant="body" style={{ flex: 1, color: colors.danger ?? '#E73121' }}>
              {deletingAccount ? 'Eliminando...' : 'Eliminar mi cuenta'}
            </Text>
            <Icon name="ChevronRight" size={18} color={colors.ink4} />
          </Pressable>
        </Section>

        {/* Cerrar sesión */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
          onPress={signOut}
        >
          <Icon name="LogOut" size={18} color={colors.danger} />
          <Text variant="bodyMedium" color="danger">Cerrar sesión</Text>
        </Pressable>
      </ScrollView>

      {/* Modal cambiar contraseña */}
      <Modal visible={pwdModal} transparent animationType="slide" onRequestClose={() => setPwdModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text variant="heading" style={{ marginBottom: space[3] }}>Cambiar contraseña</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nueva contraseña"
                placeholderTextColor={colors.ink4}
                secureTextEntry
                value={newPwd}
                onChangeText={setNewPwd}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.ink4}
                secureTextEntry
                value={confirmPwd}
                onChangeText={setConfirmPwd}
              />
              <View style={styles.modalActions}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => { setPwdModal(false); setNewPwd(''); setConfirmPwd(''); }}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Guardar"
                  onPress={handleChangePassword}
                  loading={savingPwd}
                  disabled={!newPwd || !confirmPwd}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ClientBottomTabBar activeTab="perfil" />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" color="ink3" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function DataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.dataRow, !last && styles.rowBorder]}>
      <Text variant="small" color="ink3" style={{ flex: 1 }}>{label}</Text>
      <Text variant="smallMedium" style={{ flex: 1.5, textAlign: 'right' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, last }: {
  icon: IconName; label: string; onPress?: () => void; last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Icon name={icon} size={18} color={colors.ink2} />
      <Text variant="body" style={{ flex: 1 }}>{label}</Text>
      <Icon name="ChevronRight" size={18} color={colors.ink4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[4] },

  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[4],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

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

  dataRow: {
    paddingHorizontal: space[3], paddingVertical: space[3],
    flexDirection: 'row', alignItems: 'flex-start',
    gap: space[3],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },

  switchRow: {
    paddingHorizontal: space[3], paddingVertical: space[3],
    flexDirection: 'row', alignItems: 'center',
    gap: space[3],
  },

  menuItem: {
    paddingHorizontal: space[3], paddingVertical: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
  },

  signOutBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: space[5], gap: space[2],
  },
  modalInput: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[3],
    fontSize: 14, color: colors.ink,
  },
  modalActions: {
    flexDirection: 'row', gap: space[2], marginTop: space[3],
  },
});
