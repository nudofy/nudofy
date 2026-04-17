// Más — acceso a Proveedores, Estadísticas, Perfil
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent, useSuppliers } from '@/hooks/useAgent';
import type { Supplier } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function MasScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { agent } = useAgent();
  const { suppliers } = useSuppliers();

  const active = suppliers.filter(s => s.active).length;
  const totalRefs = suppliers.reduce((s, sup) => s + (sup.catalog_count ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.title}>Más</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Perfil del agente */}
        <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/(agent)/perfil')} activeOpacity={0.85}>
          <Avatar name={agent?.name ?? profile?.email ?? 'A'} size={48} fontSize={16} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{agent?.name ?? profile?.email}</Text>
            <Text style={styles.profilePlan}>Plan {agent?.plan ?? '—'}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Mis proveedores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis proveedores</Text>
            <TouchableOpacity onPress={() => router.push('/(agent)/catalogos')}>
              <Text style={styles.seeAll}>Ver proveedores →</Text>
            </TouchableOpacity>
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

          <TouchableOpacity style={styles.addSupplierBtn} onPress={() => router.push('/(agent)/proveedor/nuevo' as any)}>
            <Text style={styles.addSupplierText}>+ Añadir proveedor</Text>
          </TouchableOpacity>
        </View>

        {/* Otras opciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta y ajustes</Text>
          <View style={styles.menuBlock}>
            {[
              { label: 'Estadísticas', icon: '📊', route: '/(agent)/estadisticas' },
              { label: 'Notificaciones', icon: '🔔', route: null },
              { label: 'Perfil y ajustes', icon: '⚙️', route: '/(agent)/perfil' },
              { label: 'Facturas', icon: '🧾', route: null },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.menuItem}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar activeTab="mas" />
    </SafeAreaView>
  );
}

function SumItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.sumItem}>
      <Text style={styles.sumValue}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </View>
  );
}

function SupplierRow({ supplier, onPress }: { supplier: Supplier; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.supplierRow} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.supplierLogo, { backgroundColor: supplier.active ? colors.brandLight : '#F1EFE8' }]}>
        <Text style={{ color: supplier.active ? colors.brandDark : '#888', fontWeight: '500' }}>
          {supplier.name.charAt(0)}
        </Text>
      </View>
      <View style={styles.supplierBody}>
        <Text style={styles.supplierName}>{supplier.name}</Text>
        <Text style={styles.supplierMeta}>{supplier.catalog_count ?? 0} catálogos</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: supplier.active ? '#EAF3DE' : '#F1EFE8' }]}>
        <Text style={[styles.statusText, { color: supplier.active ? '#3B6D11' : '#888780' }]}>
          {supplier.active ? 'Activo' : 'Inactivo'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.dark,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 18, fontWeight: '500', color: '#ffffff' },
  content: { padding: 14, gap: 14 },
  profileCard: {
    backgroundColor: colors.white, borderRadius: 16,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '500', color: colors.text },
  profilePlan: { fontSize: 12, color: colors.brand, marginTop: 3, textTransform: 'capitalize' },
  chevron: { fontSize: 18, color: '#ccc' },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '500', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll: { fontSize: 12, color: colors.brand },
  summaryBar: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 12, flexDirection: 'row', justifyContent: 'space-around' },
  sumItem: { alignItems: 'center' },
  sumValue: { fontSize: 18, fontWeight: '500', color: colors.text },
  sumLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  supplierRow: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  supplierLogo: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center' },
  supplierBody: { flex: 1 },
  supplierName: { fontSize: 14, fontWeight: '500', color: colors.text },
  supplierMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '500' },
  addSupplierBtn: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.brand, borderStyle: 'dashed' },
  addSupplierText: { fontSize: 14, color: colors.brand, fontWeight: '500' },
  menuBlock: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text },
  signOutBtn: {
    backgroundColor: colors.white, borderRadius: 14,
    padding: 14, alignItems: 'center' },
  signOutText: { fontSize: 15, color: colors.red, fontWeight: '500' } });
