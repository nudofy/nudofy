// C-01 · Inicio del portal cliente
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { useClientData, useClientOrders } from '@/hooks/useClient';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return `Hoy · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function ClientHomeScreen() {
  const router = useRouter();
  const { client, agent, loading } = useClientData();
  const { orders } = useClientOrders(client?.id);

  const recentOrders = orders.slice(0, 3);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.logoLabel}>nudofy</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Saludo */}
        <View style={styles.greetingCard}>
          <Avatar name={client?.name ?? 'C'} size={48} fontSize={16} />
          <View style={styles.greetingBody}>
            <Text style={styles.greetingLabel}>Bienvenido,</Text>
            <Text style={styles.greetingName}>{client?.name ?? '—'}</Text>
          </View>
        </View>

        {/* Tarjeta del agente */}
        {agent && (
          <View style={styles.agentCard}>
            <View style={styles.agentTop}>
              <Avatar name={agent.name} size={40} fontSize={14} />
              <View style={styles.agentBody}>
                <Text style={styles.agentLabel}>Tu agente</Text>
                <Text style={styles.agentName}>{agent.name}</Text>
              </View>
            </View>
            <View style={styles.agentActions}>
              {agent.phone && (
                <TouchableOpacity
                  style={styles.agentBtn}
                  onPress={() => Linking.openURL(`https://wa.me/${agent.phone?.replace(/\D/g, '')}`)}
                >
                  <Text style={styles.agentBtnText}>💬 WhatsApp</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.agentBtn, styles.agentBtnSecondary]}
                onPress={() => Linking.openURL(`mailto:${agent.email}`)}
              >
                <Text style={[styles.agentBtnText, styles.agentBtnTextSecondary]}>✉ Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Acciones rápidas */}
        <View style={styles.actionsRow}>
          <ActionCard
            icon="◫"
            label="Ver catálogo"
            color={colors.brandLight}
            iconColor={colors.brand}
            onPress={() => router.push('/(client)/catalogo')}
          />
          <ActionCard
            icon="≡"
            label="Mis pedidos"
            color={colors.greenLight}
            iconColor={colors.green}
            onPress={() => router.push('/(client)/pedidos')}
          />
          <ActionCard
            icon="+"
            label="Nuevo pedido"
            color={colors.amberLight}
            iconColor={colors.amber}
            onPress={() => router.push('/(client)/catalogo')}
          />
        </View>

        {/* Pedidos recientes */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Últimos pedidos</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/pedidos')}>
                <Text style={styles.seeAll}>Ver todos →</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/(client)/pedido/${order.id}` as any)}
                activeOpacity={0.85}
              >
                <View style={styles.orderLeft}>
                  <Text style={styles.orderNum}>{order.order_number ?? '—'}</Text>
                  <Text style={styles.orderMeta}>
                    {(order as any).supplier?.name} · {(order as any).catalog?.name}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{formatEur(order.total)}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                  <StatusBadge status={order.status} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {recentOrders.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin pedidos todavía</Text>
            <Text style={styles.emptyBody}>Explora el catálogo y realiza tu primer pedido</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(client)/catalogo')}
            >
              <Text style={styles.emptyBtnText}>Ver catálogo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ClientBottomTabBar activeTab="inicio" />
    </SafeAreaView>
  );
}

function ActionCard({
  icon, label, color, iconColor, onPress }: {
  icon: string; label: string; color: string; iconColor: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Text style={[styles.actionIconText, { color: iconColor }]}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  topbar: {
    backgroundColor: colors.dark,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 8 },
  logoMark: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  logoLabel: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  bellBtn: { padding: 4 },
  bellIcon: { fontSize: 18 },
  content: { padding: 14, gap: 12 },
  greetingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14 },
  greetingBody: { flex: 1 },
  greetingLabel: { fontSize: 12, color: colors.textMuted },
  greetingName: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 2 },
  agentCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12 },
  agentTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agentBody: { flex: 1 },
  agentLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  agentName: { fontSize: 15, fontWeight: '500', color: colors.text, marginTop: 2 },
  agentActions: { flexDirection: 'row', gap: 8 },
  agentBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center' },
  agentBtnSecondary: { backgroundColor: colors.brandLight },
  agentBtnText: { fontSize: 13, fontWeight: '500', color: colors.white },
  agentBtnTextSecondary: { color: colors.brand },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8 },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center' },
  actionIconText: { fontSize: 20, fontWeight: '500' },
  actionLabel: { fontSize: 11, fontWeight: '500', color: colors.text, textAlign: 'center' },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontSize: 12, fontWeight: '500', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll: { fontSize: 12, color: colors.brand },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  orderLeft: { flex: 1 },
  orderNum: { fontSize: 11, color: colors.textMuted },
  orderMeta: { fontSize: 13, fontWeight: '500', color: colors.text, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 3 },
  orderAmount: { fontSize: 13, fontWeight: '500', color: colors.text },
  orderDate: { fontSize: 10, color: colors.textMuted },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10 },
  emptyBtnText: { color: colors.white, fontSize: 14, fontWeight: '500' } });
