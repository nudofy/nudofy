// A-05 Vista 2 — Catálogos de un proveedor
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';
import { useCatalogs } from '@/hooks/useAgent';
import type { Supplier, Catalog } from '@/hooks/useAgent';

export default function ProveedorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const { catalogs, loading } = useCatalogs(id);

  useEffect(() => {
    if (!id) return;
    supabase.from('suppliers').select('*').eq('id', id).single().then(({ data }) => setSupplier(data));
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Catálogos</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{supplier?.name ?? '...'}</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Cabecera del proveedor */}
      {supplier && (
        <View style={styles.provHeader}>
          <View style={styles.provLogo}>
            <Text style={styles.provLogoText}>{supplier.name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.provName}>{supplier.name}</Text>
            <Text style={styles.provSector}>{catalogs.length} catálogo{catalogs.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      {/* Banner importar */}
      <TouchableOpacity style={styles.importBanner}>
        <Text style={styles.importTitle}>Importar nuevo catálogo</Text>
        <Text style={styles.importSub}>Sube un Excel o PDF</Text>
        <Text style={styles.importBtn}>Subir archivo →</Text>
      </TouchableOpacity>

      {/* Lista de catálogos */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading && <Text style={styles.emptyText}>Cargando...</Text>}
        {!loading && catalogs.length === 0 && (
          <Text style={styles.emptyText}>Sin catálogos aún. Importa el primero.</Text>
        )}
        {catalogs.map(catalog => (
          <CatalogCard
            key={catalog.id}
            catalog={catalog}
            onPress={() => router.push(`/(agent)/catalogo/${catalog.id}` as any)}
          />
        ))}
      </ScrollView>
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
        <Text style={styles.catMeta}>Importado el {date}</Text>
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
    borderBottomColor: '#efefef',
  },
  back: { fontSize: 14, color: colors.purple, marginRight: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: colors.white, fontSize: 18, lineHeight: 20 },
  provHeader: {
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  provLogo: {
    width: 48, height: 48, borderRadius: 13,
    backgroundColor: colors.purpleLight,
    alignItems: 'center', justifyContent: 'center',
  },
  provLogoText: { fontSize: 18, fontWeight: '500', color: colors.purpleDark },
  provName: { fontSize: 15, fontWeight: '500', color: colors.text },
  provSector: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  importBanner: {
    margin: 14,
    backgroundColor: colors.purpleLight,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  importTitle: { fontSize: 12, fontWeight: '500', color: colors.purpleDark },
  importSub: { fontSize: 11, color: colors.purple },
  importBtn: { fontSize: 11, fontWeight: '500', color: colors.purple, marginTop: 4 },
  listContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  catCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIcon: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  catBody: { flex: 1 },
  catName: { fontSize: 13, fontWeight: '500', color: colors.text },
  catMeta: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  catRight: { alignItems: 'flex-end', gap: 5 },
  catRefs: { fontSize: 11, color: colors.purple, fontWeight: '500' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '500' },
  chevron: { fontSize: 18, color: '#ccc' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 },
});
