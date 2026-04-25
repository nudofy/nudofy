// Editar producto existente
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, Pressable, Image, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { useProducts } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ProductSchema, validate } from '@/lib/validation';
import type { Product, ProductImage } from '@/hooks/useAgent';

export default function EditarProductoScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [catalogId, setCatalogId] = useState<string | undefined>();
  const { updateProduct } = useProducts(catalogId);

  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [reference2, setReference2] = useState('');
  const [barcode, setBarcode] = useState('');
  const [familia, setFamilia] = useState('');
  const [subfamilia, setSubfamilia] = useState('');
  const [price, setPrice] = useState('');
  const [pvpr, setPvpr] = useState('');
  const [vatRate, setVatRate] = useState<number | null>(21);
  const [description, setDescription] = useState('');
  const [measures, setMeasures] = useState('');
  const [stock, setStock] = useState('');
  const [standardBox, setStandardBox] = useState('');
  const [minUnits, setMinUnits] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase.from('product_images').select('*').eq('product_id', id).order('position'),
    ]).then(([{ data: p }, { data: imgs }]) => {
      if (!p) return;
      setProduct(p);
      setCatalogId(p.catalog_id);
      setName(p.name ?? '');
      setReference(p.reference ?? '');
      setReference2(p.reference_2 ?? '');
      setBarcode(p.barcode ?? '');
      setFamilia(p.familia ?? '');
      setSubfamilia(p.subfamilia ?? '');
      setPrice(p.price != null ? String(p.price) : '');
      setPvpr(p.pvpr != null ? String(p.pvpr) : '');
      setVatRate(p.vat_rate !== undefined ? p.vat_rate : 21);
      setDescription(p.description ?? '');
      setMeasures(p.measures ?? '');
      setStock(p.stock != null ? String(p.stock) : '');
      setStandardBox(p.standard_box != null ? String(p.standard_box) : '');
      setMinUnits(p.min_units != null ? String(p.min_units) : '');
      const urls: string[] = (imgs ?? []).map((i: ProductImage) => i.url);
      setImages(urls.length > 0 ? urls : p.image_url ? [p.image_url] : []);
      setLoaded(true);
    });
  }, [id]);

  const canSave = name.trim().length > 0 && price.trim().length > 0;

  async function pickImage() {
    if (images.length >= 10) { toast.error('Máximo 10 imágenes por producto.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error('Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.8 });
    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newUris].slice(0, 10));
    }
  }

  async function uploadImage(uri: string): Promise<string | null> {
    if (uri.startsWith('http')) return uri;
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
    if (!canSave || !id) return;
    const v = validate(ProductSchema, {
      name,
      reference,
      price,
      vat_rate: vatRate ?? undefined,
      description,
      family: familia,
      subfamily: subfamilia,
    });
    if (!v.ok) { toast.error(v.firstError); return; }
    const priceNum = v.data.price ?? 0;
    setSaving(true);
    try {
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const url = await uploadImage(uri);
        if (url) uploadedUrls.push(url);
      }

      const { error } = await updateProduct(id, {
        name: name.trim(),
        reference: reference.trim() || undefined,
        reference_2: reference2.trim() || undefined,
        barcode: barcode.trim() || undefined,
        familia: familia.trim() || undefined,
        subfamilia: subfamilia.trim() || undefined,
        price: priceNum,
        vat_rate: vatRate,
        pvpr: pvpr ? parseFloat(pvpr.replace(',', '.')) : undefined,
        description: description.trim() || undefined,
        measures: measures.trim() || undefined,
        stock: stock ? parseInt(stock) : undefined,
        standard_box: standardBox ? parseInt(standardBox) : undefined,
        min_units: minUnits ? parseInt(minUnits) : undefined,
        image_url: uploadedUrls[0] ?? undefined });

      if (error) { toast.error(error); return; }

      if (uploadedUrls.length > 0) {
        await supabase.from('product_images').delete().eq('product_id', id);
        await supabase.from('product_images').insert(
          uploadedUrls.map((url, i) => ({ product_id: id, url, position: i }))
        );
      }

      router.back();
    } catch (e: any) {
      toast.error(e?.message ?? 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <Screen>
        <TopBar title="Editar producto" onBack={() => router.back()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title="Editar producto"
        onBack={() => router.back()}
        actions={[{ icon: 'Check', onPress: handleSave, accessibilityLabel: 'Guardar', disabled: !canSave || saving }]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Imágenes */}
          <Section title="Imágenes" trailing={<Text variant="caption" color="ink3">{images.length}/10</Text>}>
            <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
              {images.map((uri, i) => (
                <View key={i} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.imageThumb} />
                  {i === 0 && (
                    <View style={styles.imgPrincipalBadge}>
                      <Text variant="caption" color="white" style={styles.imgPrincipalText}>Principal</Text>
                    </View>
                  )}
                  <Pressable style={styles.imageRemove} onPress={() => setImages(prev => prev.filter((_, j) => j !== i))}>
                    <Icon name="X" size={12} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {images.length < 10 && (
                <Pressable style={({ pressed }) => [styles.imageAdd, pressed && { opacity: 0.7 }]} onPress={pickImage}>
                  <Icon name="Camera" size={20} color={colors.ink3} />
                  <Text variant="caption" color="ink3">Añadir</Text>
                </Pressable>
              )}
            </ScrollView>
          </Section>

          {/* Identificación */}
          <Section title="Identificación">
            <Field label="Nombre *" value={name} onChangeText={setName} placeholder="Nombre del producto" />
            <Field label="Referencia" value={reference} onChangeText={setReference} placeholder="REF-001" />
            <Field label="Referencia 2" value={reference2} onChangeText={setReference2} placeholder="REF-ALT-001" />
            <Field label="EAN / Código de barras" value={barcode} onChangeText={setBarcode} placeholder="8400000000000" keyboardType="numeric" />
            <Field label="Familia" value={familia} onChangeText={setFamilia} placeholder="Ej: Juguetes, Alimentación..." />
            <Field label="Subfamilia" value={subfamilia} onChangeText={setSubfamilia} placeholder="Ej: Puzzles, Snacks..." last />
          </Section>

          {/* Precios */}
          <Section title="Precios">
            <Field label="Precio (€) *" value={price} onChangeText={setPrice} placeholder="0,00" keyboardType="decimal-pad" />
            <Field label="PVPR (€)" value={pvpr} onChangeText={setPvpr} placeholder="Precio venta recomendado" keyboardType="decimal-pad" />
            <IvaSelector value={vatRate} onChange={setVatRate} />
          </Section>

          {/* Detalles */}
          <Section title="Detalles">
            <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Descripción del producto" multiline />
            <Field label="Medidas" value={measures} onChangeText={setMeasures} placeholder="Ej: 10x20x5 cm" last />
          </Section>

          {/* Logística */}
          <Section title="Logística">
            <Field label="Stock" value={stock} onChangeText={setStock} placeholder="0" keyboardType="numeric" />
            <Field label="Caja estándar (uds.)" value={standardBox} onChangeText={setStandardBox} placeholder="12" keyboardType="numeric" />
            <Field label="Unidades mínimas" value={minUnits} onChangeText={setMinUnits} placeholder="1" keyboardType="numeric" last />
          </Section>

          <Button
            label="Guardar cambios"
            onPress={handleSave}
            loading={saving}
            disabled={!canSave}
            fullWidth
            style={{ marginTop: space[2] }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const IVA_OPTIONS: { label: string; value: number | null }[] = [
  { label: '21%', value: 21 },
  { label: '10%', value: 10 },
  { label: '4%', value: 4 },
  { label: '0%', value: 0 },
  { label: 'Exento', value: null },
];

function IvaSelector({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="ink3" style={{ marginBottom: 4 }}>IVA</Text>
      <View style={styles.ivaPills}>
        {IVA_OPTIONS.map(opt => {
          const active = value === opt.value;
          return (
            <Pressable
              key={String(opt.value)}
              style={[styles.ivaPill, active && styles.ivaPillActive]}
              onPress={() => onChange(opt.value)}
            >
              <Text variant="smallMedium" color={active ? 'white' : 'ink2'}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Section({ title, trailing, children }: { title: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="caption" color="ink3" style={styles.sectionTitle}>{title}</Text>
        {trailing}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[4] },
  section: { gap: space[2] },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[1],
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  field: { paddingHorizontal: space[3], paddingVertical: space[2] },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  fieldInput: { fontSize: 15, color: colors.ink, paddingVertical: 2 },
  fieldTextarea: { minHeight: 70, paddingTop: 4 },

  imagesRow: {
    padding: space[3], gap: space[2],
    flexDirection: 'row', alignItems: 'center',
  },
  imageThumbWrap: { position: 'relative' },
  imageThumb: { width: 80, height: 80, borderRadius: radius.md },
  imgPrincipalBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: radius.sm,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  imgPrincipalText: { fontSize: 9, fontWeight: '600' },
  imageRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  imageAdd: {
    width: 80, height: 80, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.surface,
  },

  ivaPills: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1], marginTop: 4 },
  ivaPill: {
    paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white,
  },
  ivaPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
});
