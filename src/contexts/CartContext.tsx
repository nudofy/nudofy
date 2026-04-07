import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CartItem {
  product_id: string;
  name: string;
  reference?: string;
  unit_price: number;
  quantity: number;
}

export interface Cart {
  supplier_id: string;
  supplier_name: string;
  catalog_id: string;
  catalog_name: string;
  items: CartItem[];
  notes: string;
}

interface CartContextType {
  carts: Cart[];
  addToCart: (
    supplierId: string,
    supplierName: string,
    catalogId: string,
    catalogName: string,
    item: CartItem
  ) => void;
  updateQty: (supplierId: string, productId: string, qty: number) => void;
  removeItem: (supplierId: string, productId: string) => void;
  setCartNotes: (supplierId: string, notes: string) => void;
  clearCart: (supplierId: string) => void;
  getCart: (supplierId: string) => Cart | undefined;
  getItemQty: (supplierId: string, productId: string) => number;
  totalItems: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [carts, setCarts] = useState<Cart[]>([]);

  const getCart = useCallback(
    (supplierId: string) => carts.find(c => c.supplier_id === supplierId),
    [carts]
  );

  const getItemQty = useCallback(
    (supplierId: string, productId: string) => {
      const cart = carts.find(c => c.supplier_id === supplierId);
      return cart?.items.find(i => i.product_id === productId)?.quantity ?? 0;
    },
    [carts]
  );

  const addToCart = useCallback(
    (
      supplierId: string,
      supplierName: string,
      catalogId: string,
      catalogName: string,
      item: CartItem
    ) => {
      setCarts(prev => {
        const existing = prev.find(c => c.supplier_id === supplierId);
        if (!existing) {
          return [
            ...prev,
            {
              supplier_id: supplierId,
              supplier_name: supplierName,
              catalog_id: catalogId,
              catalog_name: catalogName,
              items: [item],
              notes: '',
            },
          ];
        }
        const existingItem = existing.items.find(i => i.product_id === item.product_id);
        return prev.map(c =>
          c.supplier_id !== supplierId
            ? c
            : {
                ...c,
                items: existingItem
                  ? c.items.map(i =>
                      i.product_id === item.product_id ? { ...i, quantity: item.quantity } : i
                    )
                  : [...c.items, item],
              }
        );
      });
    },
    []
  );

  const updateQty = useCallback((supplierId: string, productId: string, qty: number) => {
    setCarts(prev =>
      prev
        .map(c =>
          c.supplier_id !== supplierId
            ? c
            : {
                ...c,
                items:
                  qty <= 0
                    ? c.items.filter(i => i.product_id !== productId)
                    : c.items.map(i =>
                        i.product_id === productId ? { ...i, quantity: qty } : i
                      ),
              }
        )
        .filter(c => c.items.length > 0)
    );
  }, []);

  const removeItem = useCallback((supplierId: string, productId: string) => {
    setCarts(prev =>
      prev
        .map(c =>
          c.supplier_id !== supplierId
            ? c
            : { ...c, items: c.items.filter(i => i.product_id !== productId) }
        )
        .filter(c => c.items.length > 0)
    );
  }, []);

  const setCartNotes = useCallback((supplierId: string, notes: string) => {
    setCarts(prev =>
      prev.map(c => (c.supplier_id === supplierId ? { ...c, notes } : c))
    );
  }, []);

  const clearCart = useCallback((supplierId: string) => {
    setCarts(prev => prev.filter(c => c.supplier_id !== supplierId));
  }, []);

  const totalItems = carts.reduce(
    (sum, c) => sum + c.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        carts,
        addToCart,
        updateQty,
        removeItem,
        setCartNotes,
        clearCart,
        getCart,
        getItemQty,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
