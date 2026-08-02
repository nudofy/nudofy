// A-05 Vista 2 — Catálogos de un proveedor
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Alert, Modal, TextInput, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { confirmDestructive } from '@/lib/confirm';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge, Button } from '@/components/ui';
import ResourceError from '@/components/ResourceError';
import { supabase } from '@/lib/supabase';
import { useCatalogs } from '@/hooks/useAgent';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useToast } from '@/contexts/ToastContext';
import type { Supplier, Catalog } from '@/hooks/useAgent';

export default function ProveedorScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { t, i18n } = useTranslation('agent');
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { catalogs, loading, createCatalog, refetch } = useCatalogs(id);
  const { canAddCatalog, catalogUsageLabel, catalogLimit } = usePlanLimits();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const [showNewCatalog, setShowNewCatalog] = useState(false);
  const [catalogName, setCatalogName] = useState('');
  const [catalogSeason, setCatalogSeason] = useState('');
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [localOrder, setLocalOrder] = useState<Catalog[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchSupplier = useCallback(() => {
    if (!id) return;
    setLoaded(false);
    setLoadError(null);
    supabase.from('suppliers').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setLoadError(error.message);
      setSupplier((data as Supplier | null) ?? null);
      setLoaded(true);
    });
  }, [id]);

  useEffect(() => { fetchSupplier(); }, [fetchSupplier]);

  if (loaded && !supplier) {
    return (
      <ResourceError
        topBarTitle={t('supplier_detail.top_bar_title')}
        title={loadError ? t('supplier_detail.error_title') : t('supplier_detail.not_found_title')}
        message={loadError ? t('supplier_detail.error_message') : t('supplier_detail.not_found_message')}
        detail={loadError}
        onBack={() => goBack()}
        onRetry={fetchSupplier}
      />
    );
  }

  function handleOpenNewCatalog() {
    if (!canAddCatalog) {
      Alert.alert(
        t('supplier_detail.limit_title'),
        t('supplier_detail.limit_body', { limit: catalogLimit, usage: catalogUsageLabel }),
        [{ text: t('supplier_detail.understood') }]
      );
      return;
    }
    setShowNewCatalog(true);
  }

  async function handleCreateCatalog() {
    if (!catalogName.trim()) return;
    setSavingCatalog(true);
    const { error } = await createCatalog({
      supplier_id: id!,
      name: catalogName.trim(),
      season: catalogSeason.trim() || undefined,
      status: 'active' });
    setSavingCatalog(false);
    if (error) { toast.error(error); return; }
    setCatalogName('');
    setCatalogSeason('');
    setShowNewCatalog(false);
    toast.success(t('supplier_detail.catalog_created'));
  }

  function openReorder() {
    setLocalOrder([...catalogs]);
    setReordering(true);
  }

  async function saveOrder() {
    setSavingOrder(true);
    const updates = localOrder.map((c, idx) =>
      supabase.from('catalogs').update({ position: idx }).eq('id', c.id)
    );
    await Promise.all(updates);
    setSavingOrder(false);
    setReordering(false);
    toast.success(t('supplier_detail.order_saved'));
  }

  function handleDeleteSupplier() {
    confirmDestructive(
      t('supplier_detail.delete_supplier'),
      t('supplier_detail.delete_supplier_body', { name: supplier?.name }),
      async () => {
        await supabase.from('suppliers').delete().eq('id', id);
        goBack();
      }
    );
  }

  return (
    <Screen>
      <TopBar
        title={supplier?.name ?? '...'}
        onBack={() => goBack()}
        actions={[
          { icon: 'ArrowUpDown', onPress: openReorder, accessibilityLabel: t('supplier_detail.reorder_catalogs') },
          { icon: 'Pencil', onPress: () => router.push(`/(agent)/proveedor/editar?id=${id}` as any), accessibilityLabel: t('supplier_detail.edit_supplier') },
          { icon: 'Trash2', onPress: handleDeleteSupplier, accessibilityLabel: t('supplier_detail.delete_supplier') },
          { icon: 'Plus', onPress: handleOpenNewCatalog, accessibilityLabel: t('supplier_detail.new_catalog') },
        ]}
      />

      {/* Cabecera del proveedor */}
      {supplier && (
        <View style={styles.provHeader}>
          {supplier.logo_url ? (
            <Image source={{ uri: supplier.logo_url }} style={styles.provLogoImage} resizeMode="contain" />
          ) : (
            <View style={styles.provLogo}>
              <Text variant="heading" color="ink2">{supplier.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">{supplier.name}</Text>
            <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
              {t('supplier_detail.catalog_count', { count: catalogs.length })}
            </Text>
          </View>
        </View>
      )}

      {/* Lista de catálogos */}
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>{t('supplier_detail.loading')}</Text>
        )}
        {!loading && catalogs.length === 0 && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
            {t('supplier_detail.no_catalogs')}
          </Text>
        )}
        {catalogs.map(catalog => (
          <CatalogCard
            key={catalog.id}
            catalog={catalog}
            onPress={() => router.push(`/(agent)/catalogo/${catalog.id}` as any)}
          />
        ))}
      </ScrollView>

      {/* Modal reordenar catálogos */}
      <Modal visible={reordering} animationType="slide" onRequestClose={() => setReordering(false)}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.reorderHeader}>
            <Text variant="heading">{t('supplier_detail.reorder_catalogs')}</Text>
            <Text variant="small" color="ink3" style={{ marginTop: 4 }}>
              {t('supplier_detail.reorder_hint')}
            </Text>
          </View>
          <DraggableFlatList
            data={localOrder}
            keyExtractor={item => item.id}
            onDragEnd={({ data }) => setLocalOrder(data)}
            contentContainerStyle={styles.dragList}
            renderItem={({ item, drag, isActive }: RenderItemParams<Catalog>) => (
              <ScaleDecorator>
                <Pressable
                  onLongPress={drag}
                  style={[styles.dragRow, isActive && styles.dragRowActive]}
                >
                  <Icon name="GripVertical" size={20} color={colors.ink3} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{item.name}</Text>
                    {item.season && <Text variant="caption" color="ink3">{item.season}</Text>}
                  </View>
                  <Badge label={item.status === 'active' ? t('supplier_detail.status_active') : t('supplier_detail.status_archived')} variant={item.status === 'active' ? 'success' : 'neutral'} />
                </Pressable>
              </ScaleDecorator>
            )}
          />
          <View style={styles.reorderFooter}>
            <Pressable style={[styles.footerBtn, styles.footerBtnSecondary]} onPress={() => setReordering(false)}>
              <Text variant="bodyMedium" color="ink2">{t('supplier_detail.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.footerBtn, styles.footerBtnPrimary, savingOrder && { opacity: 0.6 }]}
              onPress={saveOrder}
              disabled={savingOrder}
            >
              <Text variant="bodyMedium" color="white">{savingOrder ? t('supplier_detail.saving') : t('supplier_detail.save_order')}</Text>
            </Pressable>
          </View>
        </GestureHandlerRootView>
      </Modal>

      {/* Modal nuevo catálogo */}
      <Modal visible={showNewCatalog} transparent animationType="slide" onRequestClose={() => setShowNewCatalog(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text variant="heading" style={{ marginBottom: space[3] }}>{t('supplier_detail.new_catalog_title')}</Text>

              <Text variant="caption" color="ink3" style={styles.modalLabel}>{t('supplier_detail.name')}</Text>
              <TextInput
                style={styles.modalInput}
                value={catalogName}
                onChangeText={setCatalogName}
                placeholder={t('supplier_detail.name_placeholder')}
                placeholderTextColor={colors.ink4}
              />

              <Text variant="caption" color="ink3" style={styles.modalLabel}>{t('supplier_detail.season')}</Text>
              <TextInput
                style={styles.modalInput}
                value={catalogSeason}
                onChangeText={setCatalogSeason}
                placeholder={t('supplier_detail.season_placeholder')}
                placeholderTextColor={colors.ink4}
              />

              <View style={styles.modalActions}>
                <Button
                  label={t('supplier_detail.cancel')}
                  variant="secondary"
                  onPress={() => { setShowNewCatalog(false); setCatalogName(''); setCatalogSeason(''); }}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('supplier_detail.create_catalog')}
                  onPress={handleCreateCatalog}
                  loading={savingCatalog}
                  disabled={!catalogName.trim()}
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

function CatalogCard({ catalog, onPress }: { catalog: Catalog; onPress: () => void }) {
  const { t, i18n } = useTranslation('agent');
  const isActive = catalog.status === 'active';
  const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
  const date = new Date(catalog.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Pressable style={({ pressed }) => [styles.catCard, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={styles.catIcon}>
        <Icon name="BookOpen" size={18} color={colors.ink2} />
      </View>
      <View style={styles.catBody}>
        <Text variant="bodyMedium">{catalog.name}</Text>
        <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
          {catalog.season ? `${catalog.season} · ` : ''}{t('supplier_detail.created_on', { date })}
        </Text>
      </View>
      <View style={styles.catRight}>
        <Text variant="caption" color="ink3">{t('supplier_detail.refs_count', { count: catalog.product_count ?? 0 })}</Text>
        <Badge label={isActive ? t('supplier_detail.status_active') : t('supplier_detail.status_archived')} variant={isActive ? 'success' : 'neutral'} />
      </View>
      <Icon name="ChevronRight" size={18} color={colors.ink4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  provHeader: {
    backgroundColor: colors.white,
    padding: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  provLogo: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  provLogoImage: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },

  listContent: { padding: space[3], gap: space[2] },
  catCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  catIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  catBody: { flex: 1, minWidth: 0 },
  catRight: { alignItems: 'flex-end', gap: 4 },
  emptyText: { paddingVertical: space[8] },

  reorderHeader: {
    padding: space[4],
    paddingTop: space[8],
    borderBottomWidth: 1, borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  dragList: { padding: space[3], gap: space[2] },
  dragRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  dragRowActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  reorderFooter: {
    flexDirection: 'row', gap: space[2],
    padding: space[4],
    borderTopWidth: 1, borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  footerBtn: {
    flex: 1, paddingVertical: space[3],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  footerBtnSecondary: {
    borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
  },
  footerBtnPrimary: {
    backgroundColor: colors.brand,
  },

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
  modalActions: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
});
