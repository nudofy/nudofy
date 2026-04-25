// C-04 · Confirmación de pedido (éxito)
import React, { useEffect, useState } from 'react';
import {
  View, ScrollView,
  StyleSheet, Share, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, Text, Icon, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useClientData } from '@/hooks/useClient';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface OrderData {
  id: string;
  order_number?: string;
  total: number;
  notes?: string;
  created_at: string;
  supplier?: { name: string };
  catalog?: { name: string };
}

const TIMELINE = [
  { key: 'received', label: 'Pedido recibido', done: true },
  { key: 'sent', label: 'Enviado al proveedor', done: false },
  { key: 'preparation', label: 'En preparación', done: false },
];

export default function ConfirmacionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agent } = useClientData();
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('orders')
      .select(`
        id, order_number, total, notes, created_at,
        supplier:suppliers(name),
        catalog:catalogs(name)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => setOrder(data as any));
  }, [id]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero de éxito */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="Check" size={24} color={colors.white} strokeWidth={2.5} />
          </View>
          <Text variant="display" align="center">¡Pedido enviado!</Text>
          {order?.order_number && (
            <View style={styles.orderNumBadge}>
              <Text variant="smallMedium">{order.order_number}</Text>
            </View>
          )}
          {order && (
            <Text variant="caption" color="ink3" align="center">
              {formatDateTime(order.created_at)}
            </Text>
          )}
        </View>

        {/* Resumen */}
        {order && (
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.sectionBody}>
              <SummaryRow label="Proveedor" value={(order as any).supplier?.name ?? '—'} />
              <SummaryRow label="Catálogo" value={(order as any).catalog?.name ?? '—'} />
              <SummaryRow label="Total" value={formatEur(order.total)} bold />
              {order.notes && <SummaryRow label="Notas" value={order.notes} last />}
              {!order.notes && null}
            </View>
          </View>
        )}

        {/* Agente */}
        {agent && (
          <View style={styles.agentCard}>
            <Icon name="CircleCheckBig" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text variant="smallMedium">Pedido recibido por tu agente</Text>
              <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                {agent.name} lo procesará en breve.
              </Text>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text variant="caption" color="ink3" style={styles.sectionTitle}>Estado del pedido</Text>
          <View style={styles.sectionBody}>
            <View style={{ padding: space[4], gap: 0 }}>
              {TIMELINE.map((step, i) => (
                <View key={step.key} style={styles.timelineStep}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, step.done && styles.timelineDotDone]}>
                      {step.done && <Icon name="Check" size={16} color={colors.white} strokeWidth={2.5} />}
                    </View>
                    {i < TIMELINE.length - 1 && (
                      <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />
                    )}
                  </View>
                  <Text
                    variant={step.done ? 'bodyMedium' : 'body'}
                    color={step.done ? 'ink' : 'ink3'}
                    style={styles.timelineLabel}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          <Button
            label="Compartir"
            icon="Share2"
            variant="secondary"
            onPress={() => order && Share.share({
              message: `Pedido ${order.order_number} · ${formatEur(order.total)}\nNudofy`,
            })}
            style={{ flex: 1 }}
          />
          {agent?.phone && (
            <Button
              label="WhatsApp"
              icon="MessageCircle"
              variant="secondary"
              onPress={() => Linking.openURL(`https://wa.me/${agent.phone?.replace(/\D/g, '')}`)}
              style={{ flex: 1 }}
            />
          )}
        </View>

        <Button
          label="Volver al inicio"
          variant="primary"
          onPress={() => router.replace('/(client)/home')}
          fullWidth
        />
      </ScrollView>
    </Screen>
  );
}

function SummaryRow({ label, value, bold, last }: {
  label: string; value: string; bold?: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, !last && styles.summaryRowBorder]}>
      <Text variant="small" color="ink3" style={{ flex: 1 }}>{label}</Text>
      <Text
        variant={bold ? 'bodyMedium' : 'smallMedium'}
        style={{ textAlign: 'right', flex: 1 }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[3], paddingBottom: space[8] },

  hero: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: space[6],
    alignItems: 'center', gap: space[2],
    marginTop: space[2],
    borderWidth: 1, borderColor: colors.successSoft,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space[1],
  },
  orderNumBadge: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: space[3], paddingVertical: 4,
    borderWidth: 1, borderColor: colors.line,
  },

  section: { gap: space[2] },
  sectionTitle: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginLeft: space[1],
  },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },

  summaryRow: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    flexDirection: 'row', alignItems: 'flex-start',
    gap: space[3],
  },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },

  agentCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
  },

  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
  },
  timelineDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  timelineLine: { width: 2, height: 24, backgroundColor: colors.line, marginVertical: 2 },
  timelineLineDone: { backgroundColor: colors.success },
  timelineLabel: { paddingTop: 4, paddingBottom: 24, flex: 1 },

  actions: { flexDirection: 'row', gap: space[2] },
});
