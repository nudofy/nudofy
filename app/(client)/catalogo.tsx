// C-02 · Catálogo del portal cliente (3 vistas: proveedores → catálogos → productos)
import React, { useState } from 'react';
import {
  View, ScrollView, Pressable,
  StyleSheet, TextInput, FlatList, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon } from '@/components/ui';
import ClientBottomTabBar from '@/components/ClientBottomTabBar';
import { useClientData, useClientPortalSuppliers, useClientCatalogs, useClientProducts } from '@/hooks/useClient';
import { useCart } from '@/contexts/CartContext';
import type { PortalSupplier, PortalCatalog, PortalProduct } from '@/hooks/useClient';

type View3 = 'suppliers' | 'catalogs' | 'products';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function ClientCatalogoScreen() {
  const router = useRouter();
  const { client } = useClientData();
  const { suppliers, loading: loadingSuppliers } = useClientPortalSuppliers(client?.id);
  const { carts, totalItems } = useCart();

  const [view, setView] = useState<View3>('suppliers');
  const [selectedSupplier, setSelectedSupplier] = useState<PortalSupplier | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<PortalCatalog | null>(null);
  const [search, setSearch] = useState('');

  const { catalogs } = useClientCatalogs(
    selectedSupplier?.id,
    selectedSupplier?.catalog_id,
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

  const title = view === 'suppliers'
    ? 'Catálogo'
    : view === 'catalogs'
      ? (selectedSupplier?.name ?? 'Catálogos')
      : (selectedCatalog?.name ?? 'Productos');

  return (
    <Screen>
      <TopBar
        title={title}
        onBack={view !== 'suppliers' ? goBack : undefined}
        actions={[{
          icon: 'ShoppingCart',
          onPress: () => router.push('/(client)/carrito'),
          accessibilityLabel: 'Carrito',
          badge: cartCount > 0,
        }]}
      />

      {/* Buscador */}
      {view !== 'suppliers' && (
        <View style={styles.searchWrap}>
          <Icon name="Search" size={16} color={colors.ink3} />
          <TextInput
            style={styles.searchInput}
            placeholder={view === 'catalogs' ? 'Buscar catálogo...' : 'Buscar producto, ref, EAN...'}
            placeholderTextColor={colors.ink4}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {/* Vista: proveedores */}
      {view === 'suppliers' && (
        <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
          {loadingSuppliers && (
            <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Cargando...</Text>
          )}
          {!loadingSuppliers && suppliers.length === 0 && (
            <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
              Tu agente aún no ha habilitado proveedores para tu portal
            </Text>
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
          {catalogs.length === 0 && (
            <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
              Sin catálogos disponibles
            </Text>
          )}
          {catalogs.map(cat => (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [styles.catalogCard, pressed && { opacity: 0.7 }]}
              onPress={() => selectCatalog(cat)}
            >
              <View style={styles.catalogIcon}>
                <Icon name="BookOpen" size={18} color={colors.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{cat.name}</Text>
                {cat.season && (
                  <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{cat.season}</Text>
                )}
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                  {cat.product_count ?? 0} productos
                </Text>
              </View>
              <Icon name="ChevronRight" size={18} color={colors.ink4} />
            </Pressable>
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
          onGoCart={() => router.push('/(client)/carrito')}
        />
      )}

      <ClientBottomTabBar activeTab="catalogo" />
    </Screen>
  );
}

// ——— Supplier card ———
function SupplierCard({ supplier, onPress }: { supplier: PortalSupplier; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.supplierCard, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      {supplier.logo_url ? (
        <Image source={{ uri: supplier.logo_url }} style={styles.supplierLogoImage} resizeMode="contain" />
      ) : (
        <View style={styles.supplierLogo}>
          <Text variant="heading" color="ink2">{supplier.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text variant="smallMedium" align="center" numberOfLines={2}>{supplier.name}</Text>
    </Pressable>
  );
}

// ——— Product grid con carrito ———
function ProductGrid({
  products, supplierId, supplierName, catalogId, catalogName, onGoCart,
}: {
  products: PortalProduct[];
  supplierId: string; supplierName: string;
  catalogId: string; catalogName: string;
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
        columnWrapperStyle={{ gap: space[2] }}
        ListEmptyComponent={
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>Sin productos</Text>
        }
        renderItem={({ item: product }) => {
          const qty = getItemQty(supplierId, product.id);
          const inCart = qty > 0;
          return (
            <View style={styles.productCard}>
              <View style={styles.productImg}>
                {product.image_url ? (
                  <Image
                    source={{ uri: product.image_url }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon name="Package" size={24} color={colors.ink4} />
                )}
              </View>
              <View style={styles.productBody}>
                <Text variant="smallMedium" numberOfLines={2}>{product.name}</Text>
                {product.reference && (
                  <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                    Ref: {product.reference}
                  </Text>
                )}
                <Text variant="bodyMedium" style={{ marginTop: 4 }}>{formatEur(product.price)}</Text>
              </View>
              {!inCart ? (
                <Pressable
                  style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => handleAdd(product)}
                >
                  <Icon name="Plus" size={16} color={colors.white} />
                  <Text variant="smallMedium" style={{ color: colors.white }}>Añadir</Text>
                </Pressable>
              ) : (
                <View style={styles.qtyRow}>
                  <Pressable
                    style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => handleDecrement(product)}
                  >
                    <Icon name="Minus" size={16} color={colors.ink} />
                  </Pressable>
                  <Text variant="bodyMedium" align="center" style={{ flex: 1 }}>{qty}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => handleIncrement(product)}
                  >
                    <Icon name="Plus" size={16} color={colors.ink} />
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
      {cartCount > 0 && (
        <Pressable
          style={({ pressed }) => [styles.cartBar, pressed && { opacity: 0.9 }]}
          onPress={onGoCart}
        >
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={{ color: colors.white }}>{cartCount} artículos</Text>
            <Text variant="caption" style={{ color: colors.white, opacity: 0.8, marginTop: 2 }}>
              Ver carrito
            </Text>
          </View>
          <Text variant="title" style={{ color: colors.white }}>{formatEur(cartTotal)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: space[3], paddingVertical: space[2],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: colors.ink,
    paddingVertical: 4,
  },

  gridContent: { padding: space[3] },
  listContent: { padding: space[3], gap: space[2] },

  supplierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  supplierCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[4],
    alignItems: 'center', gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
  supplierLogo: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  supplierLogoImage: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },

  catalogCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },
  catalogIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },

  productGrid: { padding: space[2], paddingBottom: 100, gap: space[2] },
  productCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  productImg: {
    height: 140,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  productBody: { padding: space[2], gap: 2 },

  addBtn: {
    margin: space[2], marginTop: 4,
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: space[2], marginTop: 4,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 36, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },

  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.brand,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[4], paddingVertical: space[3],
    gap: space[3],
  },

  emptyText: { paddingVertical: space[8] },
});
