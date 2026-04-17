// A-06 · Ficha de producto
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Alert, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';
import type { Product, ProductImage } from '@/hooks/useAgent';

const { width } = Dimensions.get('window');

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function Row({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

export default function ProductoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [extraImages, setExtraImages] = useState<ProductImage[]>([]);
  const [catalogName, setCatalogName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      setProduct(data);
      if (data?.catalog_id) {
        supabase
          .from('catalogs')
          .select('name, supplier:suppliers(name)')
          .eq('id', data.catalog_id)
          .single()
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
  }, [id]);

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  // Build image list: extra images if available, else fall back to image_url
  const allImages: string[] = extraImages.length > 0
    ? extraImages.map(i => i.url)
    : product.image_url ? [product.image_url] : [];

  function handleDeleteProduct() {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${product!.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('products').delete().eq('id', id);
          router.back();
        }},
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Catálogo</Text>
        </TouchableOpacity>
        <View style={styles.topbarInfo}>
          <Text style={styles.topbarProv} numberOfLines={1}>{supplierName}</Text>
          <Text style={styles.topbarCat} numberOfLines={1}>{catalogName}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/(agent)/producto/editar?id=${id}` as any)}>
          <Text style={styles.editBtn}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteProduct}>
          <Text style={styles.deleteBtn}>Eliminar</Text>
        </TouchableOpacity>
      </View>

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
                <Image source={{ uri: item }} style={[styles.image, { width }]} />
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
            <Text style={styles.imagePlaceholder}>📦</Text>
          </View>
        )}

        {/* Info principal */}
        <View style={styles.infoBlock}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.refRow}>
            {product.reference ? <Text style={styles.ref}>Ref. {product.reference}</Text> : null}
            {product.reference && product.barcode ? <View style={styles.sep} /> : null}
            {product.barcode ? <Text style={styles.ref}>EAN: {product.barcode}</Text> : null}
          </View>
          <Text style={styles.price}>{formatEur(product.price)}</Text>
          <Text style={styles.priceSub}>Precio de tarifa · IVA no incluido</Text>
          {product.pvpr != null && (
            <Text style={styles.pvpr}>PVPR: {formatEur(product.pvpr)}</Text>
          )}
        </View>

        {/* Descripción */}
        {product.description ? (
          <View style={styles.descBlock}>
            <Text style={styles.descLabel}>Descripción</Text>
            <Text style={styles.desc}>{product.description}</Text>
          </View>
        ) : null}

        {/* Detalles adicionales */}
        <View style={styles.detailsBlock}>
          <Row label="Referencia 2" value={product.reference_2} />
          <Row label="Familia" value={product.familia} />
          <Row label="Subfamilia" value={product.subfamilia} />
          <Row label="Medidas" value={product.measures} />
          <Row label="Stock" value={product.stock} />
          <Row label="Caja estándar" value={product.standard_box != null ? `${product.standard_box} uds.` : null} />
          <Row label="Unidades mínimas" value={product.min_units != null ? `${product.min_units} uds.` : null} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  loading: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  back: { fontSize: 14, color: colors.brand },
  topbarInfo: { flex: 1 },
  editBtn: { fontSize: 13, color: colors.brand, fontWeight: '500' },
  deleteBtn: { fontSize: 13, color: '#C0392B', fontWeight: '500' },
  topbarProv: { fontSize: 13, fontWeight: '500', color: colors.text },
  topbarCat: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  image: { height: 260, resizeMode: 'cover', backgroundColor: '#f0f0ee' },
  dotRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingVertical: 8, backgroundColor: '#f0f0ee' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ccc' },
  dotActive: { backgroundColor: colors.brand },
  imagePlaceholderBox: {
    height: 220, backgroundColor: '#f0f0ee',
    alignItems: 'center', justifyContent: 'center' },
  imagePlaceholder: { fontSize: 80 },
  infoBlock: {
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  productName: { fontSize: 18, fontWeight: '500', color: colors.text, lineHeight: 24 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  ref: { fontSize: 12, color: colors.textMuted },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#ddd' },
  price: { fontSize: 26, fontWeight: '500', color: colors.brand, marginTop: 12 },
  priceSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pvpr: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  descBlock: {
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  descLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  desc: { fontSize: 13, color: '#555', lineHeight: 20 },
  detailsBlock: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 32 },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5' },
  dataLabel: { fontSize: 13, color: colors.textMuted },
  dataValue: { fontSize: 13, fontWeight: '500', color: colors.text } });
