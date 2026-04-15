// A-02 · Mis clientes
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import { useClients } from '@/hooks/useAgent';
import type { Client } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function ClientesScreen() {
  const router = useRouter();
  const { clients, loading } = useClients();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Lista de tipos únicos de clientes
  const clientTypes = useMemo(() => {
    const types = clients.map(c => c.client_type).filter(Boolean) as string[];
    return [...new Set(types)].sort();
  }, [clients]);

  // Filtrado
  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.address ?? '').toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || c.client_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [clients, search, typeFilter]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Text style={styles.title}>Mis clientes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(agent)/cliente/nuevo')}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente o localidad..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersBar} contentContainerStyle={styles.filtersContent}>
        <TouchableOpacity
          style={[styles.pill, !typeFilter && styles.pillActive]}
          onPress={() => setTypeFilter('')}
        >
          <Text style={[styles.pillText, !typeFilter && styles.pillTextActive]}>Todos</Text>
        </TouchableOpacity>
        {clientTypes.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.pill, typeFilter === t && styles.pillActive]}
            onPress={() => setTypeFilter(typeFilter === t ? '' : t)}
          >
            <Text style={[styles.pillText, typeFilter === t && styles.pillTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading && (
          <Text style={styles.emptyText}>Cargando...</Text>
        )}
        {!loading && filtered.length === 0 && (
          <Text style={styles.emptyText}>
            {search || typeFilter ? 'Sin resultados' : 'Aún no tienes clientes'}
          </Text>
        )}
        {filtered.map(client => (
          <ClientCard key={client.id} client={client} onPress={() => router.push(`/(agent)/cliente/${client.id}` as any)} />
        ))}
      </ScrollView>

      <BottomTabBar activeTab="clientes" />
    </SafeAreaView>
  );
}

function ClientCard({ client, onPress }: { client: Client; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Avatar name={client.name} size={40} fontSize={13} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{client.name}</Text>
        <Text style={styles.cardMeta}>{client.address ?? '—'}</Text>
        {client.client_type && (
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{client.client_type}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardAmount}>—</Text>
        <Text style={styles.cardDate}>—</Text>
      </View>
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
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.purple,
    alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: colors.white, fontSize: 20, lineHeight: 22 },
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  searchIcon: { fontSize: 14, marginRight: 8 },
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
  filtersBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
    maxHeight: 48 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 7, flexDirection: 'row' },
  pill: {
    paddingHorizontal: 13, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white },
  pillActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  pillText: { fontSize: 12, fontWeight: '500', color: '#666' },
  pillTextActive: { color: colors.white },
  listContent: { padding: 14, gap: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 14, fontWeight: '500', color: colors.text },
  cardMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  typeTag: {
    marginTop: 4,
    backgroundColor: colors.purpleLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start' },
  typeTagText: { fontSize: 10, color: colors.purpleDark, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 13, fontWeight: '500', color: colors.text },
  cardDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 } });
