import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, space } from '@/theme';
import { Text, Icon } from '@/components/ui';
import type { IconName } from '@/components/ui/Icon';

export type ClientTab = 'inicio' | 'catalogo' | 'pedidos' | 'perfil';

interface Props {
  activeTab: ClientTab;
}

const TABS: { key: ClientTab; label: string; route: string; icon: IconName }[] = [
  { key: 'inicio',   label: 'Inicio',    route: '/(client)/home',     icon: 'House' },
  { key: 'catalogo', label: 'Catálogo',  route: '/(client)/catalogo', icon: 'LayoutGrid' },
  { key: 'pedidos',  label: 'Pedidos',   route: '/(client)/pedidos',  icon: 'ClipboardList' },
  { key: 'perfil',   label: 'Mi perfil', route: '/(client)/perfil',   icon: 'User' },
];

export default function ClientBottomTabBar({ activeTab }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, space[1]) }]}>
      {TABS.map(tab => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
            onPress={() => router.replace(tab.route as any)}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={isActive ? colors.ink : colors.ink4}
            />
            <Text
              variant="caption"
              color={isActive ? 'ink' : 'ink4'}
              style={{ fontWeight: isActive ? '600' : '400' }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
});
