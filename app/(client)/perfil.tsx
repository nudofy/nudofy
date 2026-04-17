// C-07 · Perfil del cliente
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/useClient';

export default function ClientPerfilScreen() {
  const { signOut } = useAuth();
  const { client, agent, loading } = useClientData();
  const [notifPedidos, setNotifPedidos] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  async function handleChangePassword() {
    if (newPwd.length < 6) { Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Error', 'Las contraseñas no coinciden'); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Listo', 'Contraseña actualizada correctamente');
    setPwdModal(false);
    setNewPwd('');
    setConfirmPwd('');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.title}>Mi perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tarjeta de perfil */}
        <View style={styles.profileCard}>
          <Avatar name={client?.name ?? 'C'} size={56} fontSize={20} />
          <View style={styles.profileBody}>
            <Text style={styles.profileName}>{client?.name ?? '—'}</Text>
            {client?.client_type && (
              <Text style={styles.profileType}>{client.client_type}</Text>
            )}
            <Text style={styles.profileEmail}>{client?.email ?? '—'}</Text>
          </View>
        </View>

        {/* Datos del establecimiento */}
        <Section title="Mi establecimiento">
          <DataRow label="Nombre" value={client?.name ?? '—'} />
          {client?.fiscal_name && <DataRow label="Razón social" value={client.fiscal_name} />}
          {client?.nif && <DataRow label="NIF/CIF" value={client.nif} />}
          {client?.address && <DataRow label="Dirección" value={client.address} />}
          {client?.phone && <DataRow label="Teléfono" value={client.phone} />}
          {client?.email && <DataRow label="Email" value={client.email} />}
          {client?.payment_method && <DataRow label="Forma de pago" value={client.payment_method} />}
        </Section>

        {/* Mi agente */}
        {agent && (
          <Section title="Mi agente">
            <DataRow label="Nombre" value={agent.name} />
            <DataRow label="Email" value={agent.email} />
            {agent.phone && <DataRow label="Teléfono" value={agent.phone} />}
          </Section>
        )}

        {/* Notificaciones */}
        <Section title="Notificaciones">
          <View style={styles.switchRow}>
            <View style={styles.switchBody}>
              <Text style={styles.switchLabel}>Estado de pedidos</Text>
              <Text style={styles.switchSub}>Actualizaciones sobre tus pedidos</Text>
            </View>
            <Switch
              value={notifPedidos}
              onValueChange={setNotifPedidos}
              trackColor={{ true: colors.brand }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchBody}>
              <Text style={styles.switchLabel}>Nuevos catálogos</Text>
              <Text style={styles.switchSub}>Novedades de tus proveedores</Text>
            </View>
            <Switch
              value={notifPromos}
              onValueChange={setNotifPromos}
              trackColor={{ true: colors.brand }}
              thumbColor={colors.white}
            />
          </View>
        </Section>

        {/* Seguridad */}
        <Section title="Seguridad">
          <MenuItem icon="🔑" label="Cambiar contraseña" onPress={() => setPwdModal(true)} />
        </Section>

        {/* Modal cambiar contraseña */}
        <Modal visible={pwdModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Cambiar contraseña</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nueva contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={newPwd}
                onChangeText={setNewPwd}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={confirmPwd}
                onChangeText={setConfirmPwd}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setPwdModal(false); setNewPwd(''); setConfirmPwd(''); }}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={handleChangePassword} disabled={savingPwd}>
                  {savingPwd ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      <ClientBottomTabBar activeTab="perfil" />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBlock}>{children}</View>
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  topbar: {
    backgroundColor: colors.dark,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 18, fontWeight: '500', color: '#ffffff' },
  content: { padding: 14, gap: 14 },
  profileCard: {
    backgroundColor: colors.white, borderRadius: 16,
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileBody: { flex: 1, gap: 2 },
  profileName: { fontSize: 18, fontWeight: '600', color: colors.text },
  profileType: {
    fontSize: 12, color: colors.brand,
    backgroundColor: colors.brandLight, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    marginTop: 2 },
  profileEmail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  section: { gap: 6 },
  sectionTitle: {
    fontSize: 11, fontWeight: '500', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBlock: {
    backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  dataRow: {
    paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 0.5, borderBottomColor: colors.borderLight, gap: 10 },
  dataLabel: { fontSize: 13, color: colors.textMuted, flex: 1 },
  dataValue: { fontSize: 13, color: colors.text, fontWeight: '500', flex: 1.5, textAlign: 'right' },
  switchRow: {
    paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: colors.borderLight, gap: 12 },
  switchBody: { flex: 1 },
  switchLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  switchSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  menuItem: {
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 14, color: colors.text },
  chevron: { fontSize: 18, color: '#ccc' },
  signOutBtn: {
    backgroundColor: colors.white, borderRadius: 14,
    padding: 14, alignItems: 'center' },
  signOutText: { fontSize: 15, color: colors.red, fontWeight: '500' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 4 },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: colors.textMuted },
  modalSave: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: colors.brand, alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: colors.white } });
