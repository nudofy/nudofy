// Shell compartido del panel de administración (v2 · minimalista).
// Móvil: topbar + drawer. Desktop: sidebar fija a la izquierda.
import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, Modal, Animated, Pressable, ScrollView, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, space, radius } from '@/theme';
import { Text, Icon } from '@/components/ui';
import type { IconName } from '@/components/ui/Icon';

export type AdminSection = 'dashboard' | 'agentes' | 'planes' | 'facturacion' | 'configuracion';

const NAV_ITEMS: { key: AdminSection; label: string; icon: IconName; route: string }[] = [
  { key: 'dashboard',     label: 'Dashboard',      icon: 'LayoutDashboard', route: '/(admin)/dashboard'     },
  { key: 'agentes',       label: 'Agentes',         icon: 'Users',           route: '/(admin)/agentes'       },
  { key: 'planes',        label: 'Planes',          icon: 'Sparkles',        route: '/(admin)/planes'        },
  { key: 'facturacion',   label: 'Facturación',     icon: 'Receipt',         route: '/(admin)/facturacion'   },
  { key: 'configuracion', label: 'Configuración',   icon: 'Settings',        route: '/(admin)/configuracion' },
];

interface Props {
  activeSection: AdminSection;
  title?: string;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
}

export default function AdminShell({ activeSection, title, rightElement, onBack, children }: Props) {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_W)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }

  function closeDrawer() {
    Animated.timing(slideAnim, { toValue: -SIDEBAR_W, duration: 220, useNativeDriver: true })
      .start(() => setDrawerOpen(false));
  }

  function navigate(route: string) {
    if (isDesktop) {
      router.replace(route as any);
    } else {
      closeDrawer();
      setTimeout(() => router.replace(route as any), 240);
    }
  }

  const initials = (profile?.name ?? profile?.email ?? 'NX')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const sectionLabel = NAV_ITEMS.find(n => n.key === activeSection)?.label ?? title ?? '';

  const sidebarContent = (
    <>
      <View style={styles.drawerHeader}>
        <View style={styles.drawerLogoWrap}>
          <View style={styles.logoMark}>
            <Text variant="bodyMedium" style={styles.logoMarkText}>N</Text>
          </View>
          <View>
            <Text variant="bodyMedium">Nudofy</Text>
            <Text variant="caption" color="ink3">Administración</Text>
          </View>
        </View>
        {!isDesktop && (
          <Pressable
            style={({ pressed }) => [styles.drawerClose, pressed && { opacity: 0.6 }]}
            onPress={closeDrawer}
            hitSlop={8}
          >
            <Icon name="X" size={20} color={colors.ink2} />
          </Pressable>
        )}
      </View>

      <View style={styles.drawerNav}>
        <Text variant="caption" color="ink3" style={styles.navSectionLabel}>Principal</Text>
        {NAV_ITEMS.map(item => {
          const active = activeSection === item.key;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.navItem,
                active && styles.navItemActive,
                pressed && !active && { backgroundColor: colors.line2 },
              ]}
              onPress={() => navigate(item.route)}
            >
              <Icon name={item.icon} size={16} color={active ? colors.ink : colors.ink3} />
              <Text
                variant={active ? 'smallMedium' : 'small'}
                color={active ? 'ink' : 'ink2'}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.drawerFooter}>
        <View style={styles.userAv}>
          <Text variant="caption" color="white" style={{ fontWeight: '600' }}>{initials}</Text>
        </View>
        <Text variant="small" color="ink2" style={{ flex: 1 }} numberOfLines={1}>
          {profile?.name ?? 'Admin'}
        </Text>
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Icon name="LogOut" size={16} color={colors.ink3} />
        </Pressable>
      </View>
    </>
  );

  // ── Desktop: sidebar fija ──
  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <View style={styles.sidebar}>{sidebarContent}</View>
        <View style={styles.desktopMain}>
          <View style={styles.desktopTopbar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              {onBack && (
                <Pressable
                  onPress={onBack}
                  hitSlop={8}
                  style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                >
                  <Icon name="ChevronLeft" size={20} color={colors.ink2} />
                </Pressable>
              )}
              <Text variant="title">{title ?? sectionLabel}</Text>
            </View>
            <View style={styles.topbarRight}>
              {rightElement}
              <View style={styles.userAv}>
                <Text variant="caption" color="white" style={{ fontWeight: '600' }}>{initials}</Text>
              </View>
            </View>
          </View>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── Móvil: topbar + drawer ──
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topbar}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.hamburger, pressed && { opacity: 0.6 }]}
            onPress={onBack}
            hitSlop={8}
          >
            <Icon name="ChevronLeft" size={22} color={colors.ink} />
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.hamburger, pressed && { opacity: 0.6 }]}
            onPress={openDrawer}
            hitSlop={8}
          >
            <Icon name="Menu" size={20} color={colors.ink} />
          </Pressable>
        )}
        <Text variant="title" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
          {title ?? sectionLabel}
        </Text>
        <View style={styles.topbarRight}>
          {rightElement}
          <View style={styles.userAv}>
            <Text variant="caption" color="white" style={{ fontWeight: '600' }}>{initials}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <Modal visible={drawerOpen} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={closeDrawer} />
          <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
            {sidebarContent}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SIDEBAR_W = 240;

const styles = StyleSheet.create({
  // Móvil
  root: { flex: 1, backgroundColor: colors.surface },
  topbar: {
    backgroundColor: colors.white,
    height: 52,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[3], gap: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  hamburger: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  content: { flex: 1 },
  contentInner: { padding: space[3], paddingBottom: space[8], gap: space[3] },

  modalRoot: { flex: 1, flexDirection: 'row' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: {
    width: SIDEBAR_W, height: '100%',
    backgroundColor: colors.white,
    position: 'absolute', top: 0, left: 0, bottom: 0,
    borderRightWidth: 1, borderRightColor: colors.line,
  },

  // Desktop
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: colors.surface },
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: colors.white,
    borderRightWidth: 1, borderRightColor: colors.line,
  },
  desktopMain: { flex: 1, flexDirection: 'column' },
  desktopTopbar: {
    height: 56, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[4],
  },

  // Sidebar compartido
  logoMark: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  logoMarkText: { color: colors.white, fontWeight: '700' },
  drawerHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  drawerLogoWrap: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  drawerClose: {
    width: 32, height: 32, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },

  drawerNav: { flex: 1, padding: space[2], gap: 2 },
  navSectionLabel: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: space[2], paddingVertical: space[2],
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingVertical: space[2] + 2, paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  navItemActive: { backgroundColor: colors.surface2 },

  drawerFooter: {
    padding: space[3],
    borderTopWidth: 1, borderTopColor: colors.line,
    flexDirection: 'row', alignItems: 'center', gap: space[2],
  },
  signOutBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },

  userAv: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
});
