// A-05 Vista 3 — Productos del catálogo (grid con filtros)
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, TextInput, FlatList, Pressable, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { alertInfo } from '@/lib/confirm';
import { useTranslation } from 'react-i18next';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button, Badge } from '@/components/ui';
import { useProducts } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { formatEur } from '@/lib/format';
import type { Product } from '@/hooks/useAgent';

function useGridLayout() {
  const { width } = useWindowDimensions();
  if (width >= 1024) return { numColumns: 4, imageHeight: 260 };
  if (width >= 640)  return { numColumns: 3, imageHeight: 230 };
  return { numColumns: 2, imageHeight: 170 };
}

export default function CatalogoScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { t, i18n } = useTranslation('agent');
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, loading, refetch } = useProducts(id);

  useFocusEffect(React.useCallback(() => { refetch(); }, [refetch]));
  const { numColumns, imageHeight } = useGridLayout();
  const [catalogName, setCatalogName] = useState('');
  const [catalogSeason, setCatalogSeason] = useState('');
  const [catalogStatus, setCatalogStatus] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'reference' | 'price'>('name');
  const [selectedFamilia, setSelectedFamilia] = useState<string | null>(null);
  const [selectedSubfamilia, setSelectedSubfamilia] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSeason, setEditSeason] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'archived'>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('catalogs').select('name, season, status').eq('id', id).single().then(({ data }) => {
      if (data) {
        setCatalogName(data.name);
        setCatalogSeason(data.season ?? '');
        setCatalogStatus(data.status ?? 'active');
      }
    });
  }, [id]);

  function openEdit() {
    setEditName(catalogName);
    setEditSeason(catalogSeason);
    setEditStatus(catalogStatus);
    setShowEdit(true);
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase.from('catalogs').update({
      name: editName.trim(),
      season: editSeason.trim() || null,
      status: editStatus,
    }).eq('id', id);
    setSavingEdit(false);
    if (error) { toast.error(error.message); return; }
    setCatalogName(editName.trim());
    setCatalogSeason(editSeason.trim());
    setCatalogStatus(editStatus);
    setShowEdit(false);
  }

  function handleDeleteCatalog() {
    const doDelete = async () => {
      const { error } = await supabase.from('catalogs').delete().eq('id', id);
      if (error) {
        // 23503 = violacion de clave foranea (Postgres). orders.catalog_id no
        // tiene ON DELETE CASCADE a proposito - un pedido nunca debe perder
        // la referencia a su catalogo - asi que borrar un catalogo con
        // pedidos asociados falla en la base de datos. Antes esto se
        // ignoraba en silencio: el boton no daba error pero tampoco borraba
        // nada, parecia que "no dejaba" sin explicar por que.
        if (error.code === '23503') {
          alertInfo(t('catalog_detail.delete_blocked_title'), t('catalog_detail.delete_blocked_body'));
        } else {
          alertInfo(t('catalog_detail.error_title'), error.message);
        }
        return;
      }
      goBack();
    };
    const confirmMsg = t('catalog_detail.delete_catalog_confirm', { name: catalogName });
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        doDelete();
      }
    } else {
      Alert.alert(
        t('catalog_detail.delete_catalog'),
        confirmMsg,
        [
          { text: t('catalog_detail.cancel'), style: 'cancel' },
          { text: t('catalog_detail.delete'), style: 'destructive', onPress: doDelete },
        ]
      );
    }
  }

  const familias = useMemo(() => {
    const set = new Set(products.map(p => p.familia).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [products]);

  const subfamilias = useMemo(() => {
    if (!selectedFamilia) return [];
    const set = new Set(
      products
        .filter(p => p.familia === selectedFamilia && p.subfamilia)
        .map(p => p.subfamilia as string)
    );
    return Array.from(set).sort();
  }, [products, selectedFamilia]);

  const filtered = useMemo(() => {
    const result = products.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').includes(search);
      const matchFamilia = !selectedFamilia || p.familia === selectedFamilia;
      const matchSubfamilia = !selectedSubfamilia || p.subfamilia === selectedSubfamilia;
      return matchSearch && matchFamilia && matchSubfamilia;
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'reference') return (a.reference ?? '').localeCompare(b.reference ?? '');
      return a.name.localeCompare(b.name);
    });
  }, [products, search, selectedFamilia, selectedSubfamilia, sortBy]);

  function selectFamilia(f: string) {
    if (selectedFamilia === f) {
      setSelectedFamilia(null);
      setSelectedSubfamilia(null);
    } else {
      setSelectedFamilia(f);
      setSelectedSubfamilia(null);
    }
  }

  function renderProduct({ item }: { item: Product }, imageHeight = 140) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
        onPress={() => router.push(`/(agent)/producto/${item.id}` as any)}
      >
        <View style={[styles.cardImage, { height: imageHeight }]}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="disk"
              recyclingKey={item.id}
            />
          ) : (
            <Icon name="Package" size={32} color={colors.ink4} />
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text variant="smallMedium" numberOfLines={2}>{item.name}</Text>
          {item.reference ? (
            <Text variant="caption" color="ink3">{t('catalog_detail.ref_prefix', { ref: item.reference })}</Text>
          ) : null}
          {(item.familia || item.subfamilia) ? (
            <Text variant="caption" color="ink3" numberOfLines={1}>
              {[item.familia, item.subfamilia].filter(Boolean).join(' › ')}
            </Text>
          ) : null}
          <Text variant="bodyMedium" style={{ marginTop: 2 }}>{formatEur(item.price, i18n.language)}</Text>
          {item.stock != null ? (
            item.stock === 0 ? (
              <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                <Badge label={t('catalog_detail.out_of_stock')} variant="danger" />
              </View>
            ) : (
              <Text variant="caption" color="ink3">{t('catalog_detail.stock_label', { count: item.stock })}</Text>
            )
          ) : null}
        </View>
        {item.stock === 0 && (
          <View style={styles.outOfStockOverlay} pointerEvents="none" />
        )}
      </Pressable>
    );
  }

  return (
    <Screen>
      <TopBar
        title={catalogName || t('catalog_detail.title_fallback')}
        onBack={() => goBack()}
        actions={[
          { icon: 'Upload', onPress: () => router.push(`/(agent)/catalogo/importar?catalogId=${id}` as any), accessibilityLabel: t('catalog_detail.import_csv') },
          { icon: 'Images', onPress: () => router.push(`/(agent)/catalogo/imagenes?catalogId=${id}` as any), accessibilityLabel: t('catalog_detail.bulk_images') },
          { icon: 'Pencil', onPress: openEdit, accessibilityLabel: t('catalog_detail.edit_catalog') },
          { icon: 'Trash2', onPress: handleDeleteCatalog, accessibilityLabel: t('catalog_detail.delete_catalog') },
          { icon: 'Plus', onPress: () => router.push(`/(agent)/producto/nuevo?catalogId=${id}` as any), accessibilityLabel: t('catalog_detail.new_product') },
        ]}
      />

      {/* Buscador */}
      <View style={styles.searchBarWrap}>
        <View style={styles.inputWithIcon}>
          <Icon name="Search" size={16} color={colors.ink4} />
          <TextInput
            style={styles.inputEl}
            placeholder={t('catalog_detail.search_placeholder')}
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Orden */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        <Text variant="caption" color="ink3">{t('catalog_detail.sort_label')}</Text>
        {([
          { key: 'name', label: t('catalog_detail.sort_name') },
          { key: 'reference', label: t('catalog_detail.sort_reference') },
          { key: 'price', label: t('catalog_detail.sort_price') },
        ] as const).map(opt => (
          <Pressable
            key={opt.key}
            style={[styles.chip, sortBy === opt.key && styles.chipActive]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text variant="smallMedium" color={sortBy === opt.key ? 'white' : 'ink2'}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Filtro por familia */}
      {familias.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {familias.map(f => (
            <Pressable
              key={f}
              style={[styles.chip, selectedFamilia === f && styles.chipActive]}
              onPress={() => selectFamilia(f)}
            >
              <Text variant="smallMedium" color={selectedFamilia === f ? 'white' : 'ink2'}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Filtro por subfamilia */}
      {subfamilias.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subChipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {subfamilias.map(s => (
            <Pressable
              key={s}
              style={[styles.subChip, selectedSubfamilia === s && styles.subChipActive]}
              onPress={() => setSelectedSubfamilia(prev => prev === s ? null : s)}
            >
              <Text variant="caption" color={selectedSubfamilia === s ? 'ink' : 'ink3'}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Contador de resultados cuando hay filtro */}
      {(selectedFamilia || selectedSubfamilia || search) && (
        <View style={styles.resultsBar}>
          <Text variant="caption" color="ink3">
            {t('catalog_detail.results_count', { count: filtered.length })}
          </Text>
          <Pressable onPress={() => { setSearch(''); setSelectedFamilia(null); setSelectedSubfamilia(null); }}>
            <Text variant="caption" color="ink2">{t('catalog_detail.clear_filters')}</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />
      ) : filtered.length === 0 ? (
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          {search || selectedFamilia ? t('catalog_detail.no_results') : t('catalog_detail.no_products')}
        </Text>
      ) : (
        <FlatList
          key={numColumns}
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item }) => renderProduct({ item }, imageHeight)}
          numColumns={numColumns}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          removeClippedSubviews
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Modal editar catálogo */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text variant="heading" style={{ marginBottom: space[3] }}>{t('catalog_detail.edit_catalog_title')}</Text>

              <Text variant="caption" color="ink3" style={styles.modalLabel}>{t('catalog_detail.name')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder={t('catalog_detail.name_placeholder')}
                placeholderTextColor={colors.ink4}
              />

              <Text variant="caption" color="ink3" style={styles.modalLabel}>{t('catalog_detail.season')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editSeason}
                onChangeText={setEditSeason}
                placeholder={t('catalog_detail.season_placeholder')}
                placeholderTextColor={colors.ink4}
              />

              <Text variant="caption" color="ink3" style={styles.modalLabel}>{t('catalog_detail.status')}</Text>
              <View style={styles.statusRow}>
                {(['active', 'archived'] as const).map(s => (
                  <Pressable
                    key={s}
                    style={[styles.statusOption, editStatus === s && styles.statusOptionActive]}
                    onPress={() => setEditStatus(s)}
                  >
                    <Text variant="smallMedium" color={editStatus === s ? 'white' : 'ink2'}>
                      {s === 'active' ? t('catalog_detail.status_active') : t('catalog_detail.status_archived')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button
                  label={t('catalog_detail.cancel')}
                  variant="secondary"
                  onPress={() => setShowEdit(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('catalog_detail.save')}
                  onPress={handleSaveEdit}
                  loading={savingEdit}
                  disabled={!editName.trim()}
                  style={{ flex: 2 }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBarWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: space[4], paddingVertical: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space[3], height: 40,
    backgroundColor: colors.white,
  },
  inputEl: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 0 },

  chipsScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    flexShrink: 0,
  },
  subChipsScroll: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    flexShrink: 0,
  },
  chipsContent: {
    paddingHorizontal: space[4], paddingVertical: space[2],
    gap: space[2], flexDirection: 'row', alignItems: 'center',
  },
  chip: {
    paddingHorizontal: space[3], paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  subChip: {
    paddingHorizontal: space[2], paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
  },
  subChipActive: { backgroundColor: colors.surface2, borderColor: colors.ink2 },

  resultsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space[4], paddingVertical: space[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },

  grid: { padding: space[3] },
  row: { gap: space[2], marginBottom: space[2] },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  cardImage: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  cardInfo: { padding: space[2], gap: 2 },
  outOfStockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.md,
  },
  emptyText: { paddingVertical: space[8] },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: space[5], gap: space[2],
  },
  modalLabel: { marginTop: space[2] },
  modalInput: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2],
    fontSize: 14, color: colors.ink,
  },
  statusRow: { flexDirection: 'row', gap: space[2] },
  statusOption: {
    flex: 1, paddingVertical: space[3], borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  statusOptionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  modalActions: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
});
