// A-06 · Ficha de producto (solo lectura)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function ProductoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [catalogName, setCatalogName] = useState('');
  const [supplierName, setSupplierName] = useState('');

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
  }, [id]);

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Cargando...</Text>
      </SafeAreaView>
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
          <Text style={styles.topbarProv}>{supplierName}</Text>
          <Text style={styles.topbarCat}>{catalogName}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Imagen */}
        <View style={styles.imageArea}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} />
          ) : (
            <Text style={styles.imagePlaceholder}>📦</Text>
          )}
        </View>

        {/* Info principal */}
        <View style={styles.infoBlock}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.refRow}>
            {product.reference && <Text style={styles.ref}>Ref. {product.reference}</Text>}
            {product.reference && product.barcode && <View style={styles.sep} />}
            {product.barcode && <Text style={styles.ref}>EAN: {product.barcode}</Text>}
          </View>
          <Text style={styles.price}>{formatEur(product.price)}</Text>
          <Text style={styles.priceSub}>Precio de tarifa · IVA no incluido</Text>
        </View>

        {/* Descripción */}
        {product.description && (
          <View style={styles.descBlock}>
            <Text style={styles.desc}>{product.description}</Text>
          </View>
        )}
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
    borderBottomColor: '#efefef',
  },
  back: { fontSize: 14, color: colors.purple },
  topbarInfo: { flex: 1 },
  topbarProv: { fontSize: 13, fontWeight: '500', color: colors.text },
  topbarCat: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  imageArea: {
    height: 220,
    backgroundColor: '#f0f0ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { fontSize: 80 },
  infoBlock: {
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  productName: { fontSize: 18, fontWeight: '500', color: colors.text, lineHeight: 24 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  ref: { fontSize: 12, color: colors.textMuted },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#ddd' },
  price: { fontSize: 26, fontWeight: '500', color: colors.purple, marginTop: 12 },
  priceSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  descBlock: {
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  desc: { fontSize: 13, color: '#555', lineHeight: 20 },
});
