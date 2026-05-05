// A-02 · Mis clientes
import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Badge } from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import Avatar from '@/components/Avatar';
import { useClients } from '@/hooks/useAgent';
import type { Client } from '@/hooks/useAgent';

export default function ClientesScreen() {
  const router = useRouter();
  const { clients, loading } = useClients();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const clientTypes = useMemo(() => {
    const types = clients.map(c => c.client_type).filter(Boolean) as string[];
    return [...new Set(types)].sort();
  }, [clients]);

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
    <Screen>
      <TopBar
        title="Mis clientes"
        actions={[{ icon: 'Plus', onPress: () => router.push('/(agent)/cliente/nuevo'), accessibilityLabel: 'Nuevo cliente' }]}
      />

      {/* Buscador */}
      <View style={styles.searchBarWrap}>
        <View style={styles.inputWithIcon}>
          <Icon name="Search" size={16} color={colors.ink4} />
          <TextInput
            style={styles.inputEl}
            placeholder="Buscar cliente o localidad..."
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filtros */}
      {clientTypes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersBar} contentContainerStyle={styles.filtersContent}>
          <FilterPill label="Todos" active={!typeFilter} onPress={() => setTypeFilter('')} />
          {clientTypes.map(t => (
            <FilterPill key={t} label={t} active={typeFilter === t} onPress={() => setTypeFilter(typeFilter === t ? '' : t)} />
          ))}
        </ScrollView>
      )}

      {/* Lista */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Cargando...</Text>
        )}
        {!loading && filtered.length === 0 && (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
            {search || typeFilter ? 'Sin resultados' : 'Aún no tienes clientes'}
          </Text>
        )}
        {filtered.map(client => (
          <ClientCard key={client.id} client={client} onPress={() => router.push(`/(agent)/cliente/${client.id}` as any)} />
        ))}
      </ScrollView>

      <BottomTabBar activeTab="clientes" />
    </Screen>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
    >
      <Text variant="smallMedium" color={active ? 'white' : 'ink2'}>{label}</Text>
    </Pressable>
  );
}

function ClientCard({ client, onPress }: { client: Client; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Avatar name={client.name} size={40} fontSize={13} />
      <View style={styles.cardBody}>
        <Text variant="bodyMedium">{client.name}</Text>
        <Text variant="small" color="ink3" numberOfLines={1}>{client.address ?? '—'}</Text>
        {client.client_type && (
          <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
            <Badge label={client.client_type} variant="neutral" />
          </View>
        )}
      </View>
      <Icon name="ChevronRight" size={20} color={colors.ink4} />
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

  filtersBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    maxHeight: 48,
  },
  filtersContent: {
    paddingHorizontal: space[4], paddingVertical: space[2],
    gap: space[2], flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: space[3], paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },

  listContent: { padding: space[3], gap: space[2] },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 1 },
  emptyText: { paddingVertical: space[8] },
});
