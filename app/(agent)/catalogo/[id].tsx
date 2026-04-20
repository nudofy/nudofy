// A-05 Vista 3 — Productos del catálogo (grid con carrito)
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, Image, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { useProducts } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Simple per-session cart store (shared via module-level ref)
type CartItem = { product: Product; qty: number };
const cartStore: Record<string, CartItem> = {};

export default function CatalogoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, loading } = useProducts(id);
  const [catalogName, setCatalogName] = useState('');
  const [catalogSeason, setCatalogSeason] = useState('');
  const [catalogStatus, setCatalogStatus] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');
  const [selectedFamilia, setSelectedFamilia] = useState<string | null>(null);
  const [selectedSubfamilia, setSelectedSubfamilia] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
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
    if (error) { Alert.alert('Error', error.message); return; }
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

  // Derive unique families
  const familias = useMemo(() => {
    const set = new Set(products.map(p => p.familia).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [products]);

  // Derive subfamilies for selected family
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

  function getQty(productId: string) {
    return cartStore[productId]?.qty ?? 1;
  }

  function setQty(product: Product, qty: number) {
    const n = Math.max(1, isNaN(qty) ? 1 : qty);
    cartStore[product.id] = { product, qty: n };
    forceUpdate(v => v + 1);
  }

  function handleAddToCart(product: Product) {
    const qty = getQty(product.id);
    cartStore[product.id] = { product, qty };
    forceUpdate(v => v + 1);
  }

  function renderProduct({ item }: { item: Product }) {
    const qty = getQty(item.id);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardImage}
          onPress={() => router.push(`/(agent)/producto/${item.id}` as any)}
          activeOpacity={0.85}
        >
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <Text style={styles.productPlaceholder}>📦</Text>
          )}
        </TouchableOpacity>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          {item.reference ? (
            <Text style={styles.cardRef}>Ref. {item.reference}</Text>
          ) : null}
          {(item.familia || item.subfamilia) ? (
            <Text style={styles.cardFamilia} numberOfLines={1}>
              {[item.familia, item.subfamilia].filter(Boolean).join(' › ')}
            </Text>
          ) : null}
          <Text style={styles.cardPrice}>{formatEur(item.price)}</Text>
          {item.stock != null ? (
            <Text style={styles.cardStock}>Stock: {item.stock}</Text>
          ) : null}
        </View>

        <View style={styles.cartRow}>
          <View style={styles.qtyWrap}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQty(item, qty - 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.qtyInput}
              value={String(qty)}
              onChangeText={v => setQty(item, parseInt(v) || 1)}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQty(item, qty + 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToCart(item)} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>Añadir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Catálogo</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Productos</Text>
        <TouchableOpacity
          style={styles.importBtn2}
          onPress={() => router.push(`/(agent)/catalogo/importar?catalogId=${id}` as any)}
        >
          <Text style={styles.importBtn2Text}>↑ CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
          <Text style={styles.editBtnText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteCatalog}>
          <Text style={styles.deleteBtn}>Eliminar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push(`/(agent)/producto/nuevo?catalogId=${id}` as any)}
        >
          <Text style={styles.newBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, ref. o EAN..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
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
            <TouchableOpacity
              key={f}
              style={[styles.chip, selectedFamilia === f && styles.chipActive]}
              onPress={() => selectFamilia(f)}
            >
              <Text style={[styles.chipText, selectedFamilia === f && styles.chipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
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
            <TouchableOpacity
              key={s}
              style={[styles.subChip, selectedSubfamilia === s && styles.subChipActive]}
              onPress={() => setSelectedSubfamilia(prev => prev === s ? null : s)}
            >
              <Text style={[styles.subChipText, selectedSubfamilia === s && styles.subChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Contador de resultados cuando hay filtro */}
      {(selectedFamilia || selectedSubfamilia || search) && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</Text>
          <TouchableOpacity onPress={() => { setSearch(''); setSelectedFamilia(null); setSelectedSubfamilia(null); }}>
            <Text style={styles.clearText}>Limpiar filtros ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />
      ) : filtered.length === 0 ? (
        <Text style={styles.emptyText}>
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
      <Modal visible={showEdit} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Editar catálogo</Text>

              <Text style={styles.modalLabel}>Nombre <Text style={{ color: '#E53E3E' }}>*</Text></Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre del catálogo"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.modalLabel}>Temporada (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                value={editSeason}
                onChangeText={setEditSeason}
                placeholder="Ej: SS25"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.modalLabel}>Estado</Text>
              <View style={styles.statusRow}>
                {(['active', 'archived'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusOption, editStatus === s && styles.statusOptionActive]}
                    onPress={() => setEditStatus(s)}
                  >
                    <Text style={[styles.statusOptionText, editStatus === s && styles.statusOptionTextActive]}>
                      {s === 'active' ? 'Activo' : 'Archivado'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEdit(false)}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, !editName.trim() && { opacity: 0.4 }]}
                  onPress={handleSaveEdit}
                  disabled={!editName.trim() || savingEdit}
                >
                  {savingEdit
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.modalConfirmText}>Guardar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.dark,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)' },
  back: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginRight: 12 },
  deleteBtn: { fontSize: 12, color: '#ff8a80', fontWeight: '500', marginRight: 4 },
  title: { flex: 1, fontSize: 16, fontWeight: '500', color: '#ffffff' },
  editBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginRight: 8 },
  editBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  importBtn2: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    borderWidth: 1, borderColor: colors.brand },
  importBtn2Text: { fontSize: 11, fontWeight: '600', color: colors.brand },
  newBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8 },
  newBtnText: { color: colors.white, fontSize: 18, lineHeight: 20 },
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
    gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border },
  chipsScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
    maxHeight: 44 },
  subChipsScroll: {
    backgroundColor: '#fafaf8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
    maxHeight: 40 },
  chipsContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  subChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 16, borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff' },
  subChipActive: { backgroundColor: colors.brandLight ?? '#EEEDFE', borderColor: colors.brand },
  subChipText: { fontSize: 11, color: colors.textMuted },
  subChipTextActive: { color: colors.brand, fontWeight: '600' },
  resultsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: colors.bg },
  resultsText: { fontSize: 12, color: colors.textMuted },
  clearText: { fontSize: 12, color: colors.brand, fontWeight: '500' },
  grid: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden' },
  cardImage: {
    height: 120,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center' },
  productImage: { width: '100%', height: '100%' },
  productPlaceholder: { fontSize: 36 },
  cardInfo: { padding: 10, gap: 2 },
  cardName: { fontSize: 12, fontWeight: '500', color: colors.text, lineHeight: 16 },
  cardRef: { fontSize: 10, color: colors.textMuted },
  cardFamilia: { fontSize: 10, color: colors.brand, marginTop: 1 },
  cardPrice: { fontSize: 13, fontWeight: '500', color: colors.brand, marginTop: 3 },
  cardStock: { fontSize: 10, color: colors.textMuted },
  cartRow: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 6 },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden' },
  qtyBtn: {
    width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg },
  qtyBtnText: { fontSize: 16, color: colors.text, lineHeight: 18 },
  qtyInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: colors.text,
    paddingVertical: 4 },
  addBtn: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center' },
  addBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 },
  // Modal editar
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  modalLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  modalInput: {
    backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.text },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusOption: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center' },
  statusOptionActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  statusOptionText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  statusOptionTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: colors.textMuted },
  modalConfirmBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.brand, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' } });
