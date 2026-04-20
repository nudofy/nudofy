// A-05 Vista — Editar proveedor
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  ScrollView, StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { useSuppliers } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';

export default function EditarProveedorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const { suppliers, updateSupplier } = useSuppliers();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);       // nueva imagen local
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null); // logo actual en DB
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Cargar datos del proveedor
  useEffect(() => {
    if (!id) return;
    supabase.from('suppliers').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setName(data.name ?? '');
        setContact(data.contact ?? '');
        setPhone(data.phone ?? '');
        setEmail(data.email ?? '');
        setAddress(data.address ?? '');
        setDescription(data.description ?? data.conditions ?? '');
        setExistingLogoUrl(data.logo_url ?? null);
      }
      setLoaded(true);
    });
  }, [id]);

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
      quality: 0.8,
    });
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
    if (!canSave || !id) return;
    setSaving(true);
    try {
      let logoUrl: string | null | undefined = undefined; // undefined = no cambiar
      if (logoUri) {
        logoUrl = await uploadLogo(); // nueva imagen
      } else if (existingLogoUrl === null) {
        logoUrl = null; // logo eliminado
      }

      const updates: Record<string, any> = {
        name: name.trim(),
        contact: contact.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
      };
      if (logoUrl !== undefined) updates.logo_url = logoUrl;

      const { error } = await updateSupplier(id, updates);
      if (error) { Alert.alert('Error', error); return; }
      router.back();
    } catch (e: any) {
      Alert.alert('Error inesperado', e?.message ?? 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  const isBusy = saving || uploadingLogo;
  const displayLogo = logoUri ?? existingLogoUrl;

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Editar proveedor</Text>
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
              {displayLogo ? (
                <Image source={{ uri: displayLogo }} style={styles.logoPreview} resizeMode="contain" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderIcon}>📷</Text>
                  <Text style={styles.logoPlaceholderText}>Añadir logo</Text>
                </View>
              )}
            </TouchableOpacity>
            {displayLogo && (
              <TouchableOpacity onPress={() => { setLogoUri(null); setExistingLogoUrl(null); }}>
                <Text style={styles.removeLogo}>Eliminar foto</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Datos */}
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

          <TouchableOpacity
            style={[styles.mainSaveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || isBusy}
          >
            {isBusy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.mainSaveBtnText}>Guardar cambios</Text>
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
    backgroundColor: colors.dark,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)' },
  back: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginRight: 12 },
  topbarTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#ffffff' },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.brand },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  content: { padding: 16, gap: 16 },
  logoSection: { alignItems: 'center', gap: 8 },
  logoPicker: {
    width: 100, height: 100, borderRadius: 20,
    overflow: 'hidden' },
  logoPreview: { width: 100, height: 100, backgroundColor: '#fff' },
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
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center' },
  mainSaveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' } });
