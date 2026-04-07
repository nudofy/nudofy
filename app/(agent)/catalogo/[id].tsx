// A-05 Vista 3 — Productos del catálogo (grid)
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { useProducts } from '@/hooks/useAgent';
import type { Product } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function CatalogoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, loading } = useProducts(id);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    products.filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? '').includes(search)
    ),
    [products, search]
  );

  function renderProduct({ item }: { item: Product }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(agent)/producto/${item.id}` as any)}
        activeOpacity={0.85}
      >
        <View style={styles.cardImage}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : (
            <Text style={styles.productPlaceholder}>📦</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.cardRef}>{item.reference ?? '—'}</Text>
          <Text style={styles.cardPrice}>{formatEur(item.price)}</Text>
        </View>
      </TouchableOpacity>
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

      {loading ? (
        <Text style={styles.emptyText}>Cargando productos...</Text>
      ) : filtered.length === 0 ? (
        <Text style={styles.emptyText}>{search ? 'Sin resultados' : 'Sin productos en este catálogo'}</Text>
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
    </SafeAreaView>
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
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
    gap: 8,
  },
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
    borderColor: colors.border,
  },
  grid: { padding: 14 },
  row: { gap: 10, marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardImage: {
    height: 120,
    backgroundColor: '#f0f0ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: { width: '100%', height: '100%' },
  productPlaceholder: { fontSize: 40 },
  cardInfo: { padding: 10, gap: 3 },
  cardName: { fontSize: 12, fontWeight: '500', color: colors.text, lineHeight: 16 },
  cardRef: { fontSize: 10, color: colors.textMuted },
  cardPrice: { fontSize: 13, fontWeight: '500', color: colors.purple, marginTop: 4 },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 },
});
