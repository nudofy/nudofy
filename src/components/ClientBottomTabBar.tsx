import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '@/theme';
import { Text, Icon } from '@/components/ui';
import type { IconName } from '@/components/ui/Icon';

export type ClientTab = 'inicio' | 'catalogo' | 'pedidos' | 'perfil';

interface Props {
  activeTab: ClientTab;
}

const TABS: { key: ClientTab; labelKey: string; route: string; icon: IconName }[] = [
  { key: 'inicio',   labelKey: 'client_tabs.inicio',   route: '/(client)/home',     icon: 'House' },
  { key: 'catalogo', labelKey: 'client_tabs.catalogo', route: '/(client)/catalogo', icon: 'LayoutGrid' },
  { key: 'pedidos',  labelKey: 'client_tabs.pedidos',  route: '/(client)/pedidos',  icon: 'ClipboardList' },
  { key: 'perfil',   labelKey: 'client_tabs.perfil',   route: '/(client)/perfil',   icon: 'User' },
];

export default function ClientBottomTabBar({ activeTab }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('nav');

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
              size={24}
              color={isActive ? colors.brand : colors.ink4}
              strokeWidth={isActive ? 2.25 : 1.75}
            />
            <Text
              variant="caption"
              numberOfLines={1}
              allowFontScaling={false}
              style={[styles.label, { color: isActive ? colors.brand : colors.ink4 }]}
            >
              {t(tab.labelKey)}
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
    paddingHorizontal: 2,
  },
  label: {
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 10,
    fontWeight: '500',
  },
});
