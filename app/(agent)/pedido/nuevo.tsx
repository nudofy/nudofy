// A-07 · Nuevo pedido — flujo en 3 pasos:
// 1. Seleccionar proveedor/catálogo  2. Añadir productos al carrito  3. Carrito + cliente
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import Avatar from '@/components/Avatar';
import { useClients, useSuppliers, useCatalogs, useProducts, useAgent } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import type { Client, Supplier, Catalog, Product } from '@/hooks/useAgent';

type Step = 'proveedor' | 'productos' | 'carrito';
type ClientMode = 'none' | 'search' | 'new';

interface CartItem { product: Product; quantity: number; }
interface NewClientData { name: string; phone: string; email: string; }

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function NuevoPedidoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const { agent } = useAgent();

  const [step, setStep] = useState<Step>('proveedor');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientMode, setClientMode] = useState<ClientMode>('none');
  const [newClient, setNewClient] = useState<NewClientData>({ name: '', phone: '', email: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [saving, setSaving] = useState(false);

  const { clients } = useClients();
  const { suppliers } = useSuppliers();
  const { catalogs } = useCatalogs(selectedSupplier?.id);
  const { products } = useProducts(selectedCatalog?.id);

  // Pre-seleccionar cliente si viene de la ficha
  React.useEffect(() => {
    if (params.clientId && clients.length > 0) {
      const c = clients.find(c => c.id === params.clientId);
      if (c) { setSelectedClient(c); setClientMode('search'); }
    }
  }, [params.clientId, clients]);

  const filteredSuppliers = useMemo(() =>
    !search ? suppliers : suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
    [suppliers, search]
  );

  const filteredProducts = useMemo(() =>
    !search ? products : products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference ?? '').toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  );

  const filteredClients = useMemo(() =>
    !clientSearch ? clients : clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())),
    [clients, clientSearch]
  );

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(i => i.product.id !== productId);
      return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }

  function getQty(productId: string) {
    return cart.find(i => i.product.id === productId)?.quantity ?? 0;
  }

  function handleBack() {
    if (step === 'proveedor') { router.back(); return; }
    if (step === 'productos') { setStep('proveedor'); return; }
    if (step === 'carrito') { setStep('productos'); return; }
  }

  async function confirmOrder() {
    if (!agent || !selectedSupplier) return;
    const hasClient = selectedClient || (clientMode === 'new' && newClient.name.trim());
    if (!hasClient) {
      Alert.alert('Falta el cliente', 'Selecciona un cliente existente o introduce los datos del cliente nuevo.');
      return;
    }
    setSaving(true);

    let clientId: string | null = selectedClient?.id ?? null;

    // Crear cliente nuevo si es necesario
    if (clientMode === 'new' && newClient.name.trim()) {
      const { data: created, error: clientError } = await supabase
        .from('clients')
        .insert({
          agent_id: agent.id,
          name: newClient.name.trim(),
          phone: newClient.phone.trim() || null,
          email: newClient.email.trim() || null,
        })
        .select()
        .single();
      if (clientError || !created) {
        Alert.alert('Error', 'No se pudo crear el cliente.');
        setSaving(false);
        return;
      }
      clientId = created.id;
    }

    // Crear pedido
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        agent_id: agent.id,
        client_id: clientId,
        supplier_id: selectedSupplier.id,
        catalog_id: selectedCatalog?.id ?? null,
        status: 'confirmed',
        total: cartTotal,
        discount_code: discountCode || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error || !order) { Alert.alert('Error', error?.message ?? 'No se pudo crear el pedido'); setSaving(false); return; }

    // Insertar líneas
    await supabase.from('order_items').insert(
      cart.map(i => ({
        order_id: order.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price,
      }))
    );

    setSaving(false);
    router.replace(`/(agent)/pedido/${order.id}` as any);
  }

  const stepTitle = { proveedor: 'Selecciona proveedor', productos: 'Añade productos', carrito: 'Carrito' }[step];

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.back}>← {step === 'proveedor' ? 'Cancelar' : 'Atrás'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{stepTitle}</Text>
        {step !== 'carrito' && cart.length > 0 && (
          <TouchableOpacity onPress={() => setStep('carrito')}>
            <Text style={styles.cartBtn}>🛒 {cart.length}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        {(['proveedor', 'productos', 'carrito'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <Text style={[styles.crumb, step === s && styles.crumbActive]}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
            {i < 2 && <Text style={styles.crumbSep}>›</Text>}
          </React.Fragment>
        ))}
      </View>

      {/* PASO 1: Proveedor → Catálogo */}
      {step === 'proveedor' && (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar proveedor..." />
          <ScrollView contentContainerStyle={styles.listContent}>
            {!selectedSupplier ? (
              filteredSuppliers.map(s => (
                <TouchableOpacity key={s.id} style={styles.item} onPress={() => { setSelectedSupplier(s); setSearch(''); }}>
                  <View style={[styles.logo, { backgroundColor: colors.purpleLight }]}>
                    <Text style={{ color: colors.purpleDark, fontWeight: '500' }}>{s.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName}>{s.name}</Text>
                    <Text style={styles.itemSub}>{s.catalog_count ?? 0} catálogos</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))
            ) : (
              <>
                <TouchableOpacity style={styles.changeBtn} onPress={() => { setSelectedSupplier(null); setSelectedCatalog(null); }}>
                  <Text style={styles.changeBtnText}>← Cambiar proveedor ({selectedSupplier.name})</Text>
                </TouchableOpacity>
                {catalogs.filter(c => c.status === 'active').map(cat => (
                  <TouchableOpacity key={cat.id} style={styles.item} onPress={() => { setSelectedCatalog(cat); setSearch(''); setStep('productos'); }}>
                    <View style={[styles.logo, { backgroundColor: '#E6F1FB' }]}>
                      <Text style={{ fontSize: 16 }}>📋</Text>
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemName}>{cat.name}</Text>
                      <Text style={styles.itemSub}>{cat.product_count ?? 0} referencias</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* PASO 2: Productos */}
      {step === 'productos' && (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre o ref..." />
          <ScrollView contentContainerStyle={styles.listContent}>
            {filteredProducts.map(p => {
              const qty = getQty(p.id);
              return (
                <View key={p.id} style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productRef}>{p.reference} · {formatEur(p.price)}</Text>
                  </View>
                  <View style={styles.qtyControls}>
                    {qty > 0 && (
                      <>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(p.id)}>
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyVal}>{qty}</Text>
                      </>
                    )}
                    <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => addToCart(p)}>
                      <Text style={[styles.qtyBtnText, { color: colors.white }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          {cart.length > 0 && (
            <View style={styles.cartBar}>
              <Text style={styles.cartBarText}>{cart.length} producto{cart.length !== 1 ? 's' : ''} · {formatEur(cartTotal)}</Text>
              <TouchableOpacity style={styles.cartBarBtn} onPress={() => setStep('carrito')}>
                <Text style={styles.cartBarBtnText}>Ver carrito →</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* PASO 3: Carrito */}
      {step === 'carrito' && (
        <>
          <ScrollView contentContainerStyle={styles.cartContent}>
            {/* Resumen */}
            <View style={styles.cartSummaryCard}>
              <Text style={styles.cartSummaryTitle}>{selectedSupplier?.name} · {selectedCatalog?.name}</Text>
              <Text style={styles.cartSummarySub}>{cart.length} productos · {cart.reduce((s, i) => s + i.quantity, 0)} unidades</Text>
            </View>

            {/* Sección cliente */}
            <View style={styles.clientSection}>
              <Text style={styles.clientSectionTitle}>Cliente</Text>

              {/* Sin cliente seleccionado — botones de opción */}
              {clientMode === 'none' && (
                <View style={styles.clientOptions}>
                  <TouchableOpacity style={styles.clientOptBtn} onPress={() => setClientMode('search')}>
                    <Text style={styles.clientOptBtnText}>👤 Cliente existente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.clientOptBtn, styles.clientOptBtnNew]} onPress={() => setClientMode('new')}>
                    <Text style={[styles.clientOptBtnText, { color: colors.purple }]}>+ Cliente nuevo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Buscar cliente existente */}
              {clientMode === 'search' && !selectedClient && (
                <View style={styles.clientSearchWrap}>
                  <TextInput
                    style={styles.clientSearchInput}
                    placeholder="Buscar cliente..."
                    placeholderTextColor={colors.textMuted}
                    value={clientSearch}
                    onChangeText={setClientSearch}
                    autoFocus
                  />
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {filteredClients.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.clientSearchItem}
                        onPress={() => { setSelectedClient(c); setClientSearch(''); }}
                      >
                        <Avatar name={c.name} size={28} fontSize={11} />
                        <Text style={styles.clientSearchName}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity onPress={() => setClientMode('none')}>
                    <Text style={styles.clientCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Cliente seleccionado */}
              {clientMode === 'search' && selectedClient && (
                <View style={styles.clientSelectedBanner}>
                  <Avatar name={selectedClient.name} size={28} fontSize={11} />
                  <Text style={styles.clientSelectedName}>{selectedClient.name}</Text>
                  <TouchableOpacity onPress={() => { setSelectedClient(null); setClientMode('none'); }}>
                    <Text style={styles.clientChangeText}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Formulario cliente nuevo */}
              {clientMode === 'new' && (
                <View style={styles.newClientForm}>
                  <TextInput
                    style={styles.newClientInput}
                    placeholder="Nombre del cliente *"
                    placeholderTextColor={colors.textMuted}
                    value={newClient.name}
                    onChangeText={v => setNewClient(p => ({ ...p, name: v }))}
                  />
                  <TextInput
                    style={styles.newClientInput}
                    placeholder="Teléfono (opcional)"
                    placeholderTextColor={colors.textMuted}
                    value={newClient.phone}
                    onChangeText={v => setNewClient(p => ({ ...p, phone: v }))}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={styles.newClientInput}
                    placeholder="Email (opcional)"
                    placeholderTextColor={colors.textMuted}
                    value={newClient.email}
                    onChangeText={v => setNewClient(p => ({ ...p, email: v }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => { setClientMode('none'); setNewClient({ name: '', phone: '', email: '' }); }}>
                    <Text style={styles.clientCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Líneas del carrito */}
            {cart.map(item => (
              <View key={item.product.id} style={styles.cartLine}>
                <View style={styles.cartLineInfo}>
                  <Text style={styles.cartLineName}>{item.product.name}</Text>
                  <Text style={styles.cartLineRef}>{item.product.reference} · {formatEur(item.product.price)}/ud</Text>
                </View>
                <View style={styles.cartLineRight}>
                  <Text style={styles.cartLineQty}>x{item.quantity}</Text>
                  <Text style={styles.cartLineTotal}>{formatEur(item.product.price * item.quantity)}</Text>
                </View>
              </View>
            ))}

            {/* Código descuento */}
            <View style={styles.discRow}>
              <TextInput
                style={styles.discInput}
                placeholder="Código descuento"
                placeholderTextColor={colors.textMuted}
                value={discountCode}
                onChangeText={setDiscountCode}
              />
              <TouchableOpacity style={styles.discBtn}>
                <Text style={styles.discBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>

            {/* Observaciones */}
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Observaciones, instrucciones de entrega..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* Total y botón confirmar */}
          <View style={styles.totalBar}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} uds.)</Text>
              <Text style={styles.totalValue}>{formatEur(cartTotal)}</Text>
            </View>
            <View style={styles.totalFinal}>
              <Text style={styles.totalFinalLabel}>Total pedido</Text>
              <Text style={styles.totalFinalValue}>{formatEur(cartTotal)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
              onPress={confirmOrder}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.confirmBtnText}>Confirmar y generar PDF</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.searchWrap}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
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
  },
  back: { fontSize: 14, color: colors.purple, marginRight: 10 },
  title: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  cartBtn: { fontSize: 14, color: colors.purple, fontWeight: '500' },
  breadcrumb: {
    backgroundColor: colors.white,
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#efefef',
  },
  crumb: { fontSize: 11, color: colors.textMuted },
  crumbActive: { color: colors.purple, fontWeight: '500' },
  crumbSep: { fontSize: 11, color: '#ccc', marginHorizontal: 4 },
  searchWrap: {
    backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 9,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#efefef', gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1, fontSize: 14, color: colors.text,
    backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  listContent: { padding: 12, gap: 8 },
  item: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: colors.text },
  itemSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 18, color: '#ccc' },
  changeBtn: { padding: 12, paddingBottom: 0 },
  changeBtnText: { fontSize: 13, color: colors.purple },
  productRow: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '500', color: colors.text },
  productRef: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 9,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnAdd: { backgroundColor: colors.purple, borderColor: colors.purple },
  qtyBtnText: { fontSize: 18, color: colors.purple, lineHeight: 20 },
  qtyVal: { fontSize: 16, fontWeight: '500', color: colors.text, minWidth: 20, textAlign: 'center' },
  cartBar: {
    backgroundColor: colors.white, borderTopWidth: 0.5, borderTopColor: '#efefef',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  cartBarText: { fontSize: 13, fontWeight: '500', color: colors.text },
  cartBarBtn: { backgroundColor: colors.purple, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  cartBarBtnText: { color: colors.white, fontSize: 13, fontWeight: '500' },
  cartContent: { padding: 12, gap: 8 },
  cartSummaryCard: {
    backgroundColor: colors.purpleLight, borderRadius: 12,
    padding: 12, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 4,
  },
  cartSummaryTitle: { fontSize: 12, fontWeight: '500', color: colors.purpleDark },
  cartSummarySub: { fontSize: 11, color: colors.purple },

  // Cliente
  clientSection: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 14, gap: 10,
  },
  clientSectionTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  clientOptions: { flexDirection: 'row', gap: 8 },
  clientOptBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center',
  },
  clientOptBtnNew: { borderColor: colors.purple, borderStyle: 'dashed' },
  clientOptBtnText: { fontSize: 13, fontWeight: '500', color: colors.text },
  clientSearchWrap: { gap: 8 },
  clientSearchInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: colors.text, backgroundColor: colors.bg,
  },
  clientSearchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  clientSearchName: { fontSize: 13, color: colors.text },
  clientSelectedBanner: {
    backgroundColor: colors.greenLight, borderRadius: 10,
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  clientSelectedName: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.green },
  clientChangeText: { fontSize: 12, color: colors.green, fontWeight: '500' },
  clientCancelText: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  newClientForm: { gap: 8 },
  newClientInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: colors.text, backgroundColor: colors.bg,
  },

  cartLine: {
    backgroundColor: colors.white, borderRadius: 10,
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  cartLineInfo: { flex: 1 },
  cartLineName: { fontSize: 12, fontWeight: '500', color: colors.text },
  cartLineRef: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  cartLineRight: { alignItems: 'flex-end' },
  cartLineQty: { fontSize: 10, color: colors.textMuted },
  cartLineTotal: { fontSize: 12, fontWeight: '500', color: colors.text, marginTop: 2 },
  discRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: colors.white, borderRadius: 10, padding: 10,
  },
  discInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6,
    fontSize: 12, color: colors.text, backgroundColor: colors.bg,
  },
  discBtn: { paddingHorizontal: 12, borderRadius: 7, backgroundColor: colors.purple, justifyContent: 'center' },
  discBtnText: { fontSize: 11, fontWeight: '500', color: colors.white },
  notesInput: {
    backgroundColor: colors.white, borderRadius: 10,
    padding: 10, fontSize: 12, color: colors.text,
    minHeight: 60, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.border,
  },
  totalBar: {
    backgroundColor: colors.white,
    borderTopWidth: 0.5, borderTopColor: '#efefef',
    padding: 14,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  totalLabel: { fontSize: 11, color: colors.textMuted },
  totalValue: { fontSize: 11, fontWeight: '500', color: colors.text },
  totalFinal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    borderTopWidth: 0.5, borderTopColor: colors.borderLight,
    marginTop: 7, paddingTop: 7, marginBottom: 10,
  },
  totalFinalLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  totalFinalValue: { fontSize: 20, fontWeight: '500', color: colors.purple },
  confirmBtn: {
    backgroundColor: colors.purple, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#d0cce8' },
  confirmBtnText: { color: colors.white, fontSize: 15, fontWeight: '500' },
});
