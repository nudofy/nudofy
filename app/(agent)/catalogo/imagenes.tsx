// Subida masiva de imágenes para un catálogo
// Empareja cada archivo con un producto comparando el nombre (sin extensión)
// contra `reference`, `reference_2` o `barcode` del producto.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Image, ActivityIndicator, Platform,
} from 'react-native';
import { pickFiles as pickFilesUtil } from '@/lib/filePicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { resizeForUpload } from '@/lib/imageResize';

type Product = {
  id: string;
  name: string;
  reference: string | null;
  reference_2: string | null;
  barcode: string | null;
  image_url: string | null;
};

type Pick = {
  uri: string;
  name: string;
  size: number | null;
  matchKey: string;        // nombre del archivo sin extensión, normalizado
  productId: string | null;
  productName: string | null;
};

type Result = {
  fileName: string;
  ok: boolean;
  productName?: string;
  error?: string;
};

function normalize(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[\s_\-.]+$/g, '')
    .replace(/^[\s_\-.]+/g, '');
}

function nameWithoutExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export default function CatalogoImagenesScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { t } = useTranslation('agent');
  const toast = useToast();
  const { catalogId } = useLocalSearchParams<{ catalogId: string }>();

  const [catalogName, setCatalogName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Result[]>([]);

  // Cargar productos del catálogo
  useEffect(() => {
    if (!catalogId) return;
    (async () => {
      const [{ data: cat }, { data: prods }] = await Promise.all([
        supabase.from('catalogs').select('name').eq('id', catalogId).single(),
        supabase.from('products').select('id, name, reference, reference_2, barcode, image_url').eq('catalog_id', catalogId),
      ]);
      if (cat) setCatalogName(cat.name);
      if (prods) setProducts(prods as Product[]);
      setLoadingProducts(false);
    })();
  }, [catalogId]);

  // Índice rápido para búsqueda
  const productsByKey = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      if (p.reference)   map.set(normalize(p.reference), p);
      if (p.reference_2) map.set(normalize(p.reference_2), p);
      if (p.barcode)     map.set(normalize(p.barcode), p);
    }
    return map;
  }, [products]);

  const matchedCount = picks.filter(p => p.productId).length;
  const unmatchedCount = picks.length - matchedCount;

  async function pickFiles() {
    const assets = await pickFilesUtil({ type: 'image/*', multiple: true });
    if (!assets) return;

    const newPicks: Pick[] = assets.map(a => {
      const fname = a.name ?? 'sin_nombre.jpg';
      const matchKey = normalize(nameWithoutExt(fname));
      const matched = productsByKey.get(matchKey) ?? null;
      return {
        uri: a.uri,
        name: fname,
        size: a.size ?? null,
        matchKey,
        productId: matched?.id ?? null,
        productName: matched?.name ?? null,
      };
    });
    setPicks(newPicks);
    setResults([]);
  }

  function removePick(uri: string) {
    setPicks(prev => prev.filter(p => p.uri !== uri));
  }

  async function uploadOne(pick: Pick): Promise<Result> {
    if (!pick.productId) {
      return { fileName: pick.name, ok: false, error: t('catalog_images.no_product_error') };
    }
    try {
      const resizedUri = await resizeForUpload(pick.uri);
      const ext = Platform.OS === 'web' ? (pick.name.split('.').pop() ?? 'jpg').toLowerCase() : 'jpg';
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const response = await fetch(resizedUri);
      const arrayBuffer = await response.arrayBuffer();
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(filename, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, cacheControl: '31536000' });
      if (upErr) return { fileName: pick.name, ok: false, error: upErr.message };

      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(filename);
      const url = pub.publicUrl;

      // Insertar en product_images con la siguiente position disponible
      const { data: existing } = await supabase
        .from('product_images')
        .select('position')
        .eq('product_id', pick.productId)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;

      const { error: insErr } = await supabase
        .from('product_images')
        .insert({ product_id: pick.productId, url, position: nextPos });
      if (insErr) return { fileName: pick.name, ok: false, error: insErr.message };

      // Si el producto no tenía image_url, ponemos esta como principal
      const product = products.find(p => p.id === pick.productId);
      if (product && !product.image_url) {
        await supabase.from('products').update({ image_url: url }).eq('id', pick.productId);
      }

      return { fileName: pick.name, ok: true, productName: pick.productName ?? '' };
    } catch (e: any) {
      return { fileName: pick.name, ok: false, error: e?.message ?? t('catalog_images.unknown_error') };
    }
  }

  async function uploadAll() {
    const toUpload = picks.filter(p => p.productId);
    if (toUpload.length === 0) {
      toast.error(t('catalog_images.no_matched_error'));
      return;
    }
    setUploading(true);
    setProgress({ done: 0, total: toUpload.length });
    const out: Result[] = [];
    for (let i = 0; i < toUpload.length; i++) {
      const r = await uploadOne(toUpload[i]);
      out.push(r);
      setProgress({ done: i + 1, total: toUpload.length });
    }
    setResults(out);
    setUploading(false);
    const okCount = out.filter(r => r.ok).length;
    if (okCount > 0) toast.success(t('catalog_images.uploaded_success', { count: okCount }));
    if (okCount < out.length) toast.error(t('catalog_images.uploaded_fail', { count: out.length - okCount }));
    // Refrescar lista de productos para que image_url quede actualizado en futuras selecciones
    if (catalogId) {
      const { data } = await supabase
        .from('products')
        .select('id, name, reference, reference_2, barcode, image_url')
        .eq('catalog_id', catalogId);
      if (data) setProducts(data as Product[]);
    }
    setPicks([]);
  }

  if (loadingProducts) {
    return (
      <Screen>
        <TopBar title={t('catalog_images.title_fallback')} onBack={() => goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={catalogName ? t('catalog_images.title_with_name', { name: catalogName }) : t('catalog_images.title_fallback')} onBack={() => goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Explicación */}
        <View style={styles.help}>
          <Icon name="Info" size={18} color={colors.brand} />
          <Text variant="small" color="ink2" style={{ flex: 1 }}>
            {t('catalog_images.help_prefix')} <Text variant="smallMedium">{t('catalog_images.help_filename')}</Text> {t('catalog_images.help_with')}{' '}
            <Text variant="smallMedium">{t('catalog_images.help_reference')}</Text> {t('catalog_images.help_suffix')}{' '}
            <Text variant="smallMedium">A11SP.jpg</Text> {t('catalog_images.help_associates')} <Text variant="smallMedium">A11SP</Text>.
          </Text>
        </View>

        {/* Botón seleccionar */}
        <Button
          label={picks.length > 0 ? t('catalog_images.change_selection', { count: picks.length }) : t('catalog_images.select_images')}
          icon="Plus"
          onPress={pickFiles}
          variant={picks.length > 0 ? 'secondary' : 'primary'}
          fullWidth
        />

        {/* Resumen */}
        {picks.length > 0 && (
          <View style={styles.summary}>
            <Badge label={t('catalog_images.matched_count', { count: matchedCount })} variant={matchedCount > 0 ? 'success' : 'neutral'} />
            {unmatchedCount > 0 && <Badge label={t('catalog_images.unmatched_count', { count: unmatchedCount })} variant="warning" />}
          </View>
        )}

        {/* Lista de imágenes */}
        {picks.map(pick => (
          <View key={pick.uri} style={styles.row}>
            <Image source={{ uri: pick.uri }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text variant="smallMedium" numberOfLines={1}>{pick.name}</Text>
              {pick.productName ? (
                <Text variant="caption" color="ink3" numberOfLines={1}>
                  → {pick.productName}
                </Text>
              ) : (
                <Text variant="caption" color="warning">
                  {t('catalog_images.no_product_ref', { key: pick.matchKey })}
                </Text>
              )}
            </View>
            {pick.productId
              ? <Icon name="Check" size={20} color={colors.success} />
              : <Icon name="TriangleAlert" size={20} color={colors.warning} />}
            <Pressable onPress={() => removePick(pick.uri)} hitSlop={8} disabled={uploading}>
              <Icon name="X" size={18} color={colors.ink3} />
            </Pressable>
          </View>
        ))}

        {/* Subir todas */}
        {matchedCount > 0 && (
          <Button
            label={uploading
              ? t('catalog_images.uploading_progress', { done: progress.done, total: progress.total })
              : t('catalog_images.upload_count', { count: matchedCount })}
            icon="Upload"
            onPress={uploadAll}
            loading={uploading}
            disabled={uploading}
            fullWidth
          />
        )}

        {/* Resultados */}
        {results.length > 0 && (
          <View style={styles.results}>
            <Text variant="bodyMedium" style={{ marginBottom: space[2] }}>{t('catalog_images.results_title')}</Text>
            {results.map((r, i) => (
              <View key={i} style={styles.resultRow}>
                <Icon
                  name={r.ok ? 'Check' : 'X'}
                  size={16}
                  color={r.ok ? colors.success : colors.danger}
                />
                <Text variant="caption" color="ink2" style={{ flex: 1 }} numberOfLines={1}>
                  {r.fileName}
                  {r.ok && r.productName ? ` → ${r.productName}` : ''}
                  {!r.ok && r.error ? ` · ${r.error}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[3] },
  help: {
    flexDirection: 'row',
    gap: space[2],
    backgroundColor: colors.brandSoft,
    padding: space[3],
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  summary: {
    flexDirection: 'row',
    gap: space[2],
    flexWrap: 'wrap',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[2],
  },
  thumb: {
    width: 48, height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  results: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[1] + 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
});
