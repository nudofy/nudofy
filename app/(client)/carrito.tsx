// C-03 · Carrito del portal cliente (2 vistas: mis carritos → detalle)
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
  KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import { useCart } from '@/contexts/CartContext';
import { useClientData } from '@/hooks/useClient';
import { confirmClientOrder } from '@/hooks/useClient';
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
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mi carrito</Text>
      </View>

      {carts.length > 0 && (
        <View style={styles.kpiBar}>
          <KpiItem value={carts.length.toString()} label="Carritos abiertos" />
          <KpiItem value={formatEur(totalCartsAmount)} label="Total acumulado" />
        </View>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {carts.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>Carrito vacío</Text>
            <Text style={styles.emptyBody}>Explora el catálogo y añade productos</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(client)/catalogo')}
            >
              <Text style={styles.emptyBtnText}>Ver catálogo</Text>
            </TouchableOpacity>
          </View>
        )}

        {carts.map(cart => {
          const cartTotal = cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
          const cartUnits = cart.items.reduce((s, i) => s + i.quantity, 0);
          return (
            <TouchableOpacity
              key={cart.supplier_id}
              style={styles.cartCard}
              onPress={() => onSelectCart(cart.supplier_id)}
              activeOpacity={0.85}
            >
              <View style={styles.cartCardHead}>
                <View style={styles.cartLogo}>
                  <Text style={styles.cartLogoText}>{cart.supplier_name.charAt(0)}</Text>
                </View>
                <View style={styles.cartCardBody}>
                  <Text style={styles.cartSupplier}>{cart.supplier_name}</Text>
                  <Text style={styles.cartCatalog}>{cart.catalog_name}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
              <View style={styles.cartCardFoot}>
                <Text style={styles.cartMeta}>{cartUnits} artículos · {cart.items.length} referencias</Text>
                <Text style={styles.cartTotal}>{formatEur(cartTotal)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ClientBottomTabBar activeTab="catalogo" />
    </SafeAreaView>
  );
}

// ——— Detalle de un carrito ———
function CartDetail({
  cart, onBack, onConfirmed }: {
  cart: Cart; onBack: () => void; onConfirmed: (orderId: string) => void;
}) {
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
        quantity: i.quantity })),
      notes: cart.notes });
    setConfirming(false);
    if (error) { Alert.alert('Error', error); return; }
    clearCart(cart.supplier_id);
    onConfirmed(data.id);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.topbarCenter}>
          <Text style={styles.title}>{cart.supplier_name}</Text>
          <Text style={styles.titleSub}>{cart.catalog_name}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        {/* Líneas */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Artículos ({cartUnits})</Text>
          {cart.items.map(item => (
            <View key={item.product_id} style={styles.lineRow}>
              <View style={styles.lineBody}>
                <Text style={styles.lineName}>{item.name}</Text>
                {item.reference && <Text style={styles.lineRef}>Ref: {item.reference}</Text>}
                <Text style={styles.linePrice}>{formatEur(item.unit_price)} / ud.</Text>
              </View>
              <View style={styles.lineRight}>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQty(cart.supplier_id, item.product_id, item.quantity - 1)}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQty(cart.supplier_id, item.product_id, item.quantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.lineTotal}>{formatEur(item.unit_price * item.quantity)}</Text>
                <TouchableOpacity onPress={() => removeItem(cart.supplier_id, item.product_id)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Notas */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Observaciones</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Añade notas para este pedido..."
            placeholderTextColor={colors.textMuted}
            value={cart.notes}
            onChangeText={t => setCartNotes(cart.supplier_id, t)}
          />
        </View>

        {/* Total */}
        <View style={styles.totalBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total pedido</Text>
            <Text style={styles.totalValue}>{formatEur(cartTotal)}</Text>
          </View>
          <Text style={styles.totalUnits}>{cartUnits} artículos · {cart.items.length} referencias</Text>
        </View>

        {/* Info agente */}
        {agent && (
          <View style={styles.agentInfo}>
            <Text style={styles.agentInfoText}>
              Tu agente <Text style={styles.agentInfoName}>{agent.name}</Text> recibirá el pedido automáticamente
            </Text>
          </View>
        )}

        {/* Botón confirmar */}
        <TouchableOpacity
          style={[styles.confirmBtn, confirming && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={confirming}
        >
          <Text style={styles.confirmBtnText}>
            {confirming ? 'Enviando...' : 'Confirmar pedido'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function KpiItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.kpiItem}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#efefef',
    gap: 10 },
  backBtn: { padding: 2 },
  back: { fontSize: 20, color: colors.purple },
  topbarCenter: { flex: 1 },
  title: { fontSize: 17, fontWeight: '500', color: colors.text },
  titleSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  kpiBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
    paddingVertical: 12 },
  kpiItem: { flex: 1, alignItems: 'center' },
  kpiValue: { fontSize: 18, fontWeight: '600', color: colors.text },
  kpiLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  listContent: { padding: 12, gap: 8 },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 8,
    marginTop: 16 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: colors.purple,
    borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: colors.white, fontSize: 14, fontWeight: '500' },
  cartCard: {
    backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  cartCardHead: {
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartLogo: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.purpleLight,
    alignItems: 'center', justifyContent: 'center' },
  cartLogoText: { fontSize: 18, fontWeight: '600', color: colors.purple },
  cartCardBody: { flex: 1 },
  cartSupplier: { fontSize: 15, fontWeight: '500', color: colors.text },
  cartCatalog: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 18, color: '#ccc' },
  cartCardFoot: {
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: colors.borderLight },
  cartMeta: { fontSize: 11, color: colors.textMuted },
  cartTotal: { fontSize: 14, fontWeight: '600', color: colors.purple },
  detailContent: { padding: 12, gap: 10 },
  block: {
    backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  blockTitle: {
    fontSize: 11, fontWeight: '500', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10 },
  lineRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: colors.borderLight,
    gap: 10 },
  lineBody: { flex: 1 },
  lineName: { fontSize: 13, fontWeight: '500', color: colors.text },
  lineRef: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  linePrice: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  lineRight: { alignItems: 'flex-end', gap: 6 },
  lineTotal: { fontSize: 13, fontWeight: '600', color: colors.text },
  removeBtn: { fontSize: 13, color: colors.red, padding: 4 },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.purpleLight, borderRadius: 8, overflow: 'hidden' },
  qtyBtn: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, color: colors.purple, fontWeight: '500' },
  qtyValue: { paddingHorizontal: 10, fontSize: 13, fontWeight: '500', color: colors.purple },
  notesInput: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 10,
    fontSize: 13, color: colors.text,
    minHeight: 80, textAlignVertical: 'top',
    marginBottom: 12 },
  totalBlock: {
    backgroundColor: colors.white, borderRadius: 14,
    padding: 16, gap: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.purple },
  totalUnits: { fontSize: 11, color: colors.textMuted },
  agentInfo: {
    backgroundColor: colors.greenLight,
    borderRadius: 12, padding: 12 },
  agentInfoText: { fontSize: 13, color: colors.green, textAlign: 'center' },
  agentInfoName: { fontWeight: '600' },
  confirmBtn: {
    backgroundColor: colors.green,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' } });
