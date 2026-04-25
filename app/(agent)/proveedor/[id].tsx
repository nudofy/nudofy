// A-05 Vista 2 — Catálogos de un proveedor
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Alert, Modal, TextInput, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge, Button } from '@/components/ui';
import ResourceError from '@/components/ResourceError';
import { supabase } from '@/lib/supabase';
import { useCatalogs } from '@/hooks/useAgent';
import { useToast } from '@/contexts/ToastContext';
import type { Supplier, Catalog } from '@/hooks/useAgent';

export default function ProveedorScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { catalogs, loading, createCatalog } = useCatalogs(id);

  const [showNewCatalog, setShowNewCatalog] = useState(false);
  const [catalogName, setCatalogName] = useState('');
  const [catalogSeason, setCatalogSeason] = useState('');
  const [savingCatalog, setSavingCatalog] = useState(false);

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
        topBarTitle="Proveedor"
        title={loadError ? 'Error de conexión' : 'Proveedor no encontrado'}
        message={loadError ? 'No se pudo cargar el proveedor.' : 'No existe o no tienes permisos para verlo.'}
        detail={loadError}
        onBack={() => router.back()}
        onRetry={fetchSupplier}
      />
    );
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
    toast.success('Catálogo creado');
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
    <Screen>
      <TopBar
        title={supplier?.name ?? '...'}
        onBack={() => router.back()}
        actions={[
          { icon: 'Pencil', onPress: () => router.push(`/(agent)/proveedor/editar?id=${id}` as any), accessibilityLabel: 'Editar proveedor' },
          { icon: 'Trash2', onPress: handleDeleteSupplier, accessibilityLabel: 'Eliminar proveedor' },
          { icon: 'Plus', onPress: () => setShowNewCatalog(true), accessibilityLabel: 'Nuevo catálogo' },
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
              {catalogs.length} catálogo{catalogs.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Lista de catálogos */}
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Cargando...</Text>
        )}
        {!loading && catalogs.length === 0 && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
            Sin catálogos. Pulsa + para crear uno.
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

      {/* Modal nuevo catálogo */}
      <Modal visible={showNewCatalog} transparent animationType="slide" onRequestClose={() => setShowNewCatalog(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text variant="heading" style={{ marginBottom: space[3] }}>Nuevo catálogo</Text>

              <Text variant="caption" color="ink3" style={styles.modalLabel}>Nombre *</Text>
              <TextInput
                style={styles.modalInput}
                value={catalogName}
                onChangeText={setCatalogName}
                placeholder="Ej: Colección Primavera 2025"
                placeholderTextColor={colors.ink4}
              />

              <Text variant="caption" color="ink3" style={styles.modalLabel}>Temporada (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                value={catalogSeason}
                onChangeText={setCatalogSeason}
                placeholder="Ej: SS25"
                placeholderTextColor={colors.ink4}
              />

              <View style={styles.modalActions}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => { setShowNewCatalog(false); setCatalogName(''); setCatalogSeason(''); }}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Crear catálogo"
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
  const isActive = catalog.status === 'active';
  const date = new Date(catalog.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Pressable style={({ pressed }) => [styles.catCard, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={styles.catIcon}>
        <Icon name="BookOpen" size={18} color={colors.ink2} />
      </View>
      <View style={styles.catBody}>
        <Text variant="bodyMedium">{catalog.name}</Text>
        <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
          {catalog.season ? `${catalog.season} · ` : ''}Creado el {date}
        </Text>
      </View>
      <View style={styles.catRight}>
        <Text variant="caption" color="ink3">{catalog.product_count ?? 0} refs.</Text>
        <Badge label={isActive ? 'Activo' : 'Archivado'} variant={isActive ? 'success' : 'neutral'} />
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
