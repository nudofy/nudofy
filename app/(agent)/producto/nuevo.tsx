// Alta de nuevo producto
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { useProducts } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';

export default function NuevoProductoScreen() {
  const router = useRouter();
  const { catalogId } = useLocalSearchParams<{ catalogId: string }>();
  const { createProduct } = useProducts(catalogId);

  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [reference2, setReference2] = useState('');
  const [barcode, setBarcode] = useState('');
  const [familia, setFamilia] = useState('');
  const [subfamilia, setSubfamilia] = useState('');
  const [price, setPrice] = useState('');
  const [pvpr, setPvpr] = useState('');
  const [description, setDescription] = useState('');
  const [measures, setMeasures] = useState('');
  const [stock, setStock] = useState('');
  const [standardBox, setStandardBox] = useState('');
  const [minUnits, setMinUnits] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && price.trim().length > 0;

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  }

  async function uploadImage(uri: string): Promise<string | null> {
    try {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('product-images')
        .upload(filename, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      if (error) return null;
      const { data } = supabase.storage.from('product-images').getPublicUrl(filename);
      return data.publicUrl;
    } catch { return null; }
  }

  async function handleSave() {
    if (!canSave) return;
    const priceNum = parseFloat(price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Precio no válido'); return; }
    setSaving(true);
    try {
      // Upload images
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const url = await uploadImage(uri);
        if (url) uploadedUrls.push(url);
      }

      const { error, data } = await createProduct({
        name: name.trim(),
        reference: reference.trim() || undefined,
        reference_2: reference2.trim() || undefined,
        barcode: barcode.trim() || undefined,
        familia: familia.trim() || undefined,
        subfamilia: subfamilia.trim() || undefined,
        price: priceNum,
        pvpr: pvpr ? parseFloat(pvpr.replace(',', '.')) : undefined,
        description: description.trim() || undefined,
        measures: measures.trim() || undefined,
        stock: stock ? parseInt(stock) : undefined,
        standard_box: standardBox ? parseInt(standardBox) : undefined,
        min_units: minUnits ? parseInt(minUnits) : undefined,
        image_url: uploadedUrls[0] ?? undefined });

      if (error) { Alert.alert('Error', error); return; }

      // Save extra images
      if (data?.id && uploadedUrls.length > 0) {
        await supabase.from('product_images').insert(
          uploadedUrls.map((url, i) => ({ product_id: data.id, url, position: i }))
        );
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error inesperado', e?.message ?? 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo producto</Text>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Imágenes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Imágenes</Text>
            <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
              {images.map((uri, i) => (
                <View key={i} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.imageThumb} />
                  <TouchableOpacity style={styles.imageRemove} onPress={() => setImages(prev => prev.filter((_, j) => j !== i))}>
                    <Text style={styles.imageRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.imageAdd} onPress={pickImage}>
                <Text style={styles.imageAddIcon}>📷</Text>
                <Text style={styles.imageAddText}>Añadir</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Identificación */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identificación</Text>
            <Field label="Nombre *" value={name} onChangeText={setName} placeholder="Nombre del producto" />
            <Field label="Referencia" value={reference} onChangeText={setReference} placeholder="REF-001" />
            <Field label="Referencia 2" value={reference2} onChangeText={setReference2} placeholder="REF-ALT-001" />
            <Field label="EAN / Código de barras" value={barcode} onChangeText={setBarcode} placeholder="8400000000000" keyboardType="numeric" />
            <Field label="Familia" value={familia} onChangeText={setFamilia} placeholder="Ej: Juguetes, Alimentación..." />
            <Field label="Subfamilia" value={subfamilia} onChangeText={setSubfamilia} placeholder="Ej: Puzzles, Snacks..." />
          </View>

          {/* Precios */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Precios</Text>
            <Field label="Precio (€) *" value={price} onChangeText={setPrice} placeholder="0,00" keyboardType="decimal-pad" />
            <Field label="PVPR (€)" value={pvpr} onChangeText={setPvpr} placeholder="Precio venta recomendado" keyboardType="decimal-pad" />
          </View>

          {/* Detalles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles</Text>
            <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Descripción del producto" multiline />
            <Field label="Medidas" value={measures} onChangeText={setMeasures} placeholder="Ej: 10x20x5 cm" />
          </View>

          {/* Logística */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Logística</Text>
            <Field label="Stock" value={stock} onChangeText={setStock} placeholder="0" keyboardType="numeric" />
            <Field label="Caja estándar (uds.)" value={standardBox} onChangeText={setStandardBox} placeholder="12" keyboardType="numeric" />
            <Field label="Unidades mínimas" value={minUnits} onChangeText={setMinUnits} placeholder="1" keyboardType="numeric" />
          </View>

          <TouchableOpacity
            style={[styles.mainSaveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.mainSaveBtnText}>Guardar producto</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldTextarea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white, paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 0.5, borderBottomColor: '#efefef' },
  back: { fontSize: 14, color: colors.purple },
  title: { fontSize: 16, fontWeight: '500', color: colors.text },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.purple },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  content: { padding: 16, gap: 16 },
  section: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  field: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: '#f5f5f5' },
  fieldLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  fieldInput: { fontSize: 15, color: colors.text },
  fieldTextarea: { minHeight: 70, paddingTop: 4 },
  imagesRow: { padding: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },
  imageThumbWrap: { position: 'relative' },
  imageThumb: { width: 80, height: 80, borderRadius: 10 },
  imageRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#C0392B', alignItems: 'center', justifyContent: 'center' },
  imageRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  imageAdd: {
    width: 80, height: 80, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4 },
  imageAddIcon: { fontSize: 20 },
  imageAddText: { fontSize: 10, color: colors.textMuted },
  mainSaveBtn: {
    backgroundColor: colors.purple, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center' },
  mainSaveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' } });
