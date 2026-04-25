// A-06 · Ficha de producto
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Image, Alert, FlatList, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import ResourceError from '@/components/ResourceError';
import { supabase } from '@/lib/supabase';
import type { Product, ProductImage } from '@/hooks/useAgent';

const { width } = Dimensions.get('window');

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function DataRow({ label, value, last }: { label: string; value: string | number | undefined | null; last?: boolean }) {
  if (value == null || value === '') return null;
  return (
    <View style={[styles.dataRow, !last && styles.dataRowBorder]}>
      <Text variant="small" color="ink3">{label}</Text>
      <Text variant="smallMedium">{value}</Text>
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

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
  }, [id]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  if (loaded && !product) {
    return (
      <ResourceError
        topBarTitle="Producto"
        title={loadError ? 'Error de conexión' : 'Producto no encontrado'}
        message={loadError ? 'No se pudo cargar el producto.' : 'No existe o no tienes permisos para verlo.'}
        detail={loadError}
        onBack={() => router.back()}
        onRetry={fetchProduct}
      />
    );
  }

  if (!product) {
    return (
      <Screen>
        <TopBar title="Producto" onBack={() => router.back()} />
        <Text variant="small" color="ink3" align="center" style={{ marginTop: space[8] }}>Cargando...</Text>
      </Screen>
    );
  }

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

  const subtitle = [supplierName, catalogName].filter(Boolean).join(' · ');

  return (
    <Screen>
      <TopBar
        title={subtitle || 'Producto'}
        onBack={() => router.back()}
        actions={[
          { icon: 'Pencil', onPress: () => router.push(`/(agent)/producto/editar?id=${id}` as any), accessibilityLabel: 'Editar producto' },
          { icon: 'Trash2', onPress: handleDeleteProduct, accessibilityLabel: 'Eliminar producto' },
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
            {product.reference ? <Text variant="caption" color="ink3">Ref. {product.reference}</Text> : null}
            {product.reference && product.barcode ? <View style={styles.sep} /> : null}
            {product.barcode ? <Text variant="caption" color="ink3">EAN: {product.barcode}</Text> : null}
          </View>
          <Text variant="display" style={{ marginTop: space[3] }}>{formatEur(product.price)}</Text>
          <Text variant="caption" color="ink3">Precio de tarifa · IVA no incluido</Text>
          {product.pvpr != null && (
            <Text variant="small" color="ink3" style={{ marginTop: space[1] }}>
              PVPR: {formatEur(product.pvpr)}
            </Text>
          )}
        </View>

        {/* Descripción */}
        {product.description ? (
          <View style={styles.descBlock}>
            <Text variant="caption" color="ink3" style={styles.sectionLabel}>Descripción</Text>
            <Text variant="small" color="ink2" style={{ lineHeight: 20 }}>{product.description}</Text>
          </View>
        ) : null}

        {/* Detalles adicionales */}
        <View style={styles.detailsBlock}>
          <Text variant="caption" color="ink3" style={styles.sectionLabel}>Detalles</Text>
          <View style={styles.detailsCard}>
            <DataRow label="Referencia 2" value={product.reference_2} />
            <DataRow label="Familia" value={product.familia} />
            <DataRow label="Subfamilia" value={product.subfamilia} />
            <DataRow label="Medidas" value={product.measures} />
            <DataRow label="Stock" value={product.stock} />
            <DataRow label="Caja estándar" value={product.standard_box != null ? `${product.standard_box} uds.` : null} />
            <DataRow label="Unidades mínimas" value={product.min_units != null ? `${product.min_units} uds.` : null} last />
          </View>
        </View>
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
});
