// A-05 Vista — Editar proveedor
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, Pressable, Image,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { useSuppliers } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { resizeForUpload } from '@/lib/imageResize';
import { SupplierSchema, validate } from '@/lib/validation';

export default function EditarProveedorScreen() {
  const router = useRouter();
  const { t } = useTranslation('agent');
  const { t: tv } = useTranslation('validation');
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
      toast.error(t('supplier_form.gallery_permission_error'));
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
      const resizedUri = await resizeForUpload(logoUri);
      const ext = Platform.OS === 'web' ? (logoUri.split('.').pop()?.toLowerCase() ?? 'jpg') : 'jpg';
      const filename = `${Date.now()}.${ext}`;
      const response = await fetch(resizedUri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('supplier-logos')
        .upload(filename, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, cacheControl: '31536000' });
      if (error) { toast.error(t('supplier_form.upload_error', { message: error.message })); return null; }
      const { data } = supabase.storage.from('supplier-logos').getPublicUrl(filename);
      return data.publicUrl;
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    if (!canSave || !id) return;
    const v = validate(SupplierSchema(tv), {
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
      toast.success(t('supplier_form.updated_toast'));
      router.back();
    } catch (e: any) {
      toast.error(e?.message ?? t('supplier_form.retry'));
    } finally {
      setSaving(false);
    }
  }

  const isBusy = saving || uploadingLogo;
  const displayLogo = logoUri ?? existingLogoUrl;

  if (!loaded) {
    return (
      <Screen>
        <TopBar title={t('supplier_form.title_edit')} onBack={() => router.back()} />
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.ink} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title={t('supplier_form.title_edit')}
        onBack={() => router.back()}
        actions={[{ icon: 'Check', onPress: handleSave, accessibilityLabel: t('supplier_form.save'), disabled: !canSave || isBusy }]}
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
                  <Text variant="caption" color="ink3">{t('supplier_form.add_logo')}</Text>
                </View>
              )}
            </Pressable>
            {displayLogo && (
              <Pressable onPress={() => { setLogoUri(null); setExistingLogoUrl(null); }}>
                <Text variant="caption" color="danger">{t('supplier_form.remove_photo')}</Text>
              </Pressable>
            )}
          </View>

          {/* Datos */}
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>{t('supplier_form.section_title')}</Text>
            <View style={styles.sectionBody}>
              <Field label={t('supplier_form.name')} value={name} onChangeText={setName} placeholder={t('supplier_form.name_placeholder')} />
              <Field label={t('supplier_form.contact')} value={contact} onChangeText={setContact} placeholder={t('supplier_form.contact_placeholder')} />
              <Field label={t('supplier_form.phone')} value={phone} onChangeText={setPhone} placeholder={t('supplier_form.phone_placeholder')} keyboardType="phone-pad" />
              <Field label={t('supplier_form.email')} value={email} onChangeText={setEmail} placeholder={t('supplier_form.email_placeholder')} keyboardType="email-address" />
              <Field label={t('supplier_form.address')} value={address} onChangeText={setAddress} placeholder={t('supplier_form.address_placeholder')} />
              <Field label={t('supplier_form.description')} value={description} onChangeText={setDescription} placeholder={t('supplier_form.description_placeholder')} multiline last />
            </View>
          </View>

          <Button
            label={t('supplier_form.save_changes')}
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
