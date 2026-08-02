// Editar producto existente
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, Pressable, Image, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { useProducts, useProductAttributes, useProductVariants } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ProductSchema, validate } from '@/lib/validation';
import type { Product, ProductImage } from '@/hooks/useAgent';
import AttributesEditor, { type AttributeDraft, type VariantDraft } from '@/components/AttributesEditor';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { resizeForUpload } from '@/lib/imageResize';

export default function EditarProductoScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { t } = useTranslation('agent');
  const { t: tv } = useTranslation('validation');
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { allowed: variantsMatrixAllowed } = useFeatureGate('variants_matrix');

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
  const [published, setPublished] = useState(true);
  const [tariffs, setTariffs] = useState<{ id: string; name: string }[]>([]);
  const [tariffPrices, setTariffPrices] = useState<Record<string, string>>({});
  const [attributeDrafts, setAttributeDrafts] = useState<AttributeDraft[]>([]);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { attributes: existingAttributes, saveAttributes } = useProductAttributes(id);
  const { variants: existingVariants, saveVariants } = useProductVariants(id);

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
      setPublished(p.published !== false);
      const urls: string[] = (imgs ?? []).map((i: ProductImage) => i.url);
      setImages(urls.length > 0 ? urls : p.image_url ? [p.image_url] : []);
      setLoaded(true);
    });
  }, [id]);

  // Cargar atributos existentes en los drafts cuando están disponibles
  useEffect(() => {
    if (existingAttributes.length > 0) {
      setAttributeDrafts(existingAttributes.map(a => ({
        id: a.id,
        name: a.name,
        options: a.options.map(o => o.value),
        optionInput: '',
      })));
    }
  }, [existingAttributes]);

  // Cargar variantes existentes en los drafts
  useEffect(() => {
    if (existingVariants.length > 0) {
      setVariantDrafts(existingVariants.map(v => ({
        attributes: v.attributes,
        reference: v.reference ?? '',
        barcode: v.barcode ?? '',
        stock: v.stock != null ? String(v.stock) : '',
        available: v.available !== false,
        image_url: v.image_url ?? null,
      })));
    }
  }, [existingVariants]);

  useEffect(() => {
    if (!id) return;
    // Tarifas y precios por tarifa — bloque separado para evitar duplicar el useEffect principal

    // Tarifas y precios por tarifa
    Promise.all([
      supabase.from('tariffs').select('id, name').order('position'),
      supabase.from('product_prices').select('tariff_id, price').eq('product_id', id),
    ]).then(([{ data: ts }, { data: pps }]) => {
      const tarifaList = (ts ?? []) as { id: string; name: string }[];
      setTariffs(tarifaList);
      const map: Record<string, string> = {};
      for (const pp of pps ?? []) {
        map[pp.tariff_id] = String(pp.price);
      }
      setTariffPrices(map);
    });
  }, [id]);

  const canSave = name.trim().length > 0 && price.trim().length > 0;

  async function pickImage() {
    if (images.length >= 10) { toast.error(t('product_form.max_images_warning')); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error(t('product_form.gallery_permission_error')); return; }
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
      const resizedUri = await resizeForUpload(uri);
      const ext = Platform.OS === 'web' ? (uri.split('.').pop()?.toLowerCase() ?? 'jpg') : 'jpg';
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const response = await fetch(resizedUri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('product-images')
        .upload(filename, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, cacheControl: '31536000' });
      if (error) return null;
      const { data } = supabase.storage.from('product-images').getPublicUrl(filename);
      return data.publicUrl;
    } catch { return null; }
  }

  async function handleSave() {
    if (!canSave || !id) return;
    const v = validate(ProductSchema(tv), {
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
        image_url: uploadedUrls[0] ?? undefined,
        published });

      if (error) { toast.error(error); return; }

      if (uploadedUrls.length > 0) {
        await supabase.from('product_images').delete().eq('product_id', id);
        await supabase.from('product_images').insert(
          uploadedUrls.map((url, i) => ({ product_id: id, url, position: i }))
        );
      }

      // Sincronizar precios por tarifa
      const upserts: { product_id: string; tariff_id: string; price: number }[] = [];
      const deletes: string[] = [];
      for (const t of tariffs) {
        const raw = (tariffPrices[t.id] ?? '').trim().replace(',', '.');
        if (raw === '') {
          deletes.push(t.id);
        } else {
          const num = parseFloat(raw);
          if (!isNaN(num)) upserts.push({ product_id: id, tariff_id: t.id, price: num });
          else deletes.push(t.id);
        }
      }
      if (upserts.length > 0) {
        await supabase.from('product_prices')
          .upsert(upserts, { onConflict: 'product_id,tariff_id' });
      }
      if (deletes.length > 0) {
        await supabase.from('product_prices')
          .delete()
          .eq('product_id', id)
          .in('tariff_id', deletes);
      }

      // Guardar atributos
      const { error: attrErr } = await saveAttributes(
        attributeDrafts.map(a => ({ name: a.name, options: a.options }))
      );
      if (attrErr) { toast.error(attrErr); return; }

      // Guardar variantes
      const { error: varErr } = await saveVariants(
        variantDrafts.map((vd, i) => ({
          product_id: id,
          attributes: vd.attributes,
          reference: vd.reference.trim() || undefined,
          barcode: vd.barcode.trim() || undefined,
          stock: vd.stock ? parseInt(vd.stock) : undefined,
          available: vd.available !== false,
          image_url: vd.image_url ?? null,
          position: i,
        }))
      );
      if (varErr) { toast.error(varErr); return; }

      toast.success(t('product_form.updated_toast'));
      goBack();
    } catch (e: any) {
      toast.error(e?.message ?? t('product_form.retry'));
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <Screen>
        <TopBar title={t('product_form.title_edit')} onBack={() => goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title={t('product_form.title_edit')}
        onBack={() => goBack()}
        actions={[{ icon: 'Check', onPress: handleSave, accessibilityLabel: t('product_form.save'), disabled: !canSave || saving }]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Imágenes */}
          <Section title={t('product_form.images_section')} trailing={<Text variant="caption" color="ink3">{images.length}/10</Text>}>
            <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
              {images.map((uri, i) => (
                <View key={i} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.imageThumb} />
                  {i === 0 && (
                    <View style={styles.imgPrincipalBadge}>
                      <Text variant="caption" color="white" style={styles.imgPrincipalText}>{t('product_form.principal_badge')}</Text>
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
                  <Text variant="caption" color="ink3">{t('product_form.add')}</Text>
                </Pressable>
              )}
            </ScrollView>
          </Section>

          {/* Identificación */}
          <Section title={t('product_form.identification_section')}>
            <Field label={t('product_form.name')} value={name} onChangeText={setName} placeholder={t('product_form.name_placeholder')} />
            <Field label={t('product_form.reference')} value={reference} onChangeText={setReference} placeholder={t('product_form.reference_placeholder')} />
            <Field label={t('product_form.reference2')} value={reference2} onChangeText={setReference2} placeholder={t('product_form.reference2_placeholder')} />
            <Field label={t('product_form.barcode')} value={barcode} onChangeText={setBarcode} placeholder={t('product_form.barcode_placeholder')} keyboardType="numeric" />
            <Field label={t('product_form.family')} value={familia} onChangeText={setFamilia} placeholder={t('product_form.family_placeholder')} />
            <Field label={t('product_form.subfamily')} value={subfamilia} onChangeText={setSubfamilia} placeholder={t('product_form.subfamily_placeholder')} last />
          </Section>

          {/* Precios */}
          <Section title={t('product_form.prices_section')}>
            <Field label={t('product_form.price_base')} value={price} onChangeText={setPrice} placeholder={t('product_form.price_placeholder')} keyboardType="decimal-pad" />
            <Field label={t('product_form.pvpr')} value={pvpr} onChangeText={setPvpr} placeholder={t('product_form.pvpr_placeholder')} keyboardType="decimal-pad" />
            <IvaSelector value={vatRate} onChange={setVatRate} />
          </Section>

          {tariffs.length > 0 && (
            <Section
              title={t('product_form.tariff_prices_section')}
              trailing={<Text variant="caption" color="ink3">{t('product_form.tariff_prices_hint')}</Text>}
            >
              {tariffs.map((tf, idx) => (
                <Field
                  key={tf.id}
                  label={tf.name}
                  value={tariffPrices[tf.id] ?? ''}
                  onChangeText={(v) => setTariffPrices(prev => ({ ...prev, [tf.id]: v }))}
                  placeholder={price ? t('product_form.tariff_price_placeholder_base', { price }) : '0,00'}
                  keyboardType="decimal-pad"
                  last={idx === tariffs.length - 1}
                />
              ))}
            </Section>
          )}

          {/* Detalles */}
          <Section title={t('product_form.details_section')}>
            <Field label={t('product_form.description')} value={description} onChangeText={setDescription} placeholder={t('product_form.description_placeholder')} multiline />
            <Field label={t('product_form.measures')} value={measures} onChangeText={setMeasures} placeholder={t('product_form.measures_placeholder')} last />
          </Section>

          {/* Logística */}
          <Section title={t('product_form.logistics_section')}>
            <Field label={t('product_form.stock')} value={stock} onChangeText={setStock} placeholder="0" keyboardType="numeric" />
            <Field label={t('product_form.standard_box')} value={standardBox} onChangeText={setStandardBox} placeholder={t('product_form.standard_box_placeholder')} keyboardType="numeric" />
            <Field label={t('product_form.min_units')} value={minUnits} onChangeText={setMinUnits} placeholder="1" keyboardType="numeric" last />
          </Section>

          {/* Atributos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="caption" color="ink3" style={styles.sectionTitle}>{t('product_form.attributes_section')}</Text>
            </View>
            <Text variant="small" color="ink3" style={{ paddingHorizontal: space[1], marginBottom: space[2] }}>
              {t('product_form.attributes_hint_edit')}
            </Text>
            <AttributesEditor
              attributes={attributeDrafts}
              variants={variantDrafts}
              onAttributesChange={setAttributeDrafts}
              onVariantsChange={setVariantDrafts}
              maxAttributes={variantsMatrixAllowed ? undefined : 1}
              upgradeHint={t('product_form.attributes_upgrade_hint')}
            />
          </View>

          <Section title={t('product_form.visibility_section')}>
            <View style={styles.publishedRow}>
              <View style={{ flex: 1 }}>
                <Text variant="smallMedium">{t('product_form.published_label')}</Text>
                <Text variant="caption" color="ink3">
                  {published
                    ? t('product_form.published_on')
                    : t('product_form.published_off')}
                </Text>
              </View>
              <Switch
                value={published}
                onValueChange={setPublished}
                trackColor={{ false: colors.line, true: colors.brand }}
                thumbColor={colors.white}
              />
            </View>
          </Section>

          <Button
            label={t('product_form.save_changes')}
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

const IVA_VALUES: (number | null)[] = [21, 10, 4, 0, null];

function IvaSelector({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const { t } = useTranslation('agent');
  const IVA_OPTIONS: { label: string; value: number | null }[] = IVA_VALUES.map(v => ({
    label: v == null ? t('product_form.vat_exempt') : `${v}%`,
    value: v,
  }));
  return (
    <View style={styles.field}>
      <Text variant="caption" color="ink3" style={{ marginBottom: 4 }}>{t('product_form.vat')}</Text>
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
  publishedRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[3], paddingVertical: space[3],
    gap: space[3],
  },
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
