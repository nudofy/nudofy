// ─── BottomTabBar · redesign v2 ─────────────────────────────────────────────
// Blanco, borde sutil, iconos Lucide. Sin barra superior roja.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, space } from '@/theme';
import Icon, { IconName } from './ui/Icon';
import Text from './ui/Text';

type Tab = {
  key: string;
  label: string;
  route: string;
  icon: IconName;
};

const TABS: Tab[] = [
  { key: 'home',       label: 'Inicio',      route: '/(agent)/home',       icon: 'LayoutGrid'    },
  { key: 'clientes',   label: 'Clientes',    route: '/(agent)/clientes',   icon: 'Users'         },
  { key: 'catalogos',  label: 'Proveedores', route: '/(agent)/catalogos',  icon: 'Package'       },
  { key: 'pedidos',    label: 'Pedidos',     route: '/(agent)/pedidos',    icon: 'ClipboardList' },
  { key: 'mas',        label: 'Más',         route: '/(agent)/mas',        icon: 'Menu'          },
];

export default function BottomTabBar({ activeTab }: { activeTab: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, space[2]) }]}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
            onPress={() => router.push(tab.route as any)}
          >
            <Icon
              name={tab.icon}
              size={24}
              color={active ? colors.ink : colors.ink4}
              strokeWidth={active ? 2 : 1.75}
            />
            <Text
              variant="caption"
              style={[styles.label, { color: active ? colors.ink : colors.ink4 }]}
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
    gap: 4,
  },
  label: {
    // caption ya es uppercase — para tab bar queremos normal
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 10,
  },
});
