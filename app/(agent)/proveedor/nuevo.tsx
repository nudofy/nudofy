// A-05 Vista 0 — Nuevo proveedor
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  ScrollView, StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { useSuppliers } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';

export default function NuevoProveedorScreen() {
  const router = useRouter();
  const { createSupplier } = useSuppliers();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0;

  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para subir el logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  }

  async function uploadLogo(): Promise<string | null> {
    if (!logoUri) return null;
    setUploadingLogo(true);
    try {
      const ext = logoUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const filename = `${Date.now()}.${ext}`;
      const response = await fetch(logoUri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('supplier-logos')
        .upload(filename, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      if (error) { Alert.alert('Error subiendo imagen', error.message); return null; }
      const { data } = supabase.storage.from('supplier-logos').getPublicUrl(filename);
      return data.publicUrl;
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const logoUrl = await uploadLogo();
      const { error, data } = await createSupplier({
        name: name.trim(),
        contact: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        logo_url: logoUrl ?? undefined,
        active: true });
      if (error) { Alert.alert('Error', error); return; }
      if (data?.id) {
        router.replace(`/(agent)/proveedor/${data.id}` as any);
      } else {
        router.back();
      }
    } catch (e: any) {
      Alert.alert('Error inesperado', e?.message ?? 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  const isBusy = saving || uploadingLogo;

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Nuevo proveedor</Text>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || isBusy}
        >
          {isBusy
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoPicker} onPress={pickLogo}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoPreview} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderIcon}>📷</Text>
                <Text style={styles.logoPlaceholderText}>Añadir logo</Text>
              </View>
            )}
          </TouchableOpacity>
          {logoUri && (
            <TouchableOpacity onPress={() => setLogoUri(null)}>
              <Text style={styles.removeLogo}>Eliminar foto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Datos principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del proveedor</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nombre comercial"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Persona de contacto</Text>
            <TextInput
              style={styles.input}
              value={contact}
              onChangeText={setContact}
              placeholder="Nombre del contacto"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="000 000 000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@proveedor.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Calle, ciudad, código postal"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descripción / Condiciones</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Notas, condiciones de pago, descuentos..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.mainSaveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || isBusy}
        >
          {isBusy
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.mainSaveBtnText}>Guardar proveedor</Text>
          }
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  back: { fontSize: 14, color: colors.purple, marginRight: 12 },
  topbarTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.purple },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  content: { padding: 16, gap: 16 },
  logoSection: { alignItems: 'center', gap: 8 },
  logoPicker: {
    width: 100, height: 100, borderRadius: 20,
    overflow: 'hidden' },
  logoPreview: { width: 100, height: 100 },
  logoPlaceholder: {
    width: 100, height: 100, borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4 },
  logoPlaceholderIcon: { fontSize: 24 },
  logoPlaceholderText: { fontSize: 11, color: colors.textMuted },
  removeLogo: { fontSize: 12, color: '#C0392B' },
  section: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: colors.textMuted, marginBottom: 2 },
  field: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  required: { color: '#E53E3E' },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text },
  textarea: { minHeight: 90 },
  mainSaveBtn: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center' },
  mainSaveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' } });
