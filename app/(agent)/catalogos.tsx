// A-05 · Catálogos — Vista 1: Grid de proveedores
import React, { useState, useMemo } from 'react';
import {
  View, TextInput, ScrollView, Pressable, StyleSheet, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import { useSuppliers } from '@/hooks/useAgent';
import type { Supplier } from '@/hooks/useAgent';

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
    <Screen>
      <TopBar
        title="Proveedores"
        actions={[{ icon: 'Plus', onPress: () => router.push('/(agent)/proveedor/nuevo' as any), accessibilityLabel: 'Nuevo proveedor' }]}
      />

      {/* Buscador */}
      <View style={styles.searchBarWrap}>
        <View style={styles.inputWithIcon}>
          <Icon name="Search" size={16} color={colors.ink4} />
          <TextInput
            style={styles.inputEl}
            placeholder="Buscar en todos los catálogos..."
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Grid de proveedores */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContent}>
        {loading && <Text variant="small" color="ink3" align="center" style={{ paddingVertical: space[8] }}>Cargando...</Text>}
        {!loading && activeSuppliers.length === 0 && (
          <Text variant="small" color="ink3" align="center" style={{ paddingVertical: space[8] }}>
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
    </Screen>
  );
}

function SupplierCard({ supplier, onPress }: { supplier: Supplier; onPress: () => void }) {
  const initial = supplier.name.charAt(0).toUpperCase();
  const count = supplier.catalog_count ?? 0;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]} onPress={onPress}>
      {supplier.logo_url ? (
        <Image source={{ uri: supplier.logo_url }} style={styles.logoImage} resizeMode="contain" />
      ) : (
        <View style={styles.logo}>
          <Text variant="heading" color="ink2">{initial}</Text>
        </View>
      )}
      <Text variant="bodyMedium" align="center" numberOfLines={2}>{supplier.name}</Text>
      <Text variant="caption" color="ink3">{count} catálogo{count !== 1 ? 's' : ''}</Text>
    </Pressable>
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

  gridContent: { padding: space[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  card: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[4],
    alignItems: 'center',
    gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
  logo: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  logoImage: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surface2 },
});
