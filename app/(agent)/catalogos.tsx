// A-05 · Catálogos — Vista 1: Grid de proveedores (con reordenamiento)
import React, { useState, useMemo } from 'react';
import {
  View, TextInput, ScrollView, Pressable, StyleSheet, Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import { useSuppliers } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Supplier } from '@/hooks/useAgent';

export default function CatalogosScreen() {
  const router = useRouter();
  const toast = useToast();
  const { suppliers, loading, refetch } = useSuppliers();
  const [search, setSearch] = useState('');
  const [reordering, setReordering] = useState(false);
  const [localOrder, setLocalOrder] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);

  const activeSuppliers = useMemo(() =>
    suppliers.filter(s =>
      s.active &&
      (!search || s.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [suppliers, search]
  );

  function openReorder() {
    setLocalOrder(suppliers.filter(s => s.active));
    setReordering(true);
  }

  async function saveOrder() {
    setSaving(true);
    const updates = localOrder.map((s, idx) =>
      supabase.from('suppliers').update({ position: idx }).eq('id', s.id)
    );
    await Promise.all(updates);
    await refetch();
    setSaving(false);
    setReordering(false);
    toast.success('Orden guardado');
  }

  return (
    <Screen>
      <TopBar
        title="Proveedores"
        actions={[
          { icon: 'ArrowUpDown', onPress: openReorder, accessibilityLabel: 'Reordenar proveedores' },
          { icon: 'Plus', onPress: () => router.push('/(agent)/proveedor/nuevo' as any), accessibilityLabel: 'Nuevo proveedor' },
        ]}
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

      {/* Modal reordenar */}
      <Modal visible={reordering} animationType="slide" onRequestClose={() => setReordering(false)}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text variant="heading">Reordenar proveedores</Text>
            <Text variant="small" color="ink3" style={{ marginTop: 4 }}>
              Mantén pulsado y arrastra para reordenar
            </Text>
          </View>

          <DraggableFlatList
            data={localOrder}
            keyExtractor={item => item.id}
            onDragEnd={({ data }) => setLocalOrder(data)}
            contentContainerStyle={styles.dragList}
            renderItem={({ item, drag, isActive }: RenderItemParams<Supplier>) => (
              <ScaleDecorator>
                <Pressable
                  onLongPress={drag}
                  style={[styles.dragRow, isActive && styles.dragRowActive]}
                >
                  <Icon name="GripVertical" size={20} color={colors.ink3} />
                  {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.dragLogo} resizeMode="contain" />
                  ) : (
                    <View style={styles.dragLogoPlaceholder}>
                      <Text variant="bodyMedium" color="ink2">{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text variant="bodyMedium" style={{ flex: 1 }}>{item.name}</Text>
                </Pressable>
              </ScaleDecorator>
            )}
          />

          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.footerBtn, styles.footerBtnSecondary]}
              onPress={() => setReordering(false)}
            >
              <Text variant="bodyMedium" color="ink2">Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.footerBtn, styles.footerBtnPrimary, saving && { opacity: 0.6 }]}
              onPress={saveOrder}
              disabled={saving}
            >
              <Text variant="bodyMedium" color="white">{saving ? 'Guardando…' : 'Guardar orden'}</Text>
            </Pressable>
          </View>
        </GestureHandlerRootView>
      </Modal>
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

  modalHeader: {
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
  dragLogo: { width: 36, height: 36, borderRadius: radius.sm },
  dragLogoPlaceholder: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  modalFooter: {
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
});
