// ADM · Pedidos de un agente
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { colors, space, radius } from '@/theme';
import { Text, Badge } from '@/components/ui';

interface AgentOrder {
  id: string;
  order_number?: string;
  status: string;
  total: number;
  created_at: string;
  client?: { name: string };
  supplier?: { name: string };
}

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'neutral' | 'danger' }> = {
  draft:             { label: 'Borrador',   variant: 'neutral'  },
  confirmed:         { label: 'Confirmado', variant: 'warning'  },
  proposal_sent:     { label: 'Propuesta',  variant: 'warning'  },
  sent_to_supplier:  { label: 'Enviado',    variant: 'success'  },
  cancelled:         { label: 'Cancelado',  variant: 'danger'   },
};

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminAgentePedidosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [orders, setOrders] = useState<AgentOrder[]>([]);
  const [agentName, setAgentName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('agents').select('name').eq('id', id).single(),
      supabase
        .from('orders')
        .select('id, order_number, status, total, created_at, client:clients(name), supplier:suppliers(name)')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]).then(([agentRes, ordersRes]) => {
      setAgentName((agentRes.data as any)?.name ?? 'Agente');
      setOrders(((ordersRes.data ?? []) as unknown) as AgentOrder[]);
      setLoading(false);
    });
  }, [id]);

  return (
    <AdminShell
      activeSection="agentes"
      title={`Pedidos · ${agentName}`}
      onBack={() => router.back()}
    >
      {loading && (
        <Text variant="small" color="ink3" align="center" style={styles.empty}>Cargando...</Text>
      )}
      {!loading && orders.length === 0 && (
        <Text variant="small" color="ink3" align="center" style={styles.empty}>Este agente no tiene pedidos.</Text>
      )}

      {!loading && orders.length > 0 && (
        <View style={styles.card}>
          <View style={styles.tableHead}>
            {['Nº Pedido', 'Cliente', 'Proveedor', 'Total', 'Estado', 'Fecha'].map((h, i) => (
              <Text
                key={h}
                variant="caption"
                color="ink3"
                style={[styles.th, { width: [130, 180, 160, 110, 110, 110][i] }]}
              >
                {h.toUpperCase()}
              </Text>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {orders.map((order, i) => {
                const status = STATUS_META[order.status] ?? STATUS_META.draft;
                return (
                  <View
                    key={order.id}
                    style={[styles.tableRow, i === orders.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={[styles.td, { width: 130 }]}>
                      <Text variant="smallMedium">{order.order_number ?? order.id.slice(0, 8)}</Text>
                    </View>
                    <View style={[styles.td, { width: 180 }]}>
                      <Text variant="small" numberOfLines={1}>{order.client?.name ?? '—'}</Text>
                    </View>
                    <View style={[styles.td, { width: 160 }]}>
                      <Text variant="small" numberOfLines={1}>{order.supplier?.name ?? '—'}</Text>
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Text variant="smallMedium">{formatEur(order.total)}</Text>
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Badge label={status.label} variant={status.variant} />
                    </View>
                    <View style={[styles.td, { width: 110 }]}>
                      <Text variant="small" color="ink3">{formatDate(order.created_at)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: space[8] },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  th: {
    paddingVertical: space[2] + 2, paddingHorizontal: space[3],
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    alignItems: 'center',
  },
  td: { paddingVertical: space[2] + 4, paddingHorizontal: space[3], justifyContent: 'center' },
});
