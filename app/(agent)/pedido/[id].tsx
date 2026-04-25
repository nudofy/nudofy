// A-08 · Resumen de pedido (solo lectura tras confirmar)
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Button, Icon, Badge } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Order, OrderItem } from '@/hooks/useAgent';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function PedidoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<(OrderItem & { product: { name: string; reference?: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('orders')
      .select(`
        id, order_number, status, total, discount_code, notes, pdf_url, created_at, sent_at,
        client:clients(id, name, address),
        supplier:suppliers(id, name, conditions),
        catalog:catalogs(id, name)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setOrder(data as any);
        setLoading(false);
      });

    supabase
      .from('order_items')
      .select('id, order_id, product_id, quantity, unit_price, total, product:products(name, reference)')
      .eq('order_id', id)
      .then(({ data }) => setItems((data as any[]) ?? []));
  }, [id]);

  async function deleteDraft() {
    if (!order) return;
    await supabase.from('order_items').delete().eq('order_id', order.id);
    await supabase.from('orders').delete().eq('id', order.id);
    router.back();
  }

  async function sendToSupplier() {
    if (!order) return;
    const { error } = await supabase
      .from('orders')
      .update({ status: 'sent_to_supplier', sent_at: new Date().toISOString() })
      .eq('id', order.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Pedido enviado al proveedor');
    setOrder(o => o ? { ...o, status: 'sent_to_supplier' } : o);
  }

  async function shareOrder() {
    await Share.share({
      message: `Pedido ${order?.order_number} · ${formatEur(order?.total ?? 0)}\nNudofy` });
  }

  if (loading || !order) {
    return (
      <Screen>
        <TopBar title="Pedido" onBack={() => router.back()} />
        <View style={styles.loadingWrap}>
          <Text variant="small" color="ink3">Cargando...</Text>
        </View>
      </Screen>
    );
  }

  const isConfirmed = order.status === 'confirmed' || order.status === 'sent_to_supplier';

  return (
    <Screen>
      <TopBar title="Resumen del pedido" onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Badge de estado */}
        {isConfirmed && (
          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Icon name="Check" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium">Pedido confirmado</Text>
              <Text variant="small" color="ink3">{formatDateTime(order.created_at)}</Text>
              {order.order_number && (
                <View style={styles.orderNumPill}>
                  <Text variant="caption" color="ink2">{order.order_number}</Text>
                </View>
              )}
            </View>
            {order.status === 'sent_to_supplier' && <Badge label="Enviado" variant="success" />}
          </View>
        )}
        {order.status === 'draft' && (
          <View style={styles.draftCard}>
            <Icon name="FileText" size={20} color={colors.ink2} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">Borrador · Sin confirmar</Text>
              <View style={styles.draftActions}>
                <Button
                  label="Continuar pedido"
                  icon="ArrowRight"
                  onPress={() => router.push(`/(agent)/pedido/nuevo?draftId=${order.id}&edit=1` as any)}
                  style={{ flex: 1 }}
                />
                {!confirmDelete ? (
                  <Button
                    label="Eliminar"
                    icon="Trash2"
                    variant="ghost"
                    onPress={() => setConfirmDelete(true)}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <View style={styles.deleteConfirm}>
                    <Text variant="small" color="danger">¿Seguro?</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button label="Sí" variant="ghost" size="sm" onPress={deleteDraft} />
                      <Button label="No" variant="secondary" size="sm" onPress={() => setConfirmDelete(false)} />
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Cliente y entrega */}
        <DataBlock title="Cliente y entrega" icon="User">
          <DataRow label="Cliente" value={(order as any).client?.name ?? 'Sin cliente'} />
          <DataRow label="Envío a" value={(order as any).client?.address ?? '—'} last />
        </DataBlock>

        {/* Proveedor */}
        <DataBlock title="Proveedor" icon="Truck">
          <DataRow label="Proveedor" value={(order as any).supplier?.name ?? '—'} />
          <DataRow label="Catálogo" value={(order as any).catalog?.name ?? '—'} />
          <DataRow label="Condiciones" value={(order as any).supplier?.conditions ?? '—'} last />
        </DataBlock>

        {/* Líneas */}
        <DataBlock title="Líneas del pedido" icon="ListOrdered">
          {items.map((item, idx) => (
            <DataRow
              key={item.id}
              label={(item as any).product?.name ?? '—'}
              value={`x${item.quantity} · ${formatEur(item.total)}`}
              last={idx === items.length - 1}
            />
          ))}
        </DataBlock>

        {/* Totales */}
        <DataBlock title="Totales" icon="Receipt">
          <DataRow label={`Subtotal (${items.reduce((s, i) => s + i.quantity, 0)} uds.)`} value={formatEur(order.total)} />
          {order.discount_code && <DataRow label="Descuento" value={order.discount_code} />}
          <DataRow label="Total pedido" value={formatEur(order.total)} bold last />
        </DataBlock>

        {order.notes && (
          <View style={styles.notesCard}>
            <Text variant="caption" color="ink3" style={styles.notesLabel}>Observaciones</Text>
            <Text variant="body" style={{ marginTop: 4 }}>{order.notes}</Text>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actionsGrid}>
          <ActionBtn icon="Download" label="Ver PDF" onPress={() => {}} />
          <ActionBtn icon="Mail" label="Enviar email" onPress={shareOrder} />
          <ActionBtn icon="MessageCircle" label="WhatsApp" onPress={shareOrder} />
          <ActionBtn icon="Share2" label="Compartir" onPress={shareOrder} />
        </View>

        {/* Enviar al proveedor */}
        {order.status === 'confirmed' && (
          <Button
            label="Marcar como enviado al proveedor"
            onPress={sendToSupplier}
            fullWidth
            style={{ marginTop: space[2] }}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function DataBlock({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Icon name={icon} size={16} color={colors.ink3} />
        <Text variant="caption" color="ink3" style={styles.blockTitle}>{title}</Text>
      </View>
      <View>{children}</View>
    </View>
  );
}

function DataRow({ label, value, bold, last }: { label: string; value: string; bold?: boolean; last?: boolean }) {
  return (
    <View style={[styles.dataRow, !last && styles.dataRowBorder]}>
      <Text variant="small" color="ink3" style={{ flex: 1 }}>{label}</Text>
      {bold ? (
        <Text variant="bodyMedium" color="brand" align="right" style={{ flex: 1 }}>{value}</Text>
      ) : (
        <Text variant="smallMedium" align="right" style={{ flex: 1 }}>{value}</Text>
      )}
    </View>
  );
}

function ActionBtn({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actBtn, pressed && { backgroundColor: colors.surface2 }]}
      onPress={onPress}
    >
      <Icon name={icon} size={20} color={colors.ink2} />
      <Text variant="smallMedium" align="center">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space[3], gap: space[2] },

  statusCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
  },
  statusIcon: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  orderNumPill: {
    backgroundColor: colors.white,
    paddingHorizontal: space[2], paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  draftCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
  },
  draftActions: {
    flexDirection: 'row', gap: space[2], marginTop: space[2],
  },
  deleteConfirm: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  notesCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: space[3],
  },
  notesLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  actionsGrid: {
    flexDirection: 'row', gap: space[2], marginTop: space[3],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line,
  },
  block: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  blockHeader: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingHorizontal: space[3], paddingVertical: space[2],
    backgroundColor: colors.surface2,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  blockTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  dataRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingHorizontal: space[3], paddingVertical: space[3],
  },
  dataRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  actBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line,
  },
});
