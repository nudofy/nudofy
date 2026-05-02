// C-03 · Carrito del portal cliente (2 vistas: mis carritos → detalle)
import React, { useState } from 'react';
import {
  View, ScrollView, Pressable,
  StyleSheet, TextInput, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button, EmptyState } from '@/components/ui';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import { useCart } from '@/contexts/CartContext';
import { useClientData } from '@/hooks/useClient';
import { confirmClientOrder } from '@/hooks/useClient';
import { useToast } from '@/contexts/ToastContext';
import type { Cart } from '@/contexts/CartContext';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function ClientCarritoScreen() {
  const router = useRouter();
  const { carts } = useCart();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const selectedCart = carts.find(c => c.supplier_id === selectedSupplierId);

  if (selectedCart) {
    return (
      <CartDetail
        cart={selectedCart}
        onBack={() => setSelectedSupplierId(null)}
        onConfirmed={(orderId) => router.push(`/(client)/confirmacion/${orderId}` as any)}
      />
    );
  }

  return <CartList carts={carts} onSelectCart={(id) => setSelectedSupplierId(id)} />;
}

// ——— Lista de carritos abiertos ———
function CartList({ carts, onSelectCart }: { carts: Cart[]; onSelectCart: (id: string) => void }) {
  const router = useRouter();
  const totalCartsAmount = carts.reduce(
    (sum, c) => sum + c.items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    0,
  );

  return (
    <Screen>
      <TopBar title="Mi carrito" onBack={() => router.back()} />

      {carts.length > 0 && (
        <View style={styles.kpiBar}>
          <KpiItem value={carts.length.toString()} label="Carritos abiertos" />
          <KpiItem value={formatEur(totalCartsAmount)} label="Total acumulado" />
        </View>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {carts.length === 0 && (
          <EmptyState
            icon="ShoppingCart"
            title="Carrito vacío"
            description="Explora el catálogo y añade productos"
            actionLabel="Ver catálogo"
            onAction={() => router.push('/(client)/catalogo')}
          />
        )}

        {carts.map(cart => {
          const cartTotal = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
          const cartUnits = cart.items.reduce((s, i) => s + i.quantity, 0);
          return (
            <Pressable
              key={cart.supplier_id}
              style={({ pressed }) => [styles.cartCard, pressed && { opacity: 0.7 }]}
              onPress={() => onSelectCart(cart.supplier_id)}
            >
              <View style={styles.cartCardHead}>
                <View style={styles.cartLogo}>
                  <Text variant="bodyMedium" color="ink2">{cart.supplier_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{cart.supplier_name}</Text>
                  <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{cart.catalog_name}</Text>
                </View>
                <Icon name="ChevronRight" size={18} color={colors.ink4} />
              </View>
              <View style={styles.cartCardFoot}>
                <Text variant="caption" color="ink3">
                  {cartUnits} artículos · {cart.items.length} referencias
                </Text>
                <Text variant="bodyMedium">{formatEur(cartTotal)}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <ClientBottomTabBar activeTab="catalogo" />
    </Screen>
  );
}

// ——— Detalle de un carrito ———
function CartDetail({
  cart, onBack, onConfirmed,
}: {
  cart: Cart; onBack: () => void; onConfirmed: (orderId: string) => void;
}) {
  const toast = useToast();
  const { updateQty, removeItem, setCartNotes, clearCart } = useCart();
  const { client, agent } = useClientData();
  const [confirming, setConfirming] = useState(false);

  const cartTotal = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const cartUnits = cart.items.reduce((s, i) => s + i.quantity, 0);

  async function handleConfirm() {
    if (!client || !agent) return;
    setConfirming(true);
    const { error, data } = await confirmClientOrder({
      agentId: client.agent_id,
      clientId: client.id,
      supplierId: cart.supplier_id,
      catalogId: cart.catalog_id,
      items: cart.items.map(i => ({
        product_id: i.product_id,
        unit_price: i.unit_price,
        quantity: i.quantity,
        attributes: i.attributes ?? null,
        variant_id: i.variant_id ?? null,
      })),
      notes: cart.notes,
    });
    setConfirming(false);
    if (error) { toast.error(error); return; }
    clearCart(cart.supplier_id);
    onConfirmed(data.id);
  }

  return (
    <Screen>
      <TopBar
        title={cart.supplier_name}
        subtitle={cart.catalog_name}
        onBack={onBack}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          {/* Líneas */}
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>
              Artículos ({cartUnits})
            </Text>
            <View style={styles.sectionBody}>
              {cart.items.map((item, i) => (
                <View
                  key={item.item_key}
                  style={[styles.lineRow, i < cart.items.length - 1 && styles.lineRowBorder]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" numberOfLines={2}>{item.name}</Text>
                    {item.attributes && Object.keys(item.attributes).length > 0 && (
                      <Text variant="caption" color="brand" style={{ marginTop: 2 }}>
                        {Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </Text>
                    )}
                    {item.reference && (
                      <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                        Ref: {item.reference}
                      </Text>
                    )}
                    <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                      {formatEur(item.unit_price)} / ud.
                    </Text>
                  </View>
                  <View style={styles.lineRight}>
                    <View style={styles.qtyRow}>
                      <Pressable
                        style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => updateQty(cart.supplier_id, item.item_key, item.quantity - 1)}
                      >
                        <Icon name="Minus" size={16} color={colors.ink} />
                      </Pressable>
                      <Text variant="smallMedium" align="center" style={{ paddingHorizontal: space[2] }}>
                        {item.quantity}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => updateQty(cart.supplier_id, item.item_key, item.quantity + 1)}
                      >
                        <Icon name="Plus" size={16} color={colors.ink} />
                      </Pressable>
                    </View>
                    <Text variant="bodyMedium">{formatEur(item.unit_price * item.quantity)}</Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeItem(cart.supplier_id, item.item_key)}
                    >
                      <Icon name="X" size={16} color={colors.ink4} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Notas */}
          <View style={styles.section}>
            <Text variant="caption" color="ink3" style={styles.sectionTitle}>Observaciones</Text>
            <View style={styles.sectionBody}>
              <TextInput
                style={styles.notesInput}
                multiline
                placeholder="Añade notas para este pedido..."
                placeholderTextColor={colors.ink4}
                value={cart.notes}
                onChangeText={t => setCartNotes(cart.supplier_id, t)}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Total */}
          <View style={styles.totalBlock}>
            <View style={styles.totalRow}>
              <Text variant="bodyMedium">Total pedido</Text>
              <Text variant="display">{formatEur(cartTotal)}</Text>
            </View>
            <Text variant="caption" color="ink3">
              {cartUnits} artículos · {cart.items.length} referencias
            </Text>
          </View>

          {/* Info agente */}
          {agent && (
            <View style={styles.agentInfo}>
              <Icon name="Info" size={16} color={colors.ink2} />
              <Text variant="small" color="ink2" style={{ flex: 1 }}>
                Tu agente <Text variant="smallMedium">{agent.name}</Text> recibirá el pedido automáticamente.
              </Text>
            </View>
          )}

          {/* Botón confirmar */}
          <Button
            label={confirming ? 'Enviando...' : 'Confirmar pedido'}
            onPress={handleConfirm}
            loading={confirming}
            disabled={confirming || cart.items.length === 0}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function KpiItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.kpiItem}>
      <Text variant="heading">{value}</Text>
      <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    paddingVertical: space[3],
  },
  kpiItem: { flex: 1, alignItems: 'center' },

  listContent: { padding: space[3], gap: space[2] },

  cartCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  cartCardHead: {
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
  },
  cartLogo: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  cartCardFoot: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.line2,
  },

  detailContent: { padding: space[3], gap: space[3] },

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

  lineRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: space[3],
    gap: space[3],
  },
  lineRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  lineRight: { alignItems: 'flex-end', gap: space[2] },

  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  qtyBtn: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },

  notesInput: {
    padding: space[3],
    fontSize: 14, color: colors.ink,
    minHeight: 90,
  },

  totalBlock: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[4],
    gap: space[1],
    borderWidth: 1, borderColor: colors.line,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  agentInfo: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
  },
});
