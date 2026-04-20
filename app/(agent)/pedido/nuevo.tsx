// A-07 · Nuevo pedido — flujo:
// 0. Elegir modo cliente  1. Proveedor/catálogo  2. Productos  3. Carrito + confirmar
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Image, FlatList, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import Avatar from '@/components/Avatar';
import { useClients, useSuppliers, useCatalogs, useProducts, useAgent } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
import type { Client, Supplier, Catalog, Product } from '@/hooks/useAgent';

type Step = 'modo' | 'proveedor' | 'productos' | 'carrito';
type ClientMode = 'existing' | 'new_now' | 'new_later';

interface CartItem { product: Product; quantity: number; }
interface NewClientData { name: string; phone: string; email: string; address: string; }
interface ClientAddress { id: string; label: string; address?: string; city?: string; postal_code?: string; }

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function NuevoPedidoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const { agent } = useAgent();

  const [step, setStep] = useState<Step>(params.clientId ? 'proveedor' : 'modo');
  const [clientMode, setClientMode] = useState<ClientMode | null>(params.clientId ? 'existing' : null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [newClientNow, setNewClientNow] = useState<NewClientData>({ name: '', phone: '', email: '', address: '' });
  const [newClientLater, setNewClientLater] = useState<NewClientData>({ name: '', phone: '', email: '', address: '' });
  const [clientAddresses, setClientAddresses] = useState<ClientAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageViewer, setImageViewer] = useState<string | null>(null);

  const { clients } = useClients();
  const { suppliers } = useSuppliers();
  const { catalogs } = useCatalogs(selectedSupplier?.id);
  const { products } = useProducts(selectedCatalog?.id);

  // Pre-seleccionar cliente si viene de la ficha
  React.useEffect(() => {
    if (params.clientId && clients.length > 0) {
      const c = clients.find(c => c.id === params.clientId);
      if (c) {
        setSelectedClient(c);
        setClientMode('existing');
        loadAddresses(c.id);
      }
    }
  }, [params.clientId, clients]);

  async function loadAddresses(clientId: string) {
    const { data } = await supabase
      .from('client_addresses')
      .select('id, label, address, city, postal_code')
      .eq('client_id', clientId)
      .order('is_default', { ascending: false });
    const addrs = (data as ClientAddress[]) ?? [];
    setClientAddresses(addrs);
    if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
  }

  function selectClient(c: Client) {
    setSelectedClient(c);
    setShowClientSearch(false);
    setClientSearch('');
    loadAddresses(c.id);
  }

  const filteredClients = useMemo(() =>
    !clientSearch ? clients : clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())),
    [clients, clientSearch]
  );

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

  async function confirmNewClientNow() {
    if (!newClientNow.name.trim()) { Alert.alert('El nombre es obligatorio'); return; }
    if (!agent) return;
    const { data, error } = await supabase.from('clients').insert({
      agent_id: agent.id,
      name: newClientNow.name.trim(),
      phone: newClientNow.phone.trim() || null,
      email: newClientNow.email.trim() || null,
      address: newClientNow.address.trim() || null }).select().single();
    if (error || !data) { Alert.alert('Error', 'No se pudo crear el cliente'); return; }
    setSelectedClient(data as Client);
    setClientMode('existing');
    setStep('proveedor');
  }

  async function confirmOrder() {
    if (!agent || !selectedSupplier) return;
    setSaving(true);

    let clientId: string | null = selectedClient?.id ?? null;

    if (clientMode === 'new_later' && newClientLater.name.trim()) {
      const { data, error } = await supabase.from('clients').insert({
        agent_id: agent.id,
        name: newClientLater.name.trim(),
        phone: newClientLater.phone.trim() || null,
        email: newClientLater.email.trim() || null,
        address: newClientLater.address.trim() || null }).select().single();
      if (error || !data) { Alert.alert('Error', 'No se pudo crear el cliente'); setSaving(false); return; }
      clientId = (data as any).id;
    }

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
        shipping_address_id: selectedAddressId || null })
      .select()
      .single();

    if (error || !order) { Alert.alert('Error', error?.message ?? 'No se pudo crear el pedido'); setSaving(false); return; }

    await supabase.from('order_items').insert(
      cart.map(i => ({
        order_id: order.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price }))
    );

    setSaving(false);
    router.replace(`/(agent)/pedido/${order.id}` as any);
  }

  const selectedAddress = clientAddresses.find(a => a.id === selectedAddressId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => {
          if (step === 'modo') { router.back(); return; }
          if (step === 'proveedor') { setStep('modo'); return; }
          if (step === 'productos') { setStep('proveedor'); return; }
          if (step === 'carrito') { setStep('productos'); return; }
        }}>
          <Text style={styles.back}>← {step === 'modo' ? 'Cancelar' : 'Atrás'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {{ modo: 'Nuevo pedido', proveedor: 'Proveedor', productos: 'Productos', carrito: 'Carrito' }[step]}
        </Text>
        {step !== 'carrito' && step !== 'modo' && cart.length > 0 && (
          <TouchableOpacity onPress={() => setStep('carrito')}>
            <Text style={styles.cartBtn}>🛒 {cart.length}</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* PASO 0: Elegir modo cliente */}
      {step === 'modo' && (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modoContent}>
          <Text style={styles.modoTitle}>¿Cómo quieres empezar?</Text>

          {/* Opción 1: Cliente existente */}
          <TouchableOpacity style={styles.modoCard} onPress={() => { setClientMode('existing'); setShowClientSearch(true); }}>
            <View style={[styles.modoIcon, { backgroundColor: colors.brandLight }]}>
              <Text style={styles.modoIconText}>👤</Text>
            </View>
            <View style={styles.modoBody}>
              <Text style={styles.modoCardTitle}>Cliente existente</Text>
              <Text style={styles.modoCardSub}>Selecciona un cliente de tu lista</Text>
            </View>
            <Text style={styles.modoChevron}>›</Text>
          </TouchableOpacity>

          {showClientSearch && (
            <View style={styles.clientSearchBox}>
              <TextInput
                style={styles.clientSearchInput}
                placeholder="Buscar cliente..."
                placeholderTextColor={colors.textMuted}
                value={clientSearch}
                onChangeText={setClientSearch}
                autoFocus
              />
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }} nestedScrollEnabled>
                {filteredClients.map(c => (
                  <TouchableOpacity key={c.id} style={styles.clientSearchItem} onPress={() => { selectClient(c); setStep('proveedor'); }}>
                    <Avatar name={c.name} size={28} fontSize={11} />
                    <Text style={styles.clientSearchName}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setShowClientSearch(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Opción 2: Dar de alta cliente nuevo ahora */}
          <TouchableOpacity
            style={styles.modoCard}
            onPress={() => setClientMode(clientMode === 'new_now' ? null : 'new_now')}
          >
            <View style={[styles.modoIcon, { backgroundColor: '#E6F7EF' }]}>
              <Text style={styles.modoIconText}>➕</Text>
            </View>
            <View style={styles.modoBody}>
              <Text style={styles.modoCardTitle}>Dar de alta cliente nuevo</Text>
              <Text style={styles.modoCardSub}>Crea el cliente antes de empezar el pedido</Text>
            </View>
            <Text style={styles.modoChevron}>›</Text>
          </TouchableOpacity>

          {clientMode === 'new_now' && (
            <View style={styles.newClientForm}>
              <TextInput style={styles.newClientInput} placeholder="Nombre *" placeholderTextColor={colors.textMuted} value={newClientNow.name} onChangeText={v => setNewClientNow(p => ({ ...p, name: v }))} />
              <TextInput style={styles.newClientInput} placeholder="Teléfono" placeholderTextColor={colors.textMuted} value={newClientNow.phone} onChangeText={v => setNewClientNow(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
              <TextInput style={styles.newClientInput} placeholder="Email" placeholderTextColor={colors.textMuted} value={newClientNow.email} onChangeText={v => setNewClientNow(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" />
              <TextInput style={styles.newClientInput} placeholder="Dirección" placeholderTextColor={colors.textMuted} value={newClientNow.address} onChangeText={v => setNewClientNow(p => ({ ...p, address: v }))} />
              <TouchableOpacity style={styles.confirmNewClientBtn} onPress={confirmNewClientNow}>
                <Text style={styles.confirmNewClientBtnText}>Crear cliente y continuar →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Opción 3: Empezar sin cliente */}
          <TouchableOpacity style={styles.modoCard} onPress={() => { setClientMode('new_later'); setStep('proveedor'); }}>
            <View style={[styles.modoIcon, { backgroundColor: '#FAEEDA' }]}>
              <Text style={styles.modoIconText}>📋</Text>
            </View>
            <View style={styles.modoBody}>
              <Text style={styles.modoCardTitle}>Empezar sin cliente</Text>
              <Text style={styles.modoCardSub}>Añade los datos del cliente al finalizar el pedido</Text>
            </View>
            <Text style={styles.modoChevron}>›</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PASO 1: Proveedor → Catálogo */}
      {step === 'proveedor' && (
        <>
          {selectedClient && (
            <View style={styles.clientBanner}>
              <Avatar name={selectedClient.name} size={22} fontSize={9} />
              <Text style={styles.clientBannerText}>{selectedClient.name}</Text>
              <TouchableOpacity onPress={() => setStep('modo')}>
                <Text style={styles.clientBannerChange}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          )}
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar proveedor..." />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent}>
            {!selectedSupplier ? (
              filteredSuppliers.map(s => (
                <TouchableOpacity key={s.id} style={styles.item} onPress={() => { setSelectedSupplier(s); setSearch(''); }}>
                  <View style={[styles.logo, { backgroundColor: colors.brandLight }]}>
                    <Text style={{ color: colors.brandDark, fontWeight: '500' }}>{s.name.charAt(0)}</Text>
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
          <FlatList
            data={filteredProducts}
            keyExtractor={p => p.id}
            numColumns={2}
            contentContainerStyle={styles.productGrid}
            columnWrapperStyle={styles.productGridRow}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item: p }) => {
              const qty = getQty(p.id);
              const inCart = qty > 0;
              return (
                <View style={[styles.productCard, inCart && styles.productCardActive]}>
                  {/* Imagen */}
                  <TouchableOpacity
                    style={styles.productCardImg}
                    onPress={() => p.image_url && setImageViewer(p.image_url)}
                    activeOpacity={p.image_url ? 0.85 : 1}
                  >
                    {p.image_url ? (
                      <Image source={{ uri: p.image_url }} style={styles.productCardImgEl} resizeMode="contain" />
                    ) : (
                      <Text style={styles.productCardEmoji}>📦</Text>
                    )}
                    {inCart && (
                      <View style={styles.productCartBadge}>
                        <Text style={styles.productCartBadgeText}>{qty}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Info */}
                  <View style={styles.productCardBody}>
                    <Text style={styles.productCardName} numberOfLines={2}>{p.name}</Text>
                    {p.reference ? <Text style={styles.productCardRef}>Ref. {p.reference}</Text> : null}
                    {(p.familia || p.subfamilia) ? (
                      <Text style={styles.productCardFamilia} numberOfLines={1}>
                        {[p.familia, p.subfamilia].filter(Boolean).join(' › ')}
                      </Text>
                    ) : null}
                    <Text style={styles.productCardPrice}>{formatEur(p.price)}</Text>
                    {p.stock != null ? <Text style={styles.productCardStock}>Stock: {p.stock}</Text> : null}
                  </View>

                  {/* Controles qty */}
                  <View style={styles.productCardQty}>
                    {inCart ? (
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={styles.qtyBtnSm} onPress={() => removeFromCart(p.id)}>
                          <Text style={styles.qtyBtnSmText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValSm}>{qty}</Text>
                        <TouchableOpacity style={[styles.qtyBtnSm, styles.qtyBtnSmAdd]} onPress={() => addToCart(p)}>
                          <Text style={[styles.qtyBtnSmText, { color: '#fff' }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.addBtnCard} onPress={() => addToCart(p)}>
                        <Text style={styles.addBtnCardText}>+ Añadir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
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
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cartContent}>
            {/* Resumen proveedor */}
            <View style={styles.cartSummaryCard}>
              <Text style={styles.cartSummaryTitle}>{selectedSupplier?.name} · {selectedCatalog?.name}</Text>
              <Text style={styles.cartSummarySub}>{cart.length} productos · {cart.reduce((s, i) => s + i.quantity, 0)} unidades</Text>
            </View>

            {/* Cliente */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              {clientMode === 'existing' && selectedClient && (
                <View style={styles.clientSelectedRow}>
                  <Avatar name={selectedClient.name} size={28} fontSize={11} />
                  <Text style={styles.clientSelectedName}>{selectedClient.name}</Text>
                  <TouchableOpacity onPress={() => setStep('modo')}>
                    <Text style={styles.changeLink}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {clientMode === 'new_later' && (
                <View style={styles.newClientLaterForm}>
                  <TextInput style={styles.newClientInput} placeholder="Nombre del cliente *" placeholderTextColor={colors.textMuted} value={newClientLater.name} onChangeText={v => setNewClientLater(p => ({ ...p, name: v }))} />
                  <TextInput style={styles.newClientInput} placeholder="Teléfono" placeholderTextColor={colors.textMuted} value={newClientLater.phone} onChangeText={v => setNewClientLater(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
                  <TextInput style={styles.newClientInput} placeholder="Email" placeholderTextColor={colors.textMuted} value={newClientLater.email} onChangeText={v => setNewClientLater(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" />
                  <TextInput style={styles.newClientInput} placeholder="Dirección" placeholderTextColor={colors.textMuted} value={newClientLater.address} onChangeText={v => setNewClientLater(p => ({ ...p, address: v }))} />
                </View>
              )}
            </View>

            {/* Dirección de envío — solo si hay cliente existente con direcciones */}
            {clientMode === 'existing' && clientAddresses.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Dirección de envío</Text>
                <TouchableOpacity style={styles.addressPicker} onPress={() => setShowAddressPicker(true)}>
                  <View style={styles.addressPickerBody}>
                    <Text style={styles.addressPickerLabel}>{selectedAddress?.label ?? 'Seleccionar dirección'}</Text>
                    {selectedAddress?.address && <Text style={styles.addressPickerSub}>{selectedAddress.address}{selectedAddress.city ? `, ${selectedAddress.city}` : ''}</Text>}
                  </View>
                  <Text style={styles.addressPickerChevron}>▾</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Líneas */}
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
              <TextInput style={styles.discInput} placeholder="Código descuento" placeholderTextColor={colors.textMuted} value={discountCode} onChangeText={setDiscountCode} />
              <TouchableOpacity style={styles.discBtn}><Text style={styles.discBtnText}>Aplicar</Text></TouchableOpacity>
            </View>

            {/* Observaciones */}
            <TextInput style={styles.notesInput} multiline placeholder="Observaciones, instrucciones de entrega..." placeholderTextColor={colors.textMuted} value={notes} onChangeText={setNotes} />
          </ScrollView>

          {/* Total y confirmar */}
          <View style={styles.totalBar}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} uds.)</Text>
              <Text style={styles.totalValue}>{formatEur(cartTotal)}</Text>
            </View>
            <View style={styles.totalFinal}>
              <Text style={styles.totalFinalLabel}>Total pedido</Text>
              <Text style={styles.totalFinalValue}>{formatEur(cartTotal)}</Text>
            </View>
            <TouchableOpacity style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]} onPress={confirmOrder} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.confirmBtnText}>Confirmar y generar PDF</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Visor de imagen */}
      <Modal visible={!!imageViewer} transparent animationType="fade" onRequestClose={() => setImageViewer(null)}>
        <TouchableOpacity style={styles.imgViewerOverlay} activeOpacity={1} onPress={() => setImageViewer(null)}>
          <View style={styles.imgViewerBox}>
            {imageViewer && (
              <Image source={{ uri: imageViewer }} style={styles.imgViewerImg} resizeMode="contain" />
            )}
            <TouchableOpacity style={styles.imgViewerClose} onPress={() => setImageViewer(null)}>
              <Text style={styles.imgViewerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal selector de dirección */}
      <Modal visible={showAddressPicker} transparent animationType="slide" onRequestClose={() => setShowAddressPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Seleccionar dirección</Text>
            {clientAddresses.map(addr => (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addrOption, selectedAddressId === addr.id && styles.addrOptionSelected]}
                onPress={() => { setSelectedAddressId(addr.id); setShowAddressPicker(false); }}
              >
                <Text style={[styles.addrOptionLabel, selectedAddressId === addr.id && styles.addrOptionLabelSelected]}>{addr.label}</Text>
                {addr.address && <Text style={styles.addrOptionSub}>{addr.address}{addr.city ? `, ${addr.city}` : ''}</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddressPicker(false)}>
              <Text style={styles.modalCancelText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.searchWrap}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput style={styles.searchInput} placeholder={placeholder} placeholderTextColor={colors.textMuted} value={value} onChangeText={onChangeText} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.dark, paddingHorizontal: 18, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  back: { fontSize: 14, color: '#ffffff', marginRight: 10 },
  title: { flex: 1, fontSize: 16, fontWeight: '500', color: '#ffffff' },
  cartBtn: { fontSize: 14, color: '#ffffff', fontWeight: '500' },

  // Modo cliente
  modoContent: { padding: 16, gap: 12 },
  modoTitle: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 4 },
  modoCard: {
    backgroundColor: colors.white, borderRadius: 14,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: colors.border },
  modoIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modoIconText: { fontSize: 20 },
  modoBody: { flex: 1 },
  modoCardTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  modoCardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modoChevron: { fontSize: 20, color: '#ccc' },
  clientSearchBox: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 12, gap: 8, borderWidth: 1, borderColor: colors.border },
  clientSearchInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.bg },
  clientSearchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  clientSearchName: { fontSize: 13, color: colors.text },
  cancelText: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  newClientForm: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 12, gap: 8, borderWidth: 1, borderColor: colors.border },
  newClientLaterForm: { gap: 8, marginTop: 8 },
  newClientInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.bg },
  confirmNewClientBtn: {
    backgroundColor: colors.brand, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center', marginTop: 4 },
  confirmNewClientBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },

  // Proveedor
  clientBanner: {
    backgroundColor: colors.brandLight, paddingHorizontal: 16, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientBannerText: { flex: 1, fontSize: 12, fontWeight: '500', color: colors.brandDark },
  clientBannerChange: { fontSize: 12, color: colors.brand },
  searchWrap: {
    backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 9,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#efefef', gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1, fontSize: 14, color: colors.text, backgroundColor: colors.bg,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border },
  listContent: { padding: 12, gap: 8 },
  item: { backgroundColor: colors.white, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: colors.text },
  itemSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 18, color: '#ccc' },
  changeBtn: { padding: 12, paddingBottom: 0 },
  changeBtnText: { fontSize: 13, color: colors.brand },

  // Productos grid
  productGrid: { padding: 10, paddingBottom: 80 },
  productGridRow: { gap: 10, marginBottom: 10 },
  productCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14,
    overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
  productCardActive: { borderColor: colors.brand },
  productCardImg: {
    height: 120, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center' },
  productCardImgEl: { width: '100%', height: '100%' },
  productCardEmoji: { fontSize: 36 },
  productCartBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: colors.brand, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4 },
  productCartBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  productCardBody: { padding: 8, gap: 2 },
  productCardName: { fontSize: 12, fontWeight: '500', color: colors.text, lineHeight: 16 },
  productCardRef: { fontSize: 10, color: colors.textMuted },
  productCardFamilia: { fontSize: 10, color: colors.brand },
  productCardPrice: { fontSize: 13, fontWeight: '600', color: colors.brand, marginTop: 2 },
  productCardStock: { fontSize: 10, color: colors.textMuted },
  productCardQty: { paddingHorizontal: 8, paddingBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
  qtyBtnSm: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  qtyBtnSmAdd: { backgroundColor: colors.brand },
  qtyBtnSmText: { fontSize: 16, color: colors.text, lineHeight: 18 },
  qtyValSm: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '500', color: colors.text },
  addBtnCard: {
    backgroundColor: colors.brand, borderRadius: 8,
    paddingVertical: 7, alignItems: 'center' },
  addBtnCardText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  // Visor imagen
  imgViewerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center' },
  imgViewerBox: { width: SCREEN_WIDTH - 32, aspectRatio: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  imgViewerImg: { width: '100%', height: '100%' },
  imgViewerClose: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  imgViewerCloseText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cartBar: {
    backgroundColor: colors.white, borderTopWidth: 0.5, borderTopColor: '#efefef',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12 },
  cartBarText: { fontSize: 13, fontWeight: '500', color: colors.text },
  cartBarBtn: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  cartBarBtnText: { color: colors.white, fontSize: 13, fontWeight: '500' },

  // Carrito
  cartContent: { padding: 12, gap: 8 },
  cartSummaryCard: {
    backgroundColor: colors.brandLight, borderRadius: 12, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  cartSummaryTitle: { fontSize: 12, fontWeight: '500', color: colors.brandDark },
  cartSummarySub: { fontSize: 11, color: colors.brand },
  sectionCard: { backgroundColor: colors.white, borderRadius: 12, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  clientSelectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientSelectedName: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.text },
  changeLink: { fontSize: 12, color: colors.brand },
  addressPicker: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center' },
  addressPickerBody: { flex: 1 },
  addressPickerLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  addressPickerSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  addressPickerChevron: { fontSize: 16, color: colors.textMuted },
  cartLine: { backgroundColor: colors.white, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartLineInfo: { flex: 1 },
  cartLineName: { fontSize: 12, fontWeight: '500', color: colors.text },
  cartLineRef: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  cartLineRight: { alignItems: 'flex-end' },
  cartLineQty: { fontSize: 10, color: colors.textMuted },
  cartLineTotal: { fontSize: 12, fontWeight: '500', color: colors.text, marginTop: 2 },
  discRow: { flexDirection: 'row', gap: 8, backgroundColor: colors.white, borderRadius: 10, padding: 10 },
  discInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6, fontSize: 12, color: colors.text, backgroundColor: colors.bg },
  discBtn: { paddingHorizontal: 12, borderRadius: 7, backgroundColor: colors.brand, justifyContent: 'center' },
  discBtnText: { fontSize: 11, fontWeight: '500', color: colors.white },
  notesInput: { backgroundColor: colors.white, borderRadius: 10, padding: 10, fontSize: 12, color: colors.text, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
  totalBar: { backgroundColor: colors.white, borderTopWidth: 0.5, borderTopColor: '#efefef', padding: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  totalLabel: { fontSize: 11, color: colors.textMuted },
  totalValue: { fontSize: 11, fontWeight: '500', color: colors.text },
  totalFinal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 0.5, borderTopColor: colors.borderLight, marginTop: 7, paddingTop: 7, marginBottom: 10 },
  totalFinalLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  totalFinalValue: { fontSize: 20, fontWeight: '500', color: colors.brand },
  confirmBtn: { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: '#d0cce8' },
  confirmBtnText: { color: colors.white, fontSize: 15, fontWeight: '500' },

  // Modal dirección
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 4 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  addrOption: { padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8 },
  addrOptionSelected: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  addrOptionLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  addrOptionLabelSelected: { color: colors.brandDark },
  addrOptionSub: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  modalCancel: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  modalCancelText: { fontSize: 14, color: colors.textMuted } });
