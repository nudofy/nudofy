// A-05 · Catálogos — Vista 1: Grid de proveedores
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import BottomTabBar from '@/components/BottomTabBar';
import { useSuppliers } from '@/hooks/useAgent';
import type { Supplier } from '@/hooks/useAgent';

// Color por inicial del proveedor
const LOGO_COLORS = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FAECE7', text: '#712B13' },
  { bg: '#EEEDFE', text: '#3C3489' },
];

function getLogoColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return LOGO_COLORS[hash % LOGO_COLORS.length];
}

export default function CatalogosScreen() {
  const router = useRouter();
  const { suppliers, loading } = useSuppliers();
  const [search, setSearch] = useState('');

  const activeSuppliers = useMemo(() =>
    suppliers.filter(s =>
      s.active &&
      (!search || s.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [suppliers, search]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Text style={styles.title}>Proveedores</Text>
        <View style={styles.topbarActions}>
          <TouchableOpacity
            style={styles.newSupplierBtn}
            onPress={() => router.push('/(agent)/proveedor/nuevo' as any)}
          >
            <Text style={styles.newSupplierBtnText}>+ Proveedor</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en todos los catálogos..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.camBtn}>
          <Text style={{ fontSize: 12, color: colors.purple }}>📷</Text>
        </View>
      </View>

      {/* Grid de proveedores */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContent}>
        {loading && <Text style={styles.emptyText}>Cargando...</Text>}
        {!loading && activeSuppliers.length === 0 && (
          <Text style={styles.emptyText}>
            {search ? 'Sin resultados' : 'Aún no tienes proveedores activos'}
          </Text>
        )}
        <View style={styles.grid}>
          {activeSuppliers.map(supplier => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onPress={() => router.push(`/(agent)/proveedor/${supplier.id}` as any)}
            />
          ))}
        </View>
      </ScrollView>

      <BottomTabBar activeTab="catalogos" />
    </SafeAreaView>
  );
}

function SupplierCard({ supplier, onPress }: { supplier: Supplier; onPress: () => void }) {
  const { bg, text } = getLogoColor(supplier.name);
  const initial = supplier.name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {supplier.logo_url ? (
        <Image source={{ uri: supplier.logo_url }} style={styles.logoImage} />
      ) : (
        <View style={[styles.logo, { backgroundColor: bg }]}>
          <Text style={[styles.logoText, { color: text }]}>{initial}</Text>
        </View>
      )}
      <Text style={styles.cardName}>{supplier.name}</Text>
      <Text style={styles.cardCats}>{supplier.catalog_count ?? 0} catálogo{(supplier.catalog_count ?? 0) !== 1 ? 's' : ''}</Text>
      <Text style={styles.cardChevron}>Ver catálogos →</Text>
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
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  title: { fontSize: 18, fontWeight: '500', color: colors.text },
  topbarActions: { flexDirection: 'row', gap: 8 },
  newSupplierBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: colors.purple },
  newSupplierBtnText: { fontSize: 12, fontWeight: '500', color: '#fff' },
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
  camBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: colors.purpleLight,
    alignItems: 'center', justifyContent: 'center' },
  gridContent: { padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47.5%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10 },
  logo: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 52, height: 52, borderRadius: 14 },
  logoText: { fontSize: 18, fontWeight: '500' },
  cardName: { fontSize: 13, fontWeight: '500', color: colors.text, textAlign: 'center' },
  cardCats: { fontSize: 11, color: colors.textMuted },
  cardChevron: { fontSize: 11, color: colors.purple, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 } });
