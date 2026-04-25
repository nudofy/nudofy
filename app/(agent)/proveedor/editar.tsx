// A-05 Vista — Editar proveedor
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, Pressable, Image,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { useSuppliers } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { SupplierSchema, validate } from '@/lib/validation';

export default function EditarProveedorScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const { updateSupplier } = useSuppliers();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
      toast.error('Necesitamos acceso a tu galería para subir el logo.');
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
      if (error) { toast.error('Error subiendo imagen: ' + error.message); return null; }
      const { data } = supabase.storage.from('supplier-logos').getPublicUrl(filename);
      return data.publicUrl;
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    if (!canSave || !id) return;
    const v = validate(SupplierSchema, {
      name, contact, phone, email, address, description,
    });
    if (!v.ok) { toast.error(v.firstError); return; }

    setSaving(true);
    try {
      let logoUrl: string | null | undefined = undefined;
      if (logoUri) {
        logoUrl = await uploadLogo();
      } else if (existingLogoUrl === null) {
        logoUrl = null;
      }

      const updates: Record<string, any> = {
        name: v.data.name,
        contact: v.data.contact ?? null,
        phone: v.data.phone ?? null,
        email: v.data.email ?? null,
        address: v.data.address ?? null,
        description: v.data.description ?? null,
      };
      if (logoUrl !== undefined) updates.logo_url = logoUrl;

      const { error } = await updateSupplier(id, updates);
      if (error) { toast.error(error); return; }
      toast.success('Proveedor actualizado');
      router.back();
    } catch (e: any) {
      toast.error(e?.message ?? 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  const isBusy = saving || uploadingLogo;
  const displayLogo = logoUri ?? existingLogoUrl;

  if (!loaded) {
    return (
      <Screen>
        <TopBar title="Editar proveedor" onBack={() => router.back()} />
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.ink} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title="Editar proveedor"
        onBack={() => router.back()}
        actions={[{ icon: 'Check', onPress: handleSave, accessibilityLabel: 'Guardar', disabled: !canSave || isBusy }]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <Pressable style={({ pressed }) => [styles.logoPicker, pressed && { opacity: 0.7 }]} onPress={pickLogo}>
              {displayLogo ? (
                <Image source={{ uri: displayLogo }} style={styles.logoPreview} resizeMode="contain" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Icon name="Camera" size={24} color={colors.ink3} />
                  <Text variant="caption" color="ink3">Añadir logo</Text>
                </View>
              )}
            </Pressable>
            {displayLogo && (
              <Pressable onPress={() => { setLogoUri(null); setExistingLogoUrl(null); }}>
                <Text variant="caption" color="danger">Eliminar foto</Text>
              </Pressable>
            )}
          </View>

          {/* Datos */}
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Datos del proveedor</Text>
            <View style={styles.sectionBody}>
              <Field label="Nombre *" value={name} onChangeText={setName} placeholder="Nombre comercial" />
              <Field label="Persona de contacto" value={contact} onChangeText={setContact} placeholder="Nombre del contacto" />
              <Field label="Teléfono" value={phone} onChangeText={setPhone} placeholder="000 000 000" keyboardType="phone-pad" />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="email@proveedor.com" keyboardType="email-address" />
              <Field label="Dirección" value={address} onChangeText={setAddress} placeholder="Calle, ciudad, código postal" />
              <Field label="Descripción / Condiciones" value={description} onChangeText={setDescription} placeholder="Notas, condiciones de pago, descuentos..." multiline last />
            </View>
          </View>

          <Button
            label="Guardar cambios"
            onPress={handleSave}
            loading={isBusy}
            disabled={!canSave}
            fullWidth
            style={{ marginTop: space[2] }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, last }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <Text variant="caption" color="ink3" style={{ marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldTextarea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink4}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[4] },

  logoSection: { alignItems: 'center', gap: space[2] },
  logoPicker: {
    width: 100, height: 100, borderRadius: radius.lg,
    overflow: 'hidden',
  },
  logoPreview: { width: 100, height: 100, backgroundColor: colors.surface2 },
  logoPlaceholder: {
    width: 100, height: 100, borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
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
  field: {
    paddingHorizontal: space[3], paddingVertical: space[2],
  },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  fieldInput: { fontSize: 15, color: colors.ink, paddingVertical: 2 },
  fieldTextarea: { minHeight: 90, paddingTop: 4 },
});
