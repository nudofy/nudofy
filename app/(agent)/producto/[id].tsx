// A-06 · Ficha de producto
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Image, FlatList, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirmDestructive } from '@/lib/confirm';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import ResourceError from '@/components/ResourceError';
import { supabase } from '@/lib/supabase';
import { formatEur } from '@/lib/format';
import type { Product, ProductImage } from '@/hooks/useAgent';

const { width } = Dimensions.get('window');

function DataRow({ label, value, last }: { label: string; value: string | number | undefined | null; last?: boolean }) {
  if (value == null || value === '') return null;
  return (
    <View style={[styles.dataRow, !last && styles.dataRowBorder]}>
      <Text variant="small" color="ink3">{label}</Text>
      <Text variant="smallMedium">{value}</Text>
    </View>
  );
}

type AttrOption = { id: string; value: string; position: number };
type AttrFull = { id: string; name: string; position: number; options: AttrOption[] };
type VariantFull = { id: string; attributes: Record<string, string>; reference?: string; barcode?: string; stock?: number; position: number };

export default function ProductoScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('agent');
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [extraImages, setExtraImages] = useState<ProductImage[]>([]);
  const [catalogName, setCatalogName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [imgIndex, setImgIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [attributes, setAttributes] = useState<AttrFull[]>([]);
  const [variants, setVariants] = useState<VariantFull[]>([]);

  const fetchProduct = useCallback(() => {
    if (!id) return;
    setLoaded(false);
    setLoadError(null);
    supabase.from('products').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setLoadError(error.message);
      const row = (data as Product | null) ?? null;
      setProduct(row);
      setLoaded(true);
      if (row?.catalog_id) {
        supabase
          .from('catalogs')
          .select('name, supplier:suppliers(name)')
          .eq('id', row.catalog_id)
          .maybeSingle()
          .then(({ data: c }) => {
            setCatalogName(c?.name ?? '');
            setSupplierName((c?.supplier as any)?.name ?? '');
          });
      }
    });
    supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('position')
      .then(({ data }) => setExtraImages(data ?? []));
    // Atributos y variantes: queries simples por separado para evitar timeouts
    supabase
      .from('product_attributes')
      .select('id, name, position')
      .eq('product_id', id)
      .order('position')
      .then(async ({ data: attrs }) => {
        if (!attrs || attrs.length === 0) { setAttributes([]); return; }
        const attrIds = attrs.map((a: any) => a.id);
        const { data: opts } = await supabase
          .from('product_attribute_options')
          .select('id, attribute_id, value, position')
          .in('attribute_id', attrIds)
          .order('position');
        const optsMap: Record<string, AttrOption[]> = {};
        for (const o of opts ?? []) {
          if (!optsMap[o.attribute_id]) optsMap[o.attribute_id] = [];
          optsMap[o.attribute_id].push(o);
        }
        setAttributes(attrs.map((a: any) => ({
          ...a,
          options: (optsMap[a.id] ?? []).sort((x, y) => x.position - y.position),
        })));
      });
    supabase
      .from('product_variants')
      .select('id, attributes, reference, barcode, stock, position')
      .eq('product_id', id)
      .order('position')
      .then(({ data }) => setVariants((data ?? []) as VariantFull[]));
  }, [id]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  if (loaded && !product) {
    return (
      <ResourceError
        topBarTitle={t('product_detail.top_bar_title')}
        title={loadError ? t('product_detail.error_title') : t('product_detail.not_found_title')}
        message={loadError ? t('product_detail.error_message') : t('product_detail.not_found_message')}
        detail={loadError}
        onBack={() => router.back()}
        onRetry={fetchProduct}
      />
    );
  }

  if (!product) {
    return (
      <Screen>
        <TopBar title={t('product_detail.top_bar_title')} onBack={() => router.back()} />
        <Text variant="small" color="ink3" align="center" style={{ marginTop: space[8] }}>{t('product_detail.loading')}</Text>
      </Screen>
    );
  }

  const allImages: string[] = extraImages.length > 0
    ? extraImages.map(i => i.url)
    : product.image_url ? [product.image_url] : [];

  function handleDeleteProduct() {
    confirmDestructive(
      t('product_detail.delete_title'),
      t('product_detail.delete_body', { name: product!.name }),
      async () => {
        await supabase.from('products').delete().eq('id', id);
        router.back();
      }
    );
  }

  const subtitle = [supplierName, catalogName].filter(Boolean).join(' · ');

  return (
    <Screen>
      <TopBar
        title={subtitle || t('product_detail.top_bar_title')}
        onBack={() => router.back()}
        actions={[
          { icon: 'Pencil', onPress: () => router.push(`/(agent)/producto/editar?id=${id}` as any), accessibilityLabel: t('product_detail.edit') },
          { icon: 'Trash2', onPress: handleDeleteProduct, accessibilityLabel: t('product_detail.delete') },
        ]}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Imágenes */}
        {allImages.length > 0 ? (
          <View>
            <FlatList
              data={allImages}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setImgIndex(idx);
              }}
              renderItem={({ item }) => (
                <View style={[styles.imageBox, { width }]}>
                  <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
                </View>
              )}
            />
            {allImages.length > 1 && (
              <View style={styles.dotRow}>
                {allImages.map((_, i) => (
                  <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholderBox}>
            <Icon name="Package" size={64} color={colors.ink4} />
          </View>
        )}

        {/* Info principal */}
        <View style={styles.infoBlock}>
          <Text variant="title">{product.name}</Text>
          <View style={styles.refRow}>
            {product.reference ? <Text variant="caption" color="ink3">{t('product_detail.ref_prefix', { ref: product.reference })}</Text> : null}
            {product.reference && product.barcode ? <View style={styles.sep} /> : null}
            {product.barcode ? <Text variant="caption" color="ink3">{t('product_detail.ean_prefix', { code: product.barcode })}</Text> : null}
          </View>
          <Text variant="display" style={{ marginTop: space[3] }}>{formatEur(product.price, i18n.language)}</Text>
          <Text variant="caption" color="ink3">{t('product_detail.price_note')}</Text>
          {product.pvpr != null && (
            <Text variant="small" color="ink3" style={{ marginTop: space[1] }}>
              {t('product_detail.pvpr_label', { price: formatEur(product.pvpr, i18n.language) })}
            </Text>
          )}
        </View>

        {/* Descripción */}
        {product.description ? (
          <View style={styles.descBlock}>
            <Text variant="caption" color="ink3" style={styles.sectionLabel}>{t('product_detail.description_label')}</Text>
            <Text variant="small" color="ink2" style={{ lineHeight: 20 }}>{product.description}</Text>
          </View>
        ) : null}

        {/* Detalles adicionales */}
        <View style={styles.detailsBlock}>
          <Text variant="caption" color="ink3" style={styles.sectionLabel}>{t('product_detail.details_label')}</Text>
          <View style={styles.detailsCard}>
            <DataRow label={t('product_detail.reference2_label')} value={product.reference_2} />
            <DataRow label={t('product_detail.family_label')} value={product.familia} />
            <DataRow label={t('product_detail.subfamily_label')} value={product.subfamilia} />
            <DataRow label={t('product_detail.measures_label')} value={product.measures} />
            <DataRow label={t('product_detail.stock_label')} value={product.stock} />
            <DataRow label={t('product_detail.standard_box_label')} value={product.standard_box != null ? t('product_detail.units_suffix', { count: product.standard_box }) : null} />
            <DataRow label={t('product_detail.min_units_label')} value={product.min_units != null ? t('product_detail.units_suffix', { count: product.min_units }) : null} last />
          </View>
        </View>

        {/* Atributos y variantes */}
        {attributes.length > 0 && (
          <View style={styles.detailsBlock}>
            <Text variant="caption" color="ink3" style={styles.sectionLabel}>{t('product_detail.attributes_label')}</Text>
            <View style={styles.detailsCard}>
              {attributes.map((attr, ai) => (
                <View key={attr.id} style={[styles.attrRow, ai < attributes.length - 1 && styles.dataRowBorder]}>
                  <Text variant="smallMedium" color="ink3" style={{ marginBottom: 6 }}>{attr.name}</Text>
                  <View style={styles.optionsWrap}>
                    {attr.options.map(opt => (
                      <View key={opt.id} style={styles.optChip}>
                        <Text variant="caption" color="ink2">{opt.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {variants.length > 0 && (
          <View style={[styles.detailsBlock, { paddingBottom: space[8] }]}>
            <Text variant="caption" color="ink3" style={styles.sectionLabel}>
              {t('product_detail.variants_label', { count: variants.length })}
            </Text>
            <View style={styles.detailsCard}>
              {variants.map((v, vi) => {
                const label = Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ');
                const hasExtra = v.reference || v.barcode || v.stock != null;
                return (
                  <View key={v.id} style={[styles.variantRow, vi < variants.length - 1 && styles.dataRowBorder]}>
                    <Text variant="smallMedium">{label}</Text>
                    {hasExtra && (
                      <View style={styles.variantMeta}>
                        {v.reference ? <Text variant="caption" color="ink3">{t('product_detail.variant_ref', { ref: v.reference })}</Text> : null}
                        {v.barcode ? <Text variant="caption" color="ink3">{t('product_detail.variant_ean', { code: v.barcode })}</Text> : null}
                        {v.stock != null ? <Text variant="caption" color="ink3">{t('product_detail.variant_stock', { count: v.stock })}</Text> : null}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageBox: {
    height: 280,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  dotRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingVertical: space[2], backgroundColor: colors.surface,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.ink },
  imagePlaceholderBox: {
    height: 240, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  infoBlock: {
    padding: space[4],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.line },
  descBlock: {
    padding: space[4],
    borderBottomWidth: 1, borderBottomColor: colors.line,
    gap: space[2],
  },
  sectionLabel: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: space[2],
  },
  detailsBlock: {
    padding: space[4], paddingBottom: space[8],
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  dataRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  attrRow: {
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
  optChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: space[2],
    paddingVertical: 4,
  },
  variantRow: {
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    gap: 4,
  },
  variantMeta: { flexDirection: 'row', gap: space[3], flexWrap: 'wrap', marginTop: 2 },
});
