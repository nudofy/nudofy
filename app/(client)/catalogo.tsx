// C-02 · Catálogo del portal cliente (3 vistas: proveedores → catálogos → productos)
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import Avatar from '@/components/Avatar';
import { useClientData, useClientPortalSuppliers, useClientCatalogs, useClientProducts } from '@/hooks/useClient';
import { useCart } from '@/contexts/CartContext';
import type { PortalSupplier, PortalCatalog, PortalProduct } from '@/hooks/useClient';

type View3 = 'suppliers' | 'catalogs' | 'products';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function ClientCatalogoScreen() {
  const router = useRouter();
  const { client, agent } = useClientData();
  const { suppliers, loading: loadingSuppliers } = useClientPortalSuppliers(client?.id);
  const { carts, totalItems } = useCart();

  const [view, setView] = useState<View3>('suppliers');
  const [selectedSupplier, setSelectedSupplier] = useState<PortalSupplier | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<PortalCatalog | null>(null);
  const [search, setSearch] = useState('');

  const { catalogs } = useClientCatalogs(
    selectedSupplier?.id,
    selectedSupplier?.catalog_id
  );
  const { products } = useClientProducts(selectedCatalog?.id, search);

  function selectSupplier(supplier: PortalSupplier) {
    setSelectedSupplier(supplier);
    setView('catalogs');
    setSearch('');
  }

  function selectCatalog(catalog: PortalCatalog) {
    setSelectedCatalog(catalog);
    setView('products');
    setSearch('');
  }

  function goBack() {
    if (view === 'products') { setView('catalogs'); setSearch(''); }
    else if (view === 'catalogs') { setView('suppliers'); setSelectedSupplier(null); setSearch(''); }
  }

  const cartCount = selectedSupplier
    ? (carts.find(c => c.supplier_id === selectedSupplier.id)?.items.reduce((s, i) => s + i.quantity, 0) ?? 0)
    : totalItems;

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        {view !== 'suppliers' ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.title}>
          {view === 'suppliers' ? 'Catálogo' : view === 'catalogs' ? selectedSupplier?.name ?? 'Catálogos' : selectedCatalog?.name ?? 'Productos'}
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => router.push('/(client)/carrito')}
        >
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Buscador (en catálogos y productos) */}
      {view !== 'suppliers' && (
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={view === 'catalogs' ? 'Buscar catálogo...' : 'Buscar producto, ref, EAN...'}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {view === 'products' && (
            <TouchableOpacity style={styles.camBtn}>
              <Text style={styles.camIcon}>📷</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Vista: proveedores */}
      {view === 'suppliers' && (
        <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
          {loadingSuppliers && <Text style={styles.emptyText}>Cargando...</Text>}
          {!loadingSuppliers && suppliers.length === 0 && (
            <Text style={styles.emptyText}>Tu agente aún no ha habilitado proveedores para tu portal</Text>
          )}
          <View style={styles.supplierGrid}>
            {suppliers.map(s => (
              <SupplierCard key={s.id} supplier={s} onPress={() => selectSupplier(s)} />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Vista: catálogos */}
      {view === 'catalogs' && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {catalogs.length === 0 && <Text style={styles.emptyText}>Sin catálogos disponibles</Text>}
          {catalogs.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catalogCard}
              onPress={() => selectCatalog(cat)}
              activeOpacity={0.85}
            >
              <View style={styles.catalogIcon}>
                <Text style={styles.catalogIconText}>◫</Text>
              </View>
              <View style={styles.catalogBody}>
                <Text style={styles.catalogName}>{cat.name}</Text>
                {cat.season && <Text style={styles.catalogSeason}>{cat.season}</Text>}
                <Text style={styles.catalogCount}>{cat.product_count ?? 0} productos</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Vista: productos */}
      {view === 'products' && selectedSupplier && selectedCatalog && (
        <ProductGrid
          products={products}
          supplierId={selectedSupplier.id}
          supplierName={selectedSupplier.name}
          catalogId={selectedCatalog.id}
          catalogName={selectedCatalog.name}
          agentId={client?.agent_id ?? ''}
          clientId={client?.id ?? ''}
          onGoCart={() => router.push('/(client)/carrito')}
        />
      )}

      <ClientBottomTabBar activeTab="catalogo" />
    </SafeAreaView>
  );
}

// ——— Supplier card ———
function SupplierCard({ supplier, onPress }: { supplier: PortalSupplier; onPress: () => void }) {
  const colorPairs = [
    { bg: '#EEEDFE', fg: '#534AB7' },
    { bg: '#EAF3DE', fg: '#3B6D11' },
    { bg: '#FAEEDA', fg: '#BA7517' },
    { bg: '#E6F1FB', fg: '#3B7CC4' },
    { bg: '#F1EFE8', fg: '#888780' },
  ];
  const idx = supplier.name.charCodeAt(0) % colorPairs.length;
  const { bg, fg } = colorPairs[idx];

  return (
    <TouchableOpacity style={styles.supplierCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.supplierLogo, { backgroundColor: bg }]}>
        <Text style={[styles.supplierLogoText, { color: fg }]}>{supplier.name.charAt(0)}</Text>
      </View>
      <Text style={styles.supplierName} numberOfLines={2}>{supplier.name}</Text>
    </TouchableOpacity>
  );
}

// ——— Product grid con carrito ———
function ProductGrid({
  products, supplierId, supplierName, catalogId, catalogName, agentId, clientId, onGoCart,
}: {
  products: PortalProduct[];
  supplierId: string; supplierName: string;
  catalogId: string; catalogName: string;
  agentId: string; clientId: string;
  onGoCart: () => void;
}) {
  const { addToCart, updateQty, getItemQty, carts } = useCart();
  const cart = carts.find(c => c.supplier_id === supplierId);
  const cartTotal = cart?.items.reduce((s, i) => s + i.unit_price * i.quantity, 0) ?? 0;
  const cartCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  function handleAdd(product: PortalProduct) {
    const qty = getItemQty(supplierId, product.id);
    addToCart(supplierId, supplierName, catalogId, catalogName, {
      product_id: product.id,
      name: product.name,
      reference: product.reference,
      unit_price: product.price,
      quantity: qty + 1,
    });
  }

  function handleIncrement(product: PortalProduct) {
    const qty = getItemQty(supplierId, product.id);
    updateQty(supplierId, product.id, qty + 1);
  }

  function handleDecrement(product: PortalProduct) {
    const qty = getItemQty(supplierId, product.id);
    updateQty(supplierId, product.id, qty - 1);
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={products}
        keyExtractor={i => i.id}
        numColumns={2}
        contentContainerStyle={styles.productGrid}
        columnWrapperStyle={{ gap: 10 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin productos</Text>}
        renderItem={({ item: product }) => {
          const qty = getItemQty(supplierId, product.id);
          const inCart = qty > 0;
          return (
            <View style={styles.productCard}>
              <View style={styles.productImg}>
                <Text style={styles.productEmoji}>📦</Text>
              </View>
              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                {product.reference && (
                  <Text style={styles.productRef}>Ref: {product.reference}</Text>
                )}
                <Text style={styles.productPrice}>{formatEur(product.price)}</Text>
              </View>
              {!inCart ? (
                <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(product)}>
                  <Text style={styles.addBtnText}>+ Añadir</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => handleDecrement(product)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => handleIncrement(product)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
              {inCart && (
                <View style={styles.inCartBadge}>
                  <Text style={styles.inCartText}>✓ En carrito</Text>
                </View>
              )}
            </View>
          );
        }}
      />
      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={onGoCart}>
          <View>
            <Text style={styles.cartBarTitle}>{cartCount} artículos</Text>
            <Text style={styles.cartBarSub}>Ver carrito</Text>
          </View>
          <Text style={styles.cartBarTotal}>{formatEur(cartTotal)}</Text>
        </TouchableOpacity>
      )}
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
    gap: 10,
  },
  backBtn: { padding: 2 },
  back: { fontSize: 20, color: colors.purple },
  title: { fontSize: 17, fontWeight: '500', color: colors.text },
  cartBtn: { position: 'relative', padding: 4 },
  cartIcon: { fontSize: 22 },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: colors.purple,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 14, paddingVertical: 9,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#efefef',
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1, fontSize: 13, color: colors.text,
    backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  camBtn: { padding: 4 },
  camIcon: { fontSize: 20 },
  gridContent: { padding: 12 },
  listContent: { padding: 12, gap: 8 },
  supplierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  supplierCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 10,
  },
  supplierLogo: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  supplierLogoText: { fontSize: 22, fontWeight: '600' },
  supplierName: { fontSize: 13, fontWeight: '500', color: colors.text, textAlign: 'center' },
  catalogCard: {
    backgroundColor: colors.white, borderRadius: 12,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  catalogIcon: {
    width: 42, height: 42, borderRadius: 11,
    backgroundColor: colors.purpleLight,
    alignItems: 'center', justifyContent: 'center',
  },
  catalogIconText: { fontSize: 20, color: colors.purple },
  catalogBody: { flex: 1 },
  catalogName: { fontSize: 14, fontWeight: '500', color: colors.text },
  catalogSeason: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  catalogCount: { fontSize: 11, color: colors.purple, marginTop: 3 },
  chevron: { fontSize: 18, color: '#ccc' },
  productGrid: { padding: 10, paddingBottom: 100 },
  productCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  productImg: {
    height: 100, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  productEmoji: { fontSize: 36 },
  productBody: { padding: 10, gap: 2 },
  productName: { fontSize: 13, fontWeight: '500', color: colors.text },
  productRef: { fontSize: 10, color: colors.textMuted },
  productPrice: { fontSize: 14, fontWeight: '600', color: colors.purple, marginTop: 4 },
  addBtn: {
    margin: 8, marginTop: 4,
    backgroundColor: colors.purple,
    borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  addBtnText: { color: colors.white, fontSize: 12, fontWeight: '500' },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 8, marginTop: 4,
    backgroundColor: colors.purpleLight,
    borderRadius: 8, overflow: 'hidden',
  },
  qtyBtn: {
    width: 36, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, color: colors.purple, fontWeight: '500' },
  qtyValue: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '500', color: colors.purple },
  inCartBadge: {
    marginHorizontal: 8, marginBottom: 8,
    backgroundColor: colors.greenLight,
    borderRadius: 6, paddingVertical: 3, alignItems: 'center',
  },
  inCartText: { fontSize: 10, color: colors.green, fontWeight: '500' },
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.purple,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  cartBarTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  cartBarSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  cartBarTotal: { color: colors.white, fontSize: 16, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 32 },
});
