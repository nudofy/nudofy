// Notificaciones — actividad reciente del agente
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAgentContext } from '@/contexts/AgentContext';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import BottomTabBar from '@/components/BottomTabBar';
import type { IconName } from '@/components/ui/Icon';

interface ActivityItem {
  id: string;
  type: 'order_new' | 'order_confirmed' | 'order_sent' | 'order_cancelled' | 'plan_expiry';
  title: string;
  subtitle: string;
  date: string;
  route?: string;
}

const TYPE_META: Record<string, { icon: IconName; color: string }> = {
  order_new:       { icon: 'ShoppingCart', color: colors.ink2     },
  order_confirmed: { icon: 'CheckCircle',  color: colors.success  },
  order_sent:      { icon: 'Send',         color: colors.brand    },
  order_cancelled: { icon: 'XCircle',      color: colors.danger   },
  plan_expiry:     { icon: 'Clock',        color: colors.warning  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `hace ${days} días`;
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const { agent } = useAgentContext();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent) return;
    loadActivity();
  }, [agent]);

  async function loadActivity() {
    if (!agent) return;
    setLoading(true);

    const activity: ActivityItem[] = [];

    // Plan próximo a expirar
    if (agent.plan_expires_at) {
      const expiresAt = new Date(agent.plan_expires_at);
      const now = new Date();
      const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 7) {
        activity.push({
          id: 'plan-expiry',
          type: 'plan_expiry',
          title: daysLeft === 0 ? 'Tu trial vence hoy' : `Tu trial vence en ${daysLeft} días`,
          subtitle: 'Elige un plan para seguir usando Nudofy sin interrupciones',
          date: now.toISOString(),
        });
      }
    }

    // Últimos 20 pedidos
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status, created_at, updated_at, client:clients(name)')
      .eq('agent_id', agent.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (orders) {
      for (const order of orders) {
        const clientName = (order.client as any)?.name ?? 'Cliente';
        const num = order.order_number ?? order.id.slice(0, 8);
        let type: ActivityItem['type'] = 'order_new';
        let title = '';
        const dateField = order.updated_at ?? order.created_at;

        switch (order.status) {
          case 'draft':
            type = 'order_new';
            title = `Borrador creado · ${num}`;
            break;
          case 'confirmed':
            type = 'order_confirmed';
            title = `Pedido confirmado · ${num}`;
            break;
          case 'proposal_sent':
            type = 'order_sent';
            title = `Propuesta enviada · ${num}`;
            break;
          case 'sent_to_supplier':
            type = 'order_sent';
            title = `Enviado al proveedor · ${num}`;
            break;
          case 'cancelled':
            type = 'order_cancelled';
            title = `Pedido cancelado · ${num}`;
            break;
          default:
            title = `Pedido actualizado · ${num}`;
        }

        activity.push({
          id: order.id,
          type,
          title,
          subtitle: clientName,
          date: dateField,
          route: `/(agent)/pedido/${order.id}`,
        });
      }
    }

    // Ordenar por fecha desc
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(activity);
    setLoading(false);
  }

  return (
    <Screen>
      <TopBar title="Notificaciones" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <Text variant="small" color="ink3" align="center" style={styles.empty}>Cargando...</Text>
        )}
        {!loading && items.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="Bell" size={32} color={colors.ink4} />
            <Text variant="small" color="ink3" align="center" style={{ marginTop: space[2] }}>
              No hay actividad reciente
            </Text>
          </View>
        )}

        {!loading && items.length > 0 && (
          <View style={styles.list}>
            {items.map((item, i) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.order_new;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.item,
                    i < items.length - 1 && styles.itemBorder,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => item.route && router.push(item.route as any)}
                  disabled={!item.route}
                >
                  <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
                    <Icon name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="smallMedium">{item.title}</Text>
                    <Text variant="caption" color="ink3">{item.subtitle}</Text>
                  </View>
                  <Text variant="caption" color="ink4" style={{ flexShrink: 0 }}>
                    {timeAgo(item.date)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomTabBar activeTab="mas" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[3] },
  empty: { paddingVertical: space[8] },
  emptyState: { alignItems: 'center', paddingVertical: space[10] },
  list: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[3], paddingVertical: space[3],
    gap: space[3],
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
});
