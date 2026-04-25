// A-07 · Nuevo pedido — flujo:
// 0. Elegir modo cliente  1. Proveedor/catálogo  2. Productos  3. Carrito + confirmar
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, ScrollView, Pressable,
  StyleSheet, TextInput, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Image, FlatList, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Button, Icon, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';
import { useClients, useSuppliers, useCatalogs, useProducts, useAgent, useOrders } from '@/hooks/useAgent';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import type { Client, Supplier, Catalog, Product, Order } from '@/hooks/useAgent';

type Step = 'inicio' | 'modo' | 'proveedor' | 'productos' | 'carrito';
type ClientMode = 'existing' | 'new_now' | 'new_later';

interface CartItem { product: Product; quantity: number; }
interface NewClientData { name: string; phone: string; email: string; address: string; }
interface ClientAddress { id: string; label: string; address?: string; city?: string; postal_code?: string; }

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatRelativeTime(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'hace instantes';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `hace ${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'ayer';
  if (diffDay < 7) return `hace ${diffDay} días`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function NuevoPedidoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; draftId?: string; edit?: string }>();
  const { agent } = useAgent();
  const toast = useToast();

  const [step, setStep] = useState<Step>(params.clientId ? 'proveedor' : 'inicio');
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
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [imageViewer, setImageViewer] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const { clients } = useClients();
  const { orders: drafts, loading: draftsLoading, deleteOrder, refetch: refetchDrafts } = useOrders('draft');
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

  // Cargar borrador al montar si viene con draftId
  React.useEffect(() => {
    if (params.draftId) loadDraft(params.draftId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refs para acceder al estado actual desde el cleanup al desmontar
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const supplierRef = useRef(selectedSupplier);
  supplierRef.current = selectedSupplier;
  const draftIdRef = useRef(currentDraftId);
  draftIdRef.current = currentDraftId;

  async function loadDraft(dId: string) {
    const { data: order } = await supabase
      .from('orders')
      .select(`*, client:clients(id, name, phone, email, address), supplier:suppliers(*), catalog:catalogs(*)`)
      .eq('id', dId)
      .eq('status', 'draft')
      .single();
    if (!order) return;
    setCurrentDraftId(dId);
    if (order.notes) setNotes(order.notes);
    if (order.discount_code) setDiscountCode(order.discount_code);
    if (order.supplier) setSelectedSupplier(order.supplier as Supplier);
    if (order.catalog) setSelectedCatalog(order.catalog as Catalog);
    if (order.client) {
      setSelectedClient(order.client as Client);
      setClientMode('existing');
      loadAddresses((order.client as any).id);
    } else {
      setClientMode('new_later');
    }
    const { data: items } = await supabase
      .from('order_items')
      .select(`*, product:products(*)`)
      .eq('order_id', dId);
    if (items && items.length > 0) {
      const cartItems: CartItem[] = items
        .filter(i => i.product)
        .map(i => ({ product: i.product as Product, quantity: i.quantity }));
      setCart(cartItems);
    }
    setStep(params.edit === '1' ? 'productos' : 'carrito');
  }

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

  const baseImponible = useMemo(
    () => cart.reduce((s, i) => s + i.product.price * i.quantity, 0),
    [cart]
  );

  const vatBreakdown = useMemo(() => {
    const groups = new Map<string, { rate: number | null; vatAmount: number }>();
    for (const item of cart) {
      const rate = item.product.vat_rate ?? null;
      const key = rate === null ? 'exento' : String(rate);
      const lineVat = rate === null || rate === 0 ? 0 : item.product.price * item.quantity * rate / 100;
      if (!groups.has(key)) groups.set(key, { rate, vatAmount: 0 });
      groups.get(key)!.vatAmount += lineVat;
    }
    return Array.from(groups.values())
      .filter(g => g.vatAmount > 0)
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }, [cart]);

  const totalIva = useMemo(
    () => vatBreakdown.reduce((s, g) => s + g.vatAmount, 0),
    [vatBreakdown]
  );

  const cartTotal = baseImponible + totalIva;

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
    if (!newClientNow.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!agent) return;
    const { data, error } = await supabase.from('clients').insert({
      agent_id: agent.id,
      name: newClientNow.name.trim(),
      phone: newClientNow.phone.trim() || null,
      email: newClientNow.email.trim() || null,
      address: newClientNow.address.trim() || null }).select().single();
    if (error || !data) { toast.error('No se pudo crear el cliente'); return; }
    setSelectedClient(data as Client);
    setClientMode('existing');
    setStep('proveedor');
  }

  // Guardado silencioso (autosave). No toca `saving` para no interferir con la UI.
  const saveDraftSilently = useCallback(async (): Promise<string | null> => {
    if (!agent || !selectedSupplier) return null;
    const draftData = {
      agent_id: agent.id,
      client_id: selectedClient?.id ?? null,
      supplier_id: selectedSupplier.id,
      catalog_id: selectedCatalog?.id ?? null,
      status: 'draft' as const,
      total: cartTotal,
      notes: notes || null,
      discount_code: discountCode || null,
    };
    let orderId = currentDraftId;
    if (orderId) {
      await supabase.from('orders').update(draftData).eq('id', orderId);
      await supabase.from('order_items').delete().eq('order_id', orderId);
    } else {
      const { data } = await supabase.from('orders').insert(draftData).select().single();
      orderId = (data as any)?.id ?? null;
      if (orderId) setCurrentDraftId(orderId);
    }
    if (orderId && cart.length > 0) {
      await supabase.from('order_items').insert(
        cart.map(i => ({
          order_id: orderId,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.product.price,
        }))
      );
    }
    return orderId;
  }, [agent, selectedSupplier, selectedClient, selectedCatalog, cart, cartTotal, notes, discountCode, currentDraftId]);

  // Mantengo `saveDraft` como wrapper para compatibilidad (llamadas explícitas).
  async function saveDraft(): Promise<string | null> {
    setSaving(true);
    try { return await saveDraftSilently(); }
    finally { setSaving(false); }
  }

  // Autosave con debounce: dispara 1.5s después del último cambio relevante.
  // Solo guarda si hay proveedor + al menos 1 producto → así no crea drafts vacíos.
  useEffect(() => {
    if (!agent || !selectedSupplier || cart.length === 0) return;
    setAutoSaving(true);
    const timer = setTimeout(async () => {
      try {
        await saveDraftSilently();
        setLastSavedAt(new Date());
      } catch (_) { /* silent */ }
      setAutoSaving(false);
    }, 1500);
    return () => {
      clearTimeout(timer);
      setAutoSaving(false);
    };
  }, [saveDraftSilently, agent, selectedSupplier, cart.length]);

  // Limpieza al desmontar: si el draft quedó vacío (0 items o sin proveedor), se borra.
  useEffect(() => {
    return () => {
      const dId = draftIdRef.current;
      if (!dId) return;
      const hasMeaningfulContent = cartRef.current.length > 0 && !!supplierRef.current;
      if (!hasMeaningfulContent) {
        supabase.from('order_items').delete().eq('order_id', dId).then(() => {
          supabase.from('orders').delete().eq('id', dId);
        });
      }
    };
  }, []);

  function handleBack() {
    // Navegación limpia: atrás es atrás. El autosave se encarga de persistir.
    if (step === 'inicio')    { router.back();          return; }
    if (step === 'modo')      { setStep('inicio');      return; }
    if (step === 'proveedor') { setStep('modo');        return; }
    if (step === 'productos') { setStep('proveedor');   return; }
    if (step === 'carrito')   { setStep('productos');   return; }
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
      if (error || !data) { toast.error('No se pudo crear el cliente'); setSaving(false); return; }
      clientId = (data as any).id;
    }

    const orderValues = {
      client_id: clientId,
      supplier_id: selectedSupplier.id,
      catalog_id: selectedCatalog?.id ?? null,
      status: 'confirmed' as const,
      total: cartTotal,
      discount_code: discountCode || null,
      notes: notes || null,
      shipping_address_id: selectedAddressId || null,
    };

    let orderId: string;

    if (currentDraftId) {
      const { error } = await supabase.from('orders').update(orderValues).eq('id', currentDraftId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      orderId = currentDraftId;
      await supabase.from('order_items').delete().eq('order_id', orderId);
    } else {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({ agent_id: agent.id, ...orderValues })
        .select()
        .single();
      if (error || !order) { toast.error(error?.message ?? 'No se pudo crear el pedido'); setSaving(false); return; }
      orderId = order.id;
    }

    await supabase.from('order_items').insert(
      cart.map(i => ({
        order_id: orderId,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price }))
    );

    setSaving(false);
    router.replace(`/(agent)/pedido/${orderId}` as any);
  }

  const selectedAddress = clientAddresses.find(a => a.id === selectedAddressId);

  const topBarTitle = { inicio: 'Pedidos', modo: 'Nuevo pedido', proveedor: 'Proveedor', productos: 'Productos', carrito: 'Carrito' }[step];
  const showCartAction = step !== 'carrito' && step !== 'modo' && step !== 'inicio' && cart.length > 0;

  // Subtítulo de estado de guardado (solo en pasos de edición con draft activo)
  const showSaveStatus = step !== 'inicio' && (currentDraftId || cart.length > 0);
  const saveStatusText = !showSaveStatus
    ? undefined
    : autoSaving
      ? 'Guardando…'
      : lastSavedAt
        ? `Guardado · ${formatRelativeTime(lastSavedAt.toISOString())}`
        : undefined;

  return (
    <Screen>
      <TopBar
        title={topBarTitle}
        subtitle={saveStatusText}
        onBack={handleBack}
        actions={showCartAction ? [{ icon: 'ShoppingCart', onPress: () => setStep('carrito'), badge: true, accessibilityLabel: `Ver carrito, ${cart.length} productos` }] : undefined}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* INICIO: Nuevo o continuar */}
      {step === 'inicio' && (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.inicioContent}>

          {/* Nuevo pedido */}
          <Pressable
            style={({ pressed }) => [styles.primaryCard, pressed && styles.cardPressed]}
            onPress={() => setStep('modo')}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.brand }]}>
              <Icon name="Plus" size={20} color={colors.white} />
            </View>
            <View style={styles.cardBody}>
              <Text variant="bodyMedium">Nuevo pedido</Text>
              <Text variant="small" color="ink3">Seleccionar cliente, proveedor y productos</Text>
            </View>
            <Icon name="ChevronRight" size={20} color={colors.ink3} />
          </Pressable>

          {/* Borradores */}
          <Text variant="caption" color="ink3" style={styles.sectionLabel}>
            Pendientes{drafts.length > 0 ? ` · ${drafts.length}` : ''}
          </Text>

          {draftsLoading && <ActivityIndicator color={colors.ink3} style={{ marginTop: space[4] }} />}

          {!draftsLoading && drafts.length === 0 && (
            <View style={styles.emptyBox}>
              <Text variant="small" color="ink3">No hay pedidos pendientes</Text>
            </View>
          )}

          {!draftsLoading && drafts.map(draft => (
            <Pressable
              key={draft.id}
              style={({ pressed }) => [styles.draftCard, pressed && styles.cardPressed]}
              onPress={() => loadDraft(draft.id)}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                <Icon name="ClipboardList" size={20} color={colors.ink2} />
              </View>
              <View style={styles.cardBody}>
                <Text variant="bodyMedium">{draft.supplier?.name ?? '—'}</Text>
                <Text variant="small" color="ink3">{draft.client?.name ?? 'Sin cliente'}</Text>
                <View style={styles.draftMeta}>
                  {draft.total > 0 && (
                    <Text variant="smallMedium" color="ink2">{formatEur(draft.total)}</Text>
                  )}
                  <Text variant="caption" color="ink3">· {formatRelativeTime(draft.created_at)}</Text>
                </View>
              </View>
              <Pressable
                hitSlop={8}
                style={({ pressed }) => [styles.draftDelete, pressed && { opacity: 0.5 }]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  Alert.alert(
                    'Descartar pedido',
                    '¿Seguro que quieres eliminar este pedido pendiente? No se podrá recuperar.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Descartar', style: 'destructive',
                        onPress: async () => {
                          await deleteOrder(draft.id);
                          refetchDrafts();
                        },
                      },
                    ]
                  );
                }}
                accessibilityLabel="Descartar pedido pendiente"
              >
                <Icon name="Trash2" size={16} color={colors.ink3} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* PASO 0: Elegir modo cliente */}
      {step === 'modo' && (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modoContent}>
          <Text variant="heading" style={{ marginBottom: space[2] }}>¿Cómo quieres empezar?</Text>

          {/* Opción 1: Cliente existente */}
          <ModeOption
            icon="User"
            title="Cliente existente"
            subtitle="Selecciona un cliente de tu lista"
            onPress={() => { setClientMode('existing'); setShowClientSearch(true); }}
          />

          {showClientSearch && (
            <View style={styles.searchBox}>
              <View style={styles.inputWithIcon}>
                <Icon name="Search" size={16} color={colors.ink4} />
                <TextInput
                  style={styles.inputEl}
                  placeholder="Buscar cliente..."
                  placeholderTextColor={colors.ink4}
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  autoFocus
                />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }} nestedScrollEnabled>
                {filteredClients.map(c => (
                  <Pressable
                    key={c.id}
                    style={({ pressed }) => [styles.clientItem, pressed && { backgroundColor: colors.surface2 }]}
                    onPress={() => { selectClient(c); setStep('proveedor'); }}
                  >
                    <Avatar name={c.name} size={28} fontSize={11} />
                    <Text variant="body" style={{ flex: 1 }}>{c.name}</Text>
                    <Icon name="ChevronRight" size={16} color={colors.ink4} />
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={() => setShowClientSearch(false)}>
                <Text variant="small" color="ink3" align="right">Cancelar</Text>
              </Pressable>
            </View>
          )}

          {/* Opción 2: Dar de alta cliente nuevo ahora */}
          <ModeOption
            icon="UserPlus"
            title="Dar de alta cliente nuevo"
            subtitle="Crea el cliente antes de empezar el pedido"
            onPress={() => setClientMode(clientMode === 'new_now' ? null : 'new_now')}
          />

          {clientMode === 'new_now' && (
            <View style={styles.formBox}>
              <TextInput style={styles.input} placeholder="Nombre *" placeholderTextColor={colors.ink4} value={newClientNow.name} onChangeText={v => setNewClientNow(p => ({ ...p, name: v }))} />
              <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor={colors.ink4} value={newClientNow.phone} onChangeText={v => setNewClientNow(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.ink4} value={newClientNow.email} onChangeText={v => setNewClientNow(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Dirección" placeholderTextColor={colors.ink4} value={newClientNow.address} onChangeText={v => setNewClientNow(p => ({ ...p, address: v }))} />
              <Button label="Crear cliente y continuar" icon="ArrowRight" iconPosition="right" onPress={confirmNewClientNow} fullWidth />
            </View>
          )}

          {/* Opción 3: Empezar sin cliente */}
          <ModeOption
            icon="ClipboardList"
            title="Empezar sin cliente"
            subtitle="Añade los datos del cliente al finalizar"
            onPress={() => { setClientMode('new_later'); setStep('proveedor'); }}
          />
        </ScrollView>
      )}

      {/* PASO 1: Proveedor → Catálogo */}
      {step === 'proveedor' && (
        <>
          {selectedClient && (
            <View style={styles.clientBanner}>
              <Avatar name={selectedClient.name} size={22} fontSize={9} />
              <Text variant="smallMedium" style={{ flex: 1 }}>{selectedClient.name}</Text>
              <Pressable onPress={() => setStep('modo')} hitSlop={8}>
                <Text variant="small" color="brand">Cambiar</Text>
              </Pressable>
            </View>
          )}
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar proveedor..." />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent}>
            {!selectedSupplier ? (
              filteredSuppliers.map(s => (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.listItem, pressed && styles.cardPressed]}
                  onPress={() => { setSelectedSupplier(s); setSearch(''); }}
                >
                  <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                    <Text variant="bodyMedium" color="ink2">{s.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text variant="bodyMedium">{s.name}</Text>
                    <Text variant="small" color="ink3">{s.catalog_count ?? 0} catálogos</Text>
                  </View>
                  <Icon name="ChevronRight" size={20} color={colors.ink4} />
                </Pressable>
              ))
            ) : (
              <>
                <Pressable style={styles.changeBtn} onPress={() => { setSelectedSupplier(null); setSelectedCatalog(null); }}>
                  <Icon name="ChevronLeft" size={16} color={colors.ink2} />
                  <Text variant="small" color="ink2">Cambiar proveedor ({selectedSupplier.name})</Text>
                </Pressable>
                {catalogs.filter(c => c.status === 'active').map(cat => (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [styles.listItem, pressed && styles.cardPressed]}
                    onPress={() => { setSelectedCatalog(cat); setSearch(''); setStep('productos'); }}
                  >
                    <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
                      <Icon name="BookOpen" size={20} color={colors.ink2} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text variant="bodyMedium">{cat.name}</Text>
                      <Text variant="small" color="ink3">{cat.product_count ?? 0} referencias</Text>
                    </View>
                    <Icon name="ChevronRight" size={20} color={colors.ink4} />
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* PASO 2: Productos */}
      {step === 'productos' && (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre o referencia..." />
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
                  <Pressable
                    style={styles.productCardImg}
                    onPress={() => p.image_url && setImageViewer(p.image_url)}
                  >
                    {p.image_url ? (
                      <Image source={{ uri: p.image_url }} style={styles.productCardImgEl} resizeMode="contain" />
                    ) : (
                      <Icon name="Package" size={24} color={colors.ink4} />
                    )}
                    {inCart && (
                      <View style={styles.productCartBadge}>
                        <Text variant="caption" color="white" style={styles.productCartBadgeText}>{qty}</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Info */}
                  <View style={styles.productCardBody}>
                    <Text variant="smallMedium" numberOfLines={2}>{p.name}</Text>
                    {p.reference ? <Text variant="caption" color="ink3">Ref. {p.reference}</Text> : null}
                    {(p.familia || p.subfamilia) ? (
                      <Text variant="caption" color="ink4" numberOfLines={1}>
                        {[p.familia, p.subfamilia].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    <Text variant="smallMedium" style={{ marginTop: 2 }}>{formatEur(p.price)}</Text>
                    {p.stock != null ? <Text variant="caption" color="ink4">Stock: {p.stock}</Text> : null}
                  </View>

                  {/* Controles qty */}
                  <View style={styles.productCardQty}>
                    {inCart ? (
                      <View style={styles.qtyRow}>
                        <Pressable style={styles.qtyBtn} onPress={() => removeFromCart(p.id)}>
                          <Icon name="Minus" size={16} color={colors.ink} />
                        </Pressable>
                        <Text variant="smallMedium" align="center" style={{ flex: 1 }}>{qty}</Text>
                        <Pressable style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => addToCart(p)}>
                          <Icon name="Plus" size={16} color={colors.white} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.addBtn, pressed && { backgroundColor: colors.brandHover }]}
                        onPress={() => addToCart(p)}
                      >
                        <Icon name="Plus" size={16} color={colors.white} />
                        <Text variant="smallMedium" color="white">Añadir</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
          />
          {cart.length > 0 && (
            <View style={styles.cartBar}>
              <View style={{ flex: 1 }}>
                <Text variant="smallMedium">{cart.length} producto{cart.length !== 1 ? 's' : ''}</Text>
                <Text variant="caption" color="ink3">{formatEur(cartTotal)}</Text>
              </View>
              <Button label="Ver carrito" icon="ArrowRight" iconPosition="right" size="sm" onPress={() => setStep('carrito')} />
            </View>
          )}
        </>
      )}

      {/* PASO 3: Carrito */}
      {step === 'carrito' && (
        <>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cartContent}>
            {/* Resumen proveedor */}
            <View style={styles.summaryCard}>
              <Text variant="smallMedium">{selectedSupplier?.name} · {selectedCatalog?.name}</Text>
              <Text variant="caption" color="ink3">{cart.length} productos · {cart.reduce((s, i) => s + i.quantity, 0)} unidades</Text>
            </View>

            {/* Cliente */}
            <View style={styles.sectionCard}>
              <Text variant="smallMedium" color="ink2" style={styles.sectionTitle}>Cliente</Text>
              {clientMode === 'existing' && selectedClient && (
                <View style={styles.clientSelectedRow}>
                  <Avatar name={selectedClient.name} size={28} fontSize={11} />
                  <Text variant="bodyMedium" style={{ flex: 1 }}>{selectedClient.name}</Text>
                  <Pressable onPress={() => setStep('modo')} hitSlop={8}>
                    <Text variant="small" color="brand">Cambiar</Text>
                  </Pressable>
                </View>
              )}
              {clientMode === 'new_later' && (
                <View style={{ gap: space[2] }}>
                  <TextInput style={styles.input} placeholder="Nombre del cliente *" placeholderTextColor={colors.ink4} value={newClientLater.name} onChangeText={v => setNewClientLater(p => ({ ...p, name: v }))} />
                  <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor={colors.ink4} value={newClientLater.phone} onChangeText={v => setNewClientLater(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
                  <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.ink4} value={newClientLater.email} onChangeText={v => setNewClientLater(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" />
                  <TextInput style={styles.input} placeholder="Dirección" placeholderTextColor={colors.ink4} value={newClientLater.address} onChangeText={v => setNewClientLater(p => ({ ...p, address: v }))} />
                </View>
              )}
            </View>

            {/* Dirección de envío — solo si hay cliente existente con direcciones */}
            {clientMode === 'existing' && clientAddresses.length > 0 && (
              <View style={styles.sectionCard}>
                <Text variant="smallMedium" color="ink2" style={styles.sectionTitle}>Dirección de envío</Text>
                <Pressable style={styles.addressPicker} onPress={() => setShowAddressPicker(true)}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{selectedAddress?.label ?? 'Seleccionar dirección'}</Text>
                    {selectedAddress?.address && <Text variant="small" color="ink3">{selectedAddress.address}{selectedAddress.city ? `, ${selectedAddress.city}` : ''}</Text>}
                  </View>
                  <Icon name="ChevronDown" size={20} color={colors.ink3} />
                </Pressable>
              </View>
            )}

            {/* Líneas */}
            <View style={{ gap: space[1] }}>
              {cart.map(item => (
                <View key={item.product.id} style={styles.cartLine}>
                  <View style={{ flex: 1 }}>
                    <Text variant="smallMedium" numberOfLines={2}>{item.product.name}</Text>
                    <Text variant="caption" color="ink3">{item.product.reference} · {formatEur(item.product.price)}/ud</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="caption" color="ink3">x{item.quantity}</Text>
                    <Text variant="smallMedium">{formatEur(item.product.price * item.quantity)}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Código descuento */}
            <View style={styles.discRow}>
              <View style={[styles.inputWithIcon, { flex: 1 }]}>
                <Icon name="Tag" size={16} color={colors.ink4} />
                <TextInput
                  style={styles.inputEl}
                  placeholder="Código descuento"
                  placeholderTextColor={colors.ink4}
                  value={discountCode}
                  onChangeText={setDiscountCode}
                />
              </View>
              <Button label="Aplicar" variant="secondary" size="sm" onPress={() => {}} />
            </View>

            {/* Observaciones */}
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Observaciones, instrucciones de entrega..."
              placeholderTextColor={colors.ink4}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* Total y confirmar */}
          <View style={styles.totalBar}>
            <View style={styles.totalRow}>
              <Text variant="small" color="ink3">Base imponible ({cart.reduce((s, i) => s + i.quantity, 0)} uds.)</Text>
              <Text variant="smallMedium">{formatEur(baseImponible)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text variant="small" color="ink3">IVA</Text>
              <Text variant="smallMedium">{formatEur(totalIva)}</Text>
            </View>
            <View style={styles.totalFinal}>
              <Text variant="bodyMedium">Total pedido</Text>
              <Text variant="title" color="brand">{formatEur(cartTotal)}</Text>
            </View>
            <Button
              label="Confirmar y generar PDF"
              onPress={confirmOrder}
              loading={saving}
              fullWidth
            />
          </View>
        </>
      )}

      {/* Visor de imagen */}
      <Modal visible={!!imageViewer} transparent animationType="fade" onRequestClose={() => setImageViewer(null)}>
        <Pressable style={styles.imgViewerOverlay} onPress={() => setImageViewer(null)}>
          <View style={styles.imgViewerBox}>
            {imageViewer && (
              <Image source={{ uri: imageViewer }} style={styles.imgViewerImg} resizeMode="contain" />
            )}
            <Pressable style={styles.imgViewerClose} onPress={() => setImageViewer(null)}>
              <Icon name="X" size={20} color={colors.white} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modal selector de dirección */}
      <Modal visible={showAddressPicker} transparent animationType="slide" onRequestClose={() => setShowAddressPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text variant="heading" style={{ marginBottom: space[3] }}>Seleccionar dirección</Text>
            {clientAddresses.map(addr => {
              const isSel = selectedAddressId === addr.id;
              return (
                <Pressable
                  key={addr.id}
                  style={[styles.addrOption, isSel && styles.addrOptionSelected]}
                  onPress={() => { setSelectedAddressId(addr.id); setShowAddressPicker(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{addr.label}</Text>
                    {addr.address && <Text variant="small" color="ink3">{addr.address}{addr.city ? `, ${addr.city}` : ''}</Text>}
                  </View>
                  {isSel && <Icon name="Check" size={20} color={colors.brand} />}
                </Pressable>
              );
            })}
            <Pressable style={styles.modalCancel} onPress={() => setShowAddressPicker(false)}>
              <Text variant="small" color="ink3">Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────────────

function ModeOption({
  icon, title, subtitle, onPress,
}: { icon: any; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.modeCard, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.surface2 }]}>
        <Icon name={icon} size={20} color={colors.ink2} />
      </View>
      <View style={styles.cardBody}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="small" color="ink3">{subtitle}</Text>
      </View>
      <Icon name="ChevronRight" size={20} color={colors.ink4} />
    </Pressable>
  );
}

function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.searchBarWrap}>
      <View style={styles.inputWithIcon}>
        <Icon name="Search" size={16} color={colors.ink4} />
        <TextInput
          style={styles.inputEl}
          placeholder={placeholder}
          placeholderTextColor={colors.ink4}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Inicio
  inicioContent: { padding: space[4], gap: space[2] },
  primaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space[4],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.ink,
  },
  cardPressed: { opacity: 0.7 },
  iconBox: {
    width: 44, height: 44,
    borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  sectionLabel: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: space[3], marginBottom: 2, paddingHorizontal: 2,
  },
  emptyBox: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[5],
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.line,
  },
  draftCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  draftMeta: {
    flexDirection: 'row', alignItems: 'center', gap: space[1] + 2,
    marginTop: 2, flexWrap: 'wrap',
  },
  draftDelete: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm,
  },

  // Modo cliente
  modoContent: { padding: space[4], gap: space[3] },
  modeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space[4],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

  // Inputs & forms
  formBox: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
  searchBox: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: 10,
    fontSize: 14, color: colors.ink,
    backgroundColor: colors.white,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space[3], height: 40,
    backgroundColor: colors.white,
  },
  inputEl: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 0 },

  clientItem: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingVertical: 9, paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },

  // Proveedor / listas
  clientBanner: {
    backgroundColor: colors.surface2,
    paddingHorizontal: space[4], paddingVertical: space[2],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  searchBarWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: space[4], paddingVertical: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  listContent: { padding: space[3], gap: space[2] },
  listItem: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  changeBtn: {
    padding: space[3], paddingBottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: space[1],
  },

  // Productos grid
  productGrid: { padding: space[3], paddingBottom: 80 },
  productGridRow: { gap: space[3], marginBottom: space[3] },
  productCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  productCardActive: { borderColor: colors.ink, borderWidth: 1.5 },
  productCardImg: {
    height: 140,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  productCardImgEl: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  productCartBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: colors.brand,
    borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  productCartBadgeText: { fontWeight: '700', lineHeight: 14 },
  productCardBody: { padding: space[2], gap: 2 },
  productCardQty: { paddingHorizontal: space[2], paddingBottom: space[2] },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.sm, overflow: 'hidden',
  },
  qtyBtn: {
    width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
  },
  qtyBtnAdd: { backgroundColor: colors.brand },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[1],
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: 7,
  },

  // Visor imagen
  imgViewerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  imgViewerBox: { width: SCREEN_WIDTH - 32, aspectRatio: 1, backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden' },
  imgViewerImg: { width: '100%', height: '100%' },
  imgViewerClose: {
    position: 'absolute', top: 12, right: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Cart bar inferior en paso productos
  cartBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.line,
    flexDirection: 'row', alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4], paddingVertical: space[3],
  },

  // Carrito
  cartContent: { padding: space[3], gap: space[2] },
  summaryCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: space[3],
    gap: 2,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  clientSelectedRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  addressPicker: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  cartLine: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  discRow: {
    flexDirection: 'row', gap: space[2], alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  notesInput: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    fontSize: 13, color: colors.ink,
    minHeight: 72, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.line,
  },
  totalBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.line,
    padding: space[4],
    gap: space[1],
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalFinal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    borderTopWidth: 1, borderTopColor: colors.line,
    marginTop: space[2], paddingTop: space[2], marginBottom: space[3],
  },

  // Modal dirección
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: space[5], gap: space[1],
  },
  addrOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    marginBottom: space[2],
  },
  addrOptionSelected: { borderColor: colors.ink, backgroundColor: colors.surface2 },
  modalCancel: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: space[3],
    marginTop: space[2],
  },
});
