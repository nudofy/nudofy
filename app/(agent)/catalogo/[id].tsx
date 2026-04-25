// A-05 Vista 3 — Productos del catálogo (grid con filtros)
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, TextInput, FlatList, Pressable, ScrollView,
  StyleSheet, Image, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { useProducts } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Product } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function CatalogoScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, loading } = useProducts(id);
  const [catalogName, setCatalogName] = useState('');
  const [catalogSeason, setCatalogSeason] = useState('');
  const [catalogStatus, setCatalogStatus] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');
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
    Alert.alert(
      'Eliminar catálogo',
      `¿Eliminar "${catalogName}"? Se eliminarán también todos sus productos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('catalogs').delete().eq('id', id);
          router.back();
        }},
      ]
    );
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

  const filtered = useMemo(() =>
    products.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').includes(search);
      const matchFamilia = !selectedFamilia || p.familia === selectedFamilia;
      const matchSubfamilia = !selectedSubfamilia || p.subfamilia === selectedSubfamilia;
      return matchSearch && matchFamilia && matchSubfamilia;
    }),
    [products, search, selectedFamilia, selectedSubfamilia]
  );

  function selectFamilia(f: string) {
    if (selectedFamilia === f) {
      setSelectedFamilia(null);
      setSelectedSubfamilia(null);
    } else {
      setSelectedFamilia(f);
      setSelectedSubfamilia(null);
    }
  }

  function renderProduct({ item }: { item: Product }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
        onPress={() => router.push(`/(agent)/producto/${item.id}` as any)}
      >
        <View style={styles.cardImage}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <Icon name="Package" size={32} color={colors.ink4} />
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text variant="smallMedium" numberOfLines={2}>{item.name}</Text>
          {item.reference ? (
            <Text variant="caption" color="ink3">Ref. {item.reference}</Text>
          ) : null}
          {(item.familia || item.subfamilia) ? (
            <Text variant="caption" color="ink3" numberOfLines={1}>
              {[item.familia, item.subfamilia].filter(Boolean).join(' › ')}
            </Text>
          ) : null}
          <Text variant="bodyMedium" style={{ marginTop: 2 }}>{formatEur(item.price)}</Text>
          {item.stock != null ? (
            <Text variant="caption" color="ink3">Stock: {item.stock}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Screen>
      <TopBar
        title={catalogName || 'Catálogo'}
        onBack={() => router.back()}
        actions={[
          { icon: 'Upload', onPress: () => router.push(`/(agent)/catalogo/importar?catalogId=${id}` as any), accessibilityLabel: 'Importar CSV' },
          { icon: 'Pencil', onPress: openEdit, accessibilityLabel: 'Editar catálogo' },
          { icon: 'Trash2', onPress: handleDeleteCatalog, accessibilityLabel: 'Eliminar catálogo' },
          { icon: 'Plus', onPress: () => router.push(`/(agent)/producto/nuevo?catalogId=${id}` as any), accessibilityLabel: 'Nuevo producto' },
        ]}
      />

      {/* Buscador */}
      <View style={styles.searchBarWrap}>
        <View style={styles.inputWithIcon}>
          <Icon name="Search" size={16} color={colors.ink4} />
          <TextInput
            style={styles.inputEl}
            placeholder="Buscar por nombre, ref. o EAN..."
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

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
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
          </Text>
          <Pressable onPress={() => { setSearch(''); setSelectedFamilia(null); setSelectedSubfamilia(null); }}>
            <Text variant="caption" color="ink2">Limpiar filtros</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />
      ) : filtered.length === 0 ? (
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          {search || selectedFamilia ? 'Sin resultados' : 'Sin productos. Pulsa + para añadir uno.'}
        </Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal editar catálogo */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text variant="heading" style={{ marginBottom: space[3] }}>Editar catálogo</Text>

              <Text variant="caption" color="ink3" style={styles.modalLabel}>Nombre *</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre del catálogo"
                placeholderTextColor={colors.ink4}
              />

              <Text variant="caption" color="ink3" style={styles.modalLabel}>Temporada (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                value={editSeason}
                onChangeText={setEditSeason}
                placeholder="Ej: SS25"
                placeholderTextColor={colors.ink4}
              />

              <Text variant="caption" color="ink3" style={styles.modalLabel}>Estado</Text>
              <View style={styles.statusRow}>
                {(['active', 'archived'] as const).map(s => (
                  <Pressable
                    key={s}
                    style={[styles.statusOption, editStatus === s && styles.statusOptionActive]}
                    onPress={() => setEditStatus(s)}
                  >
                    <Text variant="smallMedium" color={editStatus === s ? 'white' : 'ink2'}>
                      {s === 'active' ? 'Activo' : 'Archivado'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => setShowEdit(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Guardar"
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
    maxHeight: 48,
  },
  subChipsScroll: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    maxHeight: 44,
  },
  chipsContent: {
    paddingHorizontal: space[4], paddingVertical: space[2],
    gap: space[2], flexDirection: 'row',
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
    height: 140,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardInfo: { padding: space[2], gap: 2 },
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
