import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/theme/colors';

type Tab = {
  key: string;
  label: string;
  route: string;
  icon: (active: boolean) => React.ReactNode;
};

const IconHome = ({ active }: { active: boolean }) => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    {/* Grid 2x2 */}
    <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap', width: 16, height: 16 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{
          width: 6, height: 6, borderRadius: 1.5,
          backgroundColor: active ? (i === 0 ? colors.purple : colors.purple) : '#bbbbbb',
          opacity: active ? (i === 0 ? 1 : 0.35) : (i === 0 ? 1 : 0.5),
        }} />
      ))}
    </View>
  </View>
);

const IconClientes = ({ active }: { active: boolean }) => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: 12, height: 12, borderRadius: 6,
      borderWidth: 1.4, borderColor: active ? colors.purple : '#bbbbbb',
      backgroundColor: active ? colors.purple : 'transparent',
      marginBottom: 2,
    }} />
    <View style={{
      width: 16, height: 1.4, borderRadius: 1,
      backgroundColor: active ? colors.purple : '#bbbbbb',
    }} />
  </View>
);

const IconCatalogos = ({ active }: { active: boolean }) => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ flexDirection: 'row', gap: 2 }}>
      <View style={{ gap: 2 }}>
        <View style={{ width: 7, height: 9, borderRadius: 1.5, borderWidth: 1.4, borderColor: active ? colors.purple : '#bbbbbb' }} />
        <View style={{ width: 7, height: 5, borderRadius: 1.5, borderWidth: 1.4, borderColor: active ? colors.purple : '#bbbbbb' }} />
      </View>
      <View style={{ gap: 2 }}>
        <View style={{ width: 7, height: 5, borderRadius: 1.5, borderWidth: 1.4, borderColor: active ? colors.purple : '#bbbbbb' }} />
        <View style={{ width: 7, height: 9, borderRadius: 1.5, borderWidth: 1.4, borderColor: active ? colors.purple : '#bbbbbb' }} />
      </View>
    </View>
  </View>
);

const IconPedidos = ({ active }: { active: boolean }) => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: 16, height: 16, borderRadius: 2,
      borderWidth: 1.4, borderColor: active ? colors.purple : '#bbbbbb',
      backgroundColor: active ? colors.purple : 'transparent',
      alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 3,
    }}>
      {[1, 1, 0.7].map((w, i) => (
        <View key={i} style={{ width: '100%', height: 1.3, backgroundColor: active ? '#fff' : '#bbbbbb', opacity: i === 2 ? 0.7 : 1 }} />
      ))}
    </View>
  </View>
);

const IconMas = ({ active }: { active: boolean }) => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
    {[0, 1, 2].map(i => (
      <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: active ? colors.purple : '#bbbbbb' }} />
    ))}
  </View>
);

const TABS: Tab[] = [
  { key: 'home', label: 'Inicio', route: '/(agent)/home', icon: (a) => <IconHome active={a} /> },
  { key: 'clientes', label: 'Clientes', route: '/(agent)/clientes', icon: (a) => <IconClientes active={a} /> },
  { key: 'catalogos', label: 'Catálogos', route: '/(agent)/catalogos', icon: (a) => <IconCatalogos active={a} /> },
  { key: 'pedidos', label: 'Pedidos', route: '/(agent)/pedidos', icon: (a) => <IconPedidos active={a} /> },
  { key: 'mas', label: 'Más', route: '/(agent)/mas', icon: (a) => <IconMas active={a} /> },
];

export default function BottomTabBar({ activeTab }: { activeTab: string }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            {tab.icon(active)}
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {active && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 0.5,
    borderTopColor: '#efefef',
    paddingTop: 10,
    paddingBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    color: '#bbbbbb',
  },
  labelActive: {
    color: colors.purple,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.purple,
    marginTop: 2,
  },
});
