// C-01 · Inicio del portal cliente
import React from 'react';
import {
  View, ScrollView, Pressable,
  StyleSheet, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, Text, Icon, Badge, EmptyState, Button } from '@/components/ui';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { useClientData, useClientOrders } from '@/hooks/useClient';
import type { IconName } from '@/components/ui/Icon';

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
      <Screen>
        <Text variant="small" color="ink3" align="center" style={{ marginTop: space[8] }}>
          Cargando...
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Topbar minimalista con logo */}
      <View style={styles.topbar}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text variant="bodyMedium" style={{ color: colors.white }}>N</Text>
          </View>
          <Text variant="bodyMedium">nudofy</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
          <Icon name="Bell" size={20} color={colors.ink2} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Saludo */}
        <View style={styles.greetingCard}>
          <Avatar name={client?.name ?? 'C'} size={48} fontSize={16} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="ink3">Bienvenido,</Text>
            <Text variant="title" style={{ marginTop: 2 }}>{client?.name ?? '—'}</Text>
          </View>
        </View>

        {/* Tarjeta del agente */}
        {agent && (
          <View style={styles.agentCard}>
            <View style={styles.agentTop}>
              <Avatar name={agent.name} size={40} fontSize={14} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="ink3" style={styles.kicker}>Tu agente</Text>
                <Text variant="bodyMedium" style={{ marginTop: 2 }}>{agent.name}</Text>
              </View>
            </View>
            <View style={styles.agentActions}>
              {agent.phone && (
                <Button
                  label="WhatsApp"
                  icon="MessageCircle"
                  variant="secondary"
                  onPress={() => Linking.openURL(`https://wa.me/${agent.phone?.replace(/\D/g, '')}`)}
                  style={{ flex: 1 }}
                />
              )}
              <Button
                label="Email"
                icon="Mail"
                variant="secondary"
                onPress={() => Linking.openURL(`mailto:${agent.email}`)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* Acciones rápidas */}
        <View style={styles.actionsRow}>
          <ActionCard
            icon="LayoutGrid"
            label="Ver catálogo"
            onPress={() => router.push('/(client)/catalogo')}
          />
          <ActionCard
            icon="ClipboardList"
            label="Mis pedidos"
            onPress={() => router.push('/(client)/pedidos')}
          />
          <ActionCard
            icon="Plus"
            label="Nuevo pedido"
            onPress={() => router.push('/(client)/catalogo')}
          />
        </View>

        {/* Pedidos recientes */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="caption" color="ink3" style={styles.sectionTitle}>Últimos pedidos</Text>
              <Pressable onPress={() => router.push('/(client)/pedidos')}>
                <Text variant="caption" color="ink2">Ver todos</Text>
              </Pressable>
            </View>
            {recentOrders.map(order => (
              <Pressable
                key={order.id}
                style={({ pressed }) => [styles.orderCard, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/(client)/pedido/${order.id}` as any)}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color="ink3">{order.order_number ?? '—'}</Text>
                  <Text variant="bodyMedium" style={{ marginTop: 2 }} numberOfLines={1}>
                    {(order as any).supplier?.name} · {(order as any).catalog?.name}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text variant="bodyMedium">{formatEur(order.total)}</Text>
                  <Text variant="caption" color="ink3">{formatDate(order.created_at)}</Text>
                  <StatusBadge status={order.status} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {recentOrders.length === 0 && (
          <EmptyState
            icon="ClipboardList"
            title="Sin pedidos todavía"
            description="Explora el catálogo y realiza tu primer pedido"
            actionLabel="Ver catálogo"
            onAction={() => router.push('/(client)/catalogo')}
          />
        )}
      </ScrollView>

      <ClientBottomTabBar activeTab="inicio" />
    </Screen>
  );
}

function ActionCard({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Icon name={icon} size={20} color={colors.ink} />
      </View>
      <Text variant="caption" align="center" style={{ fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  logoMark: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: { padding: space[1] },

  content: { padding: space[3], gap: space[3] },

  greetingCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[4],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

  agentCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  agentTop: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  kicker: { textTransform: 'uppercase', letterSpacing: 0.5 },
  agentActions: { flexDirection: 'row', gap: space[2] },

  actionsRow: { flexDirection: 'row', gap: space[2] },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },

  section: { gap: space[2] },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space[1],
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },

  orderCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row',
    alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  orderRight: { alignItems: 'flex-end', gap: 4 },
});
