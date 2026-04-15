import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';

export type ClientTab = 'inicio' | 'catalogo' | 'pedidos' | 'perfil';

interface Props {
  activeTab: ClientTab;
}

const TABS: { key: ClientTab; label: string; route: string; icon: string }[] = [
  { key: 'inicio',    label: 'Inicio',    route: '/(client)/home',     icon: '⊙' },
  { key: 'catalogo',  label: 'Catálogo',  route: '/(client)/catalogo', icon: '◫' },
  { key: 'pedidos',   label: 'Pedidos',   route: '/(client)/pedidos',  icon: '≡' },
  { key: 'perfil',    label: 'Mi perfil', route: '/(client)/perfil',   icon: '○' },
];

export default function ClientBottomTabBar({ activeTab }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {TABS.map(tab => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => router.replace(tab.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            {isActive && <View style={styles.dot} />}
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
    borderTopColor: colors.border,
    paddingBottom: 0,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
    gap: 3,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: colors.purpleLight,
  },
  icon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  iconActive: {
    color: colors.purple,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '400',
  },
  labelActive: {
    color: colors.purple,
    fontWeight: '500',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.purple,
  },
});
