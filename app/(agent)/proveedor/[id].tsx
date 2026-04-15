// A-05 Vista 2 — Catálogos de un proveedor
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';
import { useCatalogs } from '@/hooks/useAgent';
import type { Supplier, Catalog } from '@/hooks/useAgent';

export default function ProveedorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const { catalogs, loading, createCatalog } = useCatalogs(id);

  const [showNewCatalog, setShowNewCatalog] = useState(false);
  const [catalogName, setCatalogName] = useState('');
  const [catalogSeason, setCatalogSeason] = useState('');
  const [savingCatalog, setSavingCatalog] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('suppliers').select('*').eq('id', id).single().then(({ data }) => setSupplier(data));
  }, [id]);

  async function handleCreateCatalog() {
    if (!catalogName.trim()) return;
    setSavingCatalog(true);
    const { error } = await createCatalog({
      supplier_id: id!,
      name: catalogName.trim(),
      season: catalogSeason.trim() || undefined,
      status: 'active' });
    setSavingCatalog(false);
    if (error) { Alert.alert('Error', error); return; }
    setCatalogName('');
    setCatalogSeason('');
    setShowNewCatalog(false);
  }

  function handleDeleteSupplier() {
    Alert.alert(
      'Eliminar proveedor',
      `¿Eliminar a ${supplier?.name}? Se eliminarán también sus catálogos y productos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('suppliers').delete().eq('id', id);
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
          <Text style={styles.back}>← Catálogos</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{supplier?.name ?? '...'}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewCatalog(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Cabecera del proveedor */}
      {supplier && (
        <View style={styles.provHeader}>
          <View style={styles.provLogo}>
            <Text style={styles.provLogoText}>{supplier.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.provName}>{supplier.name}</Text>
            <Text style={styles.provSector}>{catalogs.length} catálogo{catalogs.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity onPress={handleDeleteSupplier}>
            <Text style={styles.deleteBtn}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de catálogos */}
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading && <Text style={styles.emptyText}>Cargando...</Text>}
        {!loading && catalogs.length === 0 && (
          <Text style={styles.emptyText}>Sin catálogos. Pulsa + para crear uno.</Text>
        )}
        {catalogs.map(catalog => (
          <CatalogCard
            key={catalog.id}
            catalog={catalog}
            onPress={() => router.push(`/(agent)/catalogo/${catalog.id}` as any)}
          />
        ))}
      </ScrollView>

      {/* Modal nuevo catálogo */}
      <Modal visible={showNewCatalog} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Nuevo catálogo</Text>

            <Text style={styles.modalLabel}>Nombre <Text style={{ color: '#E53E3E' }}>*</Text></Text>
            <TextInput
              style={styles.modalInput}
              value={catalogName}
              onChangeText={setCatalogName}
              placeholder="Ej: Colección Primavera 2025"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Temporada (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={catalogSeason}
              onChangeText={setCatalogSeason}
              placeholder="Ej: SS25"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowNewCatalog(false); setCatalogName(''); setCatalogSeason(''); }}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !catalogName.trim() && { opacity: 0.4 }]}
                onPress={handleCreateCatalog}
                disabled={!catalogName.trim() || savingCatalog}
              >
                {savingCatalog
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>Crear catálogo</Text>
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

function CatalogCard({ catalog, onPress }: { catalog: Catalog; onPress: () => void }) {
  const isActive = catalog.status === 'active';
  const date = new Date(catalog.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <TouchableOpacity style={styles.catCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.catIcon, { backgroundColor: isActive ? '#EEEDFE' : '#F1EFE8' }]}>
        <Text style={{ fontSize: 16 }}>📋</Text>
      </View>
      <View style={styles.catBody}>
        <Text style={styles.catName}>{catalog.name}</Text>
        <Text style={styles.catMeta}>{catalog.season ? `${catalog.season} · ` : ''}Creado el {date}</Text>
      </View>
      <View style={styles.catRight}>
        <Text style={styles.catRefs}>{catalog.product_count ?? 0} refs.</Text>
        <View style={[styles.statusPill, { backgroundColor: isActive ? '#EAF3DE' : '#F1EFE8' }]}>
          <Text style={[styles.statusText, { color: isActive ? '#3B6D11' : '#888780' }]}>
            {isActive ? 'Activo' : 'Archivado'}
          </Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  back: { fontSize: 14, color: colors.purple, marginRight: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.purple,
    alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: colors.white, fontSize: 18, lineHeight: 20 },
  deleteBtn: { fontSize: 12, color: '#C0392B', fontWeight: '500' },
  provHeader: {
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  provLogo: {
    width: 48, height: 48, borderRadius: 13,
    backgroundColor: colors.purpleLight,
    alignItems: 'center', justifyContent: 'center' },
  provLogoText: { fontSize: 18, fontWeight: '500', color: colors.purpleDark },
  provName: { fontSize: 15, fontWeight: '500', color: colors.text },
  provSector: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  listContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 8, paddingTop: 14 },
  catCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 },
  catIcon: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center' },
  catBody: { flex: 1 },
  catName: { fontSize: 13, fontWeight: '500', color: colors.text },
  catMeta: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  catRight: { alignItems: 'flex-end', gap: 5 },
  catRefs: { fontSize: 11, color: colors.purple, fontWeight: '500' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '500' },
  chevron: { fontSize: 18, color: '#ccc' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 },
  // Modal
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
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: colors.textMuted },
  modalConfirmBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.purple, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' } });
