// C-02b · Ficha de producto del portal cliente (solo lectura + añadir al carrito)
import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, FlatList, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge, Button } from '@/components/ui';
import ResourceError from '@/components/ResourceError';
import { supabase } from '@/lib/supabase';
import { formatEur } from '@/lib/format';
import { useClientData } from '@/hooks/useClient';
import { useCart, makeItemKey } from '@/contexts/CartContext';
import { useProductAttributes } from '@/hooks/useAgent';

const { width } = Dimensions.get('window');

type FullProduct = {
  id: string;
  catalog_id: string;
  name: string;
  reference?: string;
  reference_2?: string;
  barcode?: string;
  familia?: string;
  subfamilia?: string;
  price: number;
  description?: string;
  measures?: string;
  stock?: number | null;
  standard_box?: number;
  min_units?: number;
  image_url?: string;
};

function DataRow({ label, value, last }: { label: string; value: string | number | undefined | null; last?: boolean }) {
  if (value == null || value === '') return null;
  return (
    <View style={[styles.dataRow, !last && styles.dataRowBorder]}>
      <Text variant="small" color="ink3">{label}</Text>
      <Text variant="smallMedium">{value}</Text>
    </View>
  );
}

export default function ClientProductoScreen() {
  const goBack = useGoBack('/home');
  const { t, i18n } = useTranslation('catalog');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client } = useClientData();
  const { addToCart, updateQty, getItemQty, carts } = useCart();

  const [product, setProduct] = useState<FullProduct | null>(null);
  const [extraImages, setExtraImages] = useState<{ url: string }[]>([]);
  const [catalogName, setCatalogName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [imgIndex, setImgIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [attrSelections, setAttrSelections] = useState<Record<string, string>>({});

  const { attributes: attrList } = useProductAttributes(id);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoaded(false);
    setLoadError(null);

    const { data, error } = await supabase
      .from('products')
      .select('id, catalog_id, name, reference, reference_2, barcode, familia, subfamilia, price, description, measures, stock, standard_box, min_units, image_url')
      .eq('id', id)
      .eq('active', true)
      .eq('published', true)
      .maybeSingle();

    if (error) { setLoadError(error.message); setLoaded(true); return; }
    const row = data as FullProduct | null;

    // Precio de tarifa del cliente, mismo criterio que el listado
    // (useClientProducts): override directo en product_prices, si no
    // descuento porcentual de la tarifa.
    if (row && client?.tariff_id) {
      const [{ data: pp }, { data: tariff }] = await Promise.all([
        supabase.from('product_prices').select('price').eq('tariff_id', client.tariff_id).eq('product_id', row.id).maybeSingle(),
        supabase.from('tariffs').select('discount_percent').eq('id', client.tariff_id).maybeSingle(),
      ]);
      if (pp?.price != null) {
        row.price = pp.price;
      } else if ((tariff as any)?.discount_percent) {
        row.price = Math.round(row.price * (1 - (tariff as any).discount_percent / 100) * 100) / 100;
      }
    }

    setProduct(row);
    setLoaded(true);

    if (row?.catalog_id) {
      const { data: c } = await supabase
        .from('catalogs')
        .select('name, supplier_id, supplier:suppliers(name)')
        .eq('id', row.catalog_id)
        .maybeSingle();
      setCatalogName(c?.name ?? '');
      setSupplierId((c as any)?.supplier_id ?? '');
      setSupplierName((c?.supplier as any)?.name ?? '');
    }

    supabase.from('product_images').select('url').eq('product_id', id).order('position')
      .then(({ data: imgs }) => setExtraImages(imgs ?? []));
  }, [id, client?.tariff_id]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  if (loaded && !product) {
    return (
      <ResourceError
        topBarTitle={t('client.product_detail.top_bar_title')}
        title={loadError ? t('client.product_detail.error_title') : t('client.product_detail.not_found_title')}
        message={loadError ? t('client.product_detail.error_message') : t('client.product_detail.not_found_message')}
        detail={loadError}
        onBack={() => goBack()}
        onRetry={fetchProduct}
      />
    );
  }

  if (!product) {
    return (
      <Screen>
        <TopBar title={t('client.product_detail.top_bar_title')} onBack={() => goBack()} />
        <Text variant="small" color="ink3" align="center" style={{ marginTop: space[8] }}>{t('client.loading')}</Text>
      </Screen>
    );
  }

  const allImages: string[] = extraImages.length > 0
    ? extraImages.map(i => i.url)
    : product.image_url ? [product.image_url] : [];

  const cart = carts.find(c => c.supplier_id === supplierId);
  const hasAttrs = attrList.length > 0;
  const missingAttrs = hasAttrs && attrList.some(a => !attrSelections[a.name]);
  const itemKey = hasAttrs ? makeItemKey(product.id, attrSelections) : makeItemKey(product.id);
  const qty = hasAttrs
    ? (cart?.items.find(i => i.item_key === itemKey)?.quantity ?? 0)
    : getItemQty(supplierId, product.id);
  const outOfStock = product.stock === 0;

  async function handleAdd() {
    if (!product || !supplierId) return;
    if (missingAttrs) return;

    let variantId: string | undefined;
    if (hasAttrs) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, attributes')
        .eq('product_id', product.id);
      if (variants && variants.length > 0) {
        const selectedKey = makeItemKey('x', attrSelections).slice(1);
        const match = variants.find(v => makeItemKey('x', v.attributes as Record<string, string>).slice(1) === selectedKey);
        variantId = match?.id;
      }
    }

    addToCart(supplierId, supplierName, product.catalog_id, catalogName, {
      product_id: product.id,
      item_key: itemKey,
      name: product.name,
      reference: product.reference,
      unit_price: product.price,
      quantity: qty + 1,
      attributes: hasAttrs ? { ...attrSelections } : undefined,
      variant_id: variantId,
    });
  }

  function handleDecrement() {
    if (qty <= 0) return;
    updateQty(supplierId, itemKey, qty - 1);
  }

  const subtitle = [supplierName, catalogName].filter(Boolean).join(' · ');

  return (
    <Screen>
      <TopBar title={subtitle || t('client.product_detail.top_bar_title')} onBack={() => goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space[8] }}>
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
                  <Image source={{ uri: item }} style={styles.image} contentFit="contain" />
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
            {product.reference ? <Text variant="caption" color="ink3">{t('client.ref_prefix', { ref: product.reference })}</Text> : null}
            {product.reference && product.barcode ? <View style={styles.sep} /> : null}
            {product.barcode ? <Text variant="caption" color="ink3">{t('client.product_detail.ean_prefix', { code: product.barcode })}</Text> : null}
          </View>
          <Text variant="display" style={{ marginTop: space[3] }}>{formatEur(product.price, i18n.language)}</Text>
          {outOfStock && (
            <View style={{ marginTop: space[2], alignSelf: 'flex-start' }}>
              <Badge label={t('client.out_of_stock_badge')} variant="danger" />
            </View>
          )}
        </View>

        {/* Descripción */}
        {product.description ? (
          <View style={styles.descBlock}>
            <Text variant="caption" color="ink3" style={styles.sectionLabel}>{t('client.product_detail.description_label')}</Text>
            <Text variant="small" color="ink2" style={{ lineHeight: 20 }}>{product.description}</Text>
          </View>
        ) : null}

        {/* Detalles adicionales */}
        <View style={styles.detailsBlock}>
          <Text variant="caption" color="ink3" style={styles.sectionLabel}>{t('client.product_detail.details_label')}</Text>
          <View style={styles.detailsCard}>
            <DataRow label={t('client.product_detail.reference2_label')} value={product.reference_2} />
            <DataRow label={t('client.product_detail.family_label')} value={product.familia} />
            <DataRow label={t('client.product_detail.subfamily_label')} value={product.subfamilia} />
            <DataRow label={t('client.product_detail.measures_label')} value={product.measures} />
            <DataRow label={t('client.product_detail.standard_box_label')} value={product.standard_box != null ? t('client.product_detail.units_suffix', { count: product.standard_box }) : null} />
            <DataRow label={t('client.product_detail.min_units_label')} value={product.min_units != null ? t('client.product_detail.units_suffix', { count: product.min_units }) : null} last />
          </View>
        </View>

        {/* Atributos (talla, color...) */}
        {hasAttrs && (
          <View style={styles.detailsBlock}>
            <Text variant="caption" color="ink3" style={styles.sectionLabel}>{t('client.product_detail.attributes_label')}</Text>
            <View style={styles.detailsCard}>
              {attrList.map((attr, ai) => (
                <View key={attr.id} style={[styles.attrRow, ai < attrList.length - 1 && styles.dataRowBorder]}>
                  <Text variant="smallMedium" color="ink3" style={{ marginBottom: 8 }}>{attr.name}</Text>
                  <View style={styles.optionsWrap}>
                    {attr.options.map(opt => {
                      const selected = attrSelections[attr.name] === opt.value;
                      return (
                        <Pressable
                          key={opt.id}
                          style={[styles.optChip, selected && styles.optChipSelected]}
                          onPress={() => setAttrSelections(prev => ({ ...prev, [attr.name]: opt.value }))}
                        >
                          <Text variant="caption" color={selected ? 'white' : 'ink2'}>{opt.value}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Barra inferior: añadir al carrito */}
      <View style={styles.bottomBar}>
        {outOfStock ? (
          <View style={[styles.addBtn, { backgroundColor: colors.line }]}>
            <Text variant="bodyMedium" style={{ color: colors.ink3 }}>{t('client.not_available')}</Text>
          </View>
        ) : qty === 0 ? (
          <Pressable
            style={({ pressed }) => [styles.addBtn, (pressed || missingAttrs) && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={missingAttrs}
          >
            <Icon name="Plus" size={18} color={colors.white} />
            <Text variant="bodyMedium" style={{ color: colors.white }}>
              {missingAttrs ? t('client.product_detail.select_options') : t('client.add_to_cart')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.qtyRow}>
            <Pressable style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.7 }]} onPress={handleDecrement}>
              <Icon name="Minus" size={18} color={colors.ink} />
            </Pressable>
            <Text variant="title" align="center" style={{ flex: 1 }}>{qty}</Text>
            <Pressable style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.7 }]} onPress={handleAdd}>
              <Icon name="Plus" size={18} color={colors.ink} />
            </Pressable>
          </View>
        )}
      </View>
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
  detailsBlock: { padding: space[4] },
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
  attrRow: { paddingHorizontal: space[3], paddingVertical: space[3] },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  optChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: space[3],
    paddingVertical: 6,
  },
  optChipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  bottomBar: {
    padding: space[3],
    borderTopWidth: 1, borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: space[3] + 2,
  },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2],
  },
  qtyBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
});
