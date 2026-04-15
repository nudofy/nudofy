// A-10 · Perfil y ajustes del agente
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useAgent } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';

export default function PerfilScreen() {
  const router = useRouter();
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
    if (error) { Alert.alert('Error', error.message); return; }
    setEditing(false);
  }

  async function handleChangePassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'nudofy://reset-password' });
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Correo enviado', `Hemos enviado un enlace a ${email} para cambiar tu contraseña.`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Más</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Perfil y ajustes</Text>
        <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.purple} />
            : <Text style={styles.editBtn}>{editing ? 'Guardar' : 'Editar'}</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos personales</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={styles.value}>{name || '—'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email || '—'}</Text>
            <Text style={styles.fieldNote}>El email no se puede cambiar desde aquí</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Teléfono</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="000 000 000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{phone || '—'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Plan</Text>
            <Text style={[styles.value, { color: colors.purple, textTransform: 'capitalize' }]}>
              {agent?.plan ?? '—'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <TouchableOpacity style={styles.actionRow} onPress={handleChangePassword}>
            <Text style={styles.actionLabel}>Cambiar contraseña</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5, borderBottomColor: '#efefef' },
  back: { fontSize: 14, color: colors.purple, width: 60 },
  title: { fontSize: 16, fontWeight: '500', color: colors.text },
  editBtn: { fontSize: 14, color: colors.purple, fontWeight: '500', width: 60, textAlign: 'right' },
  content: { padding: 16, gap: 16 },
  section: {
    backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  field: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 0.5, borderTopColor: '#f5f5f5', gap: 4 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  value: { fontSize: 15, color: colors.text },
  fieldNote: { fontSize: 11, color: '#bbb', marginTop: 2 },
  input: {
    fontSize: 15, color: colors.text,
    backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    marginTop: 4 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 0.5, borderTopColor: '#f5f5f5' },
  actionLabel: { flex: 1, fontSize: 15, color: colors.text },
  chevron: { fontSize: 18, color: '#ccc' } });
