// Shell compartido del panel de administración: topbar dark + drawer lateral (móvil) / sidebar fija (web)
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export type AdminSection = 'dashboard' | 'agentes' | 'planes' | 'facturacion' | 'configuracion';

const NAV_ITEMS: { key: AdminSection; label: string; icon: string; route: string }[] = [
  { key: 'dashboard',     label: 'Dashboard',     icon: '⊞', route: '/(admin)/dashboard'     },
  { key: 'agentes',       label: 'Agentes',        icon: '○', route: '/(admin)/agentes'       },
  { key: 'planes',        label: 'Planes',          icon: '✦', route: '/(admin)/planes'        },
  { key: 'facturacion',   label: 'Facturación',    icon: '▭', route: '/(admin)/facturacion'   },
  { key: 'configuracion', label: 'Configuración',  icon: '⚙', route: '/(admin)/configuracion' },
];

interface Props {
  activeSection: AdminSection;
  title?: string;
  rightElement?: React.ReactNode;
  children: React.ReactNode;
}

export default function AdminShell({ activeSection, title, rightElement, children }: Props) {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-240)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }

  function closeDrawer() {
    Animated.timing(slideAnim, { toValue: -240, duration: 220, useNativeDriver: true })
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
            <Text style={styles.logoMarkText}>N</Text>
          </View>
          <View>
            <Text style={styles.drawerLogoTitle}>Nudofy</Text>
            <Text style={styles.drawerLogoSub}>Administración</Text>
          </View>
        </View>
        {!isDesktop && (
          <TouchableOpacity style={styles.drawerClose} onPress={closeDrawer}>
            <Text style={styles.drawerCloseText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.drawerNav}>
        <Text style={styles.navSectionLabel}>Principal</Text>
        {NAV_ITEMS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, activeSection === item.key && styles.navItemActive]}
            onPress={() => navigate(item.route)}
          >
            <Text style={[styles.navIcon, activeSection === item.key && styles.navIconActive]}>
              {item.icon}
            </Text>
            <Text style={[styles.navLabel2, activeSection === item.key && styles.navLabel2Active]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.drawerFooter}>
        <View style={styles.userAv}>
          <Text style={styles.userAvText}>{initials}</Text>
        </View>
        <Text style={styles.drawerFooterName} numberOfLines={1}>{profile?.name ?? 'Admin'}</Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>↪</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── Diseño escritorio: sidebar fija a la izquierda ──
  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <View style={styles.sidebar}>{sidebarContent}</View>
        <View style={styles.desktopMain}>
          {/* Topbar */}
          <View style={styles.desktopTopbar}>
            <Text style={styles.desktopTopbarTitle}>{title ?? sectionLabel}</Text>
            <View style={styles.topbarRight}>
              {rightElement}
              <View style={styles.userAv}>
                <Text style={styles.userAvText}>{initials}</Text>
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

  // ── Diseño móvil: topbar + drawer ──
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <TouchableOpacity style={styles.hamburger} onPress={openDrawer}>
            <View style={styles.hLine} />
            <View style={styles.hLine} />
            <View style={styles.hLine} />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>N</Text>
            </View>
            <Text style={styles.logoText}>Nudofy</Text>
            <Text style={styles.logoSub}>Admin</Text>
          </View>
        </View>
        <Text style={styles.topbarCenter}>{title ?? sectionLabel}</Text>
        <View style={styles.topbarRight}>
          {rightElement}
          <View style={styles.userAv}>
            <Text style={styles.userAvText}>{initials}</Text>
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

const DARK = '#1a1a1a';
const BORDER_DARK = '#2a2a2a';
const SIDEBAR_W = 220;

const styles = StyleSheet.create({
  // ── Móvil ──
  root: { flex: 1, backgroundColor: '#f5f5f3' },
  topbar: {
    backgroundColor: DARK, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16 },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburger: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', gap: 5 },
  hLine: { width: 18, height: 1.5, backgroundColor: '#888', borderRadius: 2 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoText: { fontSize: 14, fontWeight: '500', color: '#fff' },
  logoSub: { fontSize: 10, color: '#555', marginLeft: 2 },
  topbarCenter: { fontSize: 14, fontWeight: '500', color: '#fff', flex: 1, textAlign: 'center' },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 32, gap: 14 },
  modalRoot: { flex: 1, flexDirection: 'row' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: {
    width: SIDEBAR_W, height: '100%',
    backgroundColor: DARK,
    position: 'absolute', top: 0, left: 0, bottom: 0 },
  // ── Escritorio ──
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: '#f5f5f3' },
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: DARK,
    flexDirection: 'column' },
  desktopMain: { flex: 1, flexDirection: 'column' },
  desktopTopbar: {
    height: 52, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#ececec',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24 },
  desktopTopbarTitle: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  // ── Compartidos sidebar ──
  logoMark: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#534AB7',
    alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  drawerHeader: {
    padding: 18, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: BORDER_DARK,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drawerLogoWrap: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  drawerLogoTitle: { fontSize: 14, fontWeight: '500', color: '#fff' },
  drawerLogoSub: { fontSize: 10, color: '#555' },
  drawerClose: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  drawerCloseText: { color: '#666', fontSize: 14 },
  drawerNav: { flex: 1, padding: 10 },
  navSectionLabel: {
    fontSize: 10, color: '#555',
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 8, marginBottom: 5 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 10,
    borderRadius: 8, marginBottom: 2 },
  navItemActive: { backgroundColor: '#534AB7' },
  navIcon: { fontSize: 14, color: '#888', width: 18, textAlign: 'center' },
  navIconActive: { color: '#fff' },
  navLabel2: { fontSize: 13, color: '#888' },
  navLabel2Active: { color: '#fff', fontWeight: '500' },
  drawerFooter: {
    padding: 14,
    borderTopWidth: 0.5, borderTopColor: BORDER_DARK,
    flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerFooterName: { flex: 1, fontSize: 12, color: '#888' },
  signOutBtn: { padding: 4 },
  signOutText: { color: '#555', fontSize: 16 },
  userAv: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#534AB7',
    alignItems: 'center', justifyContent: 'center' },
  userAvText: { color: '#fff', fontSize: 10, fontWeight: '500' } });
