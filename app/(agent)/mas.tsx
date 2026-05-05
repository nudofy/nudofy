// Más — acceso a Proveedores, Estadísticas, Perfil
import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge } from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent, useSuppliers } from '@/hooks/useAgent';
import type { Supplier } from '@/hooks/useAgent';
import type { IconName } from '@/components/ui/Icon';

export default function MasScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { agent } = useAgent();
  const { suppliers } = useSuppliers();

  const active = suppliers.filter(s => s.active).length;
  const totalRefs = suppliers.reduce((s, sup) => s + (sup.catalog_count ?? 0), 0);

  const menuItems: { label: string; icon: IconName; route: string | null }[] = [
    { label: 'Estadísticas', icon: 'ChartBar', route: '/(agent)/estadisticas' },
    { label: 'Tarifas', icon: 'Tag', route: '/(agent)/tarifas' },
    { label: 'Notificaciones', icon: 'Bell', route: null },
    { label: 'Perfil y ajustes', icon: 'Settings', route: '/(agent)/perfil' },
    { label: 'Facturas', icon: 'Receipt', route: null },
  ];

  return (
    <Screen>
      <TopBar title="Más" />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Perfil del agente */}
        <Pressable
          style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/(agent)/perfil')}
        >
          <Avatar name={agent?.name ?? profile?.email ?? 'A'} size={48} fontSize={16} />
          <View style={styles.profileInfo}>
            <Text variant="bodyMedium">{agent?.name ?? profile?.email}</Text>
            <Text variant="caption" color="ink3" style={{ marginTop: 2, textTransform: 'capitalize' }}>
              Plan {agent?.plan ?? '—'}
            </Text>
          </View>
          <Icon name="ChevronRight" size={18} color={colors.ink4} />
        </Pressable>

        {/* Mis proveedores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Mis proveedores</Text>
            <Pressable onPress={() => router.push('/(agent)/catalogos')}>
              <Text variant="caption" color="ink2">Ver todos</Text>
            </Pressable>
          </View>

          {/* Resumen */}
          <View style={styles.summaryBar}>
            <SumItem value={suppliers.length.toString()} label="Proveedores" />
            <SumItem value={active.toString()} label="Activos" />
            <SumItem value={totalRefs.toString()} label="Catálogos" />
          </View>

          {/* Lista */}
          {suppliers.map(s => (
            <SupplierRow key={s.id} supplier={s} onPress={() => router.push(`/(agent)/proveedor/${s.id}` as any)} />
          ))}

          <Pressable
            style={({ pressed }) => [styles.addSupplierBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/(agent)/proveedor/nuevo' as any)}
          >
            <Icon name="Plus" size={16} color={colors.ink2} />
            <Text variant="smallMedium" color="ink2">Añadir proveedor</Text>
          </Pressable>
        </View>

        {/* Otras opciones */}
        <View style={styles.section}>
          <Text variant="caption" color="ink3" style={styles.sectionTitle}>Cuenta y ajustes</Text>
          <View style={styles.menuBlock}>
            {menuItems.map((item, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder, pressed && { opacity: 0.7 }]}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <Icon name={item.icon} size={18} color={colors.ink2} />
                <Text variant="body" style={{ flex: 1 }}>{item.label}</Text>
                <Icon name="ChevronRight" size={18} color={colors.ink4} />
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
          onPress={signOut}
        >
          <Icon name="LogOut" size={18} color={colors.danger} />
          <Text variant="bodyMedium" color="danger">Cerrar sesión</Text>
        </Pressable>
      </ScrollView>

      <BottomTabBar activeTab="mas" />
    </Screen>
  );
}

function SumItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.sumItem}>
      <Text variant="heading">{value}</Text>
      <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function SupplierRow({ supplier, onPress }: { supplier: Supplier; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.supplierRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      {supplier.logo_url ? (
        <Image source={{ uri: supplier.logo_url }} style={styles.supplierLogoImage} resizeMode="contain" />
      ) : (
        <View style={styles.supplierLogo}>
          <Text variant="bodyMedium" color="ink2">{supplier.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.supplierBody}>
        <Text variant="bodyMedium">{supplier.name}</Text>
        <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
          {supplier.catalog_count ?? 0} catálogos
        </Text>
      </View>
      <Badge label={supplier.active ? 'Activo' : 'Inactivo'} variant={supplier.active ? 'success' : 'neutral'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[4] },

  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[4],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  profileInfo: { flex: 1 },

  section: { gap: space[2] },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space[1],
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },

  summaryBar: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', justifyContent: 'space-around',
    borderWidth: 1, borderColor: colors.line,
  },
  sumItem: { alignItems: 'center' },

  supplierRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  supplierLogo: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  supplierLogoImage: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  supplierBody: { flex: 1, minWidth: 0 },

  addSupplierBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: space[1],
    borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed',
  },

  menuBlock: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[3], paddingVertical: space[3],
    gap: space[3],
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },

  signOutBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
});
