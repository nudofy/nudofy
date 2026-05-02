# Contexto del proyecto: Nudofy

## ¿Qué es?
App móvil de gestión comercial para agentes de ventas y sus clientes, construida con **React Native / Expo SDK 52** y **Supabase** como backend.

## Stack técnico
- **Framework**: React Native con Expo SDK 52, expo-router (file-based routing)
- **Backend**: Supabase (PostgreSQL + RLS + Storage)
- **Lenguaje**: TypeScript
- **Build**: EAS Build (Expo Application Services)
- **Librerías clave**: expo-image-picker, expo-camera, react-native-gesture-handler ~2.20.2, react-native-reanimated ~3.16.1

## Estructura de carpetas

```
app/
  (agent)/          ← pantallas del agente comercial
    catalogo/[id].tsx    ← lista de productos de un catálogo
    catalogo/importar.tsx
    catalogo/imagenes.tsx
    cliente/[id].tsx
    cliente/nuevo.tsx
    clientes.tsx
    pedido/[id].tsx
    pedido/nuevo.tsx     ← flujo completo de nuevo pedido (★ más complejo)
    pedidos.tsx
    producto/[id].tsx
    producto/nuevo.tsx
    producto/editar.tsx
    proveedor/[id].tsx
    proveedor/nuevo.tsx
    proveedor/editar.tsx
    catalogos.tsx
    estadisticas.tsx
    home.tsx
    tarifas.tsx
  (client)/         ← portal del cliente (acceso por invitación)
    catalogo.tsx         ← catálogo con carrito inline
    carrito.tsx          ← detalle del carrito y confirmación
    home.tsx
    pedidos.tsx
    pedido/[id].tsx
    confirmacion/[id].tsx
    perfil.tsx
  (admin)/          ← panel de administración (superadmin)
  index.tsx         ← splash/router inicial
  login.tsx

src/
  hooks/
    useAgent.ts     ← TODOS los hooks del agente (★ archivo principal)
    useClient.ts    ← hooks del cliente + confirmClientOrder()
    useAdmin.ts
  contexts/
    AuthContext.tsx     ← sesión Supabase
    AgentContext.tsx    ← profile + agent en un solo contexto
    CartContext.tsx     ← carrito del cliente (en memoria)
    ToastContext.tsx
    NetworkContext.tsx
  components/
    ui/             ← componentes base: Text, Button, Icon, TopBar, Screen, Badge, EmptyState...
    Avatar.tsx
    BottomTabBar.tsx
    ClientBottomTabBar.tsx
    AttributesEditor.tsx  ← editor de atributos+variantes para productos
  lib/
    supabase.ts
    validation.ts   ← ProductSchema, zod-like validate()
  theme/
    index.ts        ← exporta colors, space, radius, shadows
    colors.ts
    spacing.ts      ← space[1..8]
    typography.ts

components/         ← alias @/components (mismo que src/components)
```

## Roles / flujos de usuario

### Agente comercial
- Gestiona proveedores → catálogos → productos
- Gestiona clientes (con direcciones de envío, tarifas personalizadas)
- Crea pedidos (selecciona cliente → proveedor → catálogo → productos → confirma)
- Los pedidos pueden guardarse como borradores (autosave cada 1.5s)
- Puede escanear códigos de barras para añadir productos al pedido
- Puede crear tarifas especiales (product_prices) por cliente

### Cliente (portal)
- Accede por invitación de su agente
- Ve catálogos habilitados por el agente
- Añade al carrito (CartContext, en memoria) y confirma pedido → va a `orders` con status `confirmed`

### Admin (superadmin)
- Gestión de agentes y empresas. No es relevante para la mayoría de tareas.

## Base de datos (Supabase) — tablas principales

```sql
profiles          -- usuarios (user_id = auth.uid())
agents            -- agente comercial (user_id FK profiles)
clients           -- clientes del agente (agent_id FK agents)
client_addresses  -- direcciones de envío de clientes
suppliers         -- proveedores (agent_id FK agents)
catalogs          -- catálogos de proveedor (supplier_id FK suppliers)
products          -- productos (catalog_id FK catalogs)
product_images    -- imágenes adicionales de producto
product_prices    -- precios por tarifa (product_id, tariff_id, price)
tariffs           -- tarifas comerciales (agent_id FK agents)
product_attributes       -- atributos de producto (ej: "Talla", "Color")
product_attribute_options -- opciones de atributo (ej: "M", "L", "Rojo")
product_variants         -- variantes/SKUs con attributes JSONB, reference, barcode, stock
orders            -- pedidos (status: draft | confirmed | sent_to_supplier | delivered)
order_items       -- líneas de pedido (product_id, quantity, unit_price, attributes JSONB, variant_id)
```

### RLS pattern (muy importante)
- **Agente**: `agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())`
- **Cliente**: directo por `clients.user_id = auth.uid()`
- **Productos/catálogos**: accesibles si pertenecen a un catálogo del agente

## Patrones de código

### Importaciones de alias
```typescript
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Screen, TopBar } from '@/components/ui';
import { useAgent, useProducts, useOrders } from '@/hooks/useAgent';
import { supabase } from '@/lib/supabase';
```

### Hook típico en useAgent.ts
```typescript
export function useProducts(catalogId?: string, tariffId?: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const fetchProducts = useCallback(async () => { /* supabase query */ }, [catalogId, tariffId]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  return { products, loading, createProduct, updateProduct, deleteProduct };
}
```

### Toast
```typescript
const toast = useToast();
toast.success('Guardado');
toast.error('Error al guardar');
toast.warning('Aviso');
```

### Validación
```typescript
const v = validate(ProductSchema, { name, price, ... });
if (!v.ok) { toast.error(v.firstError); return; }
const priceNum = v.data.price;
```

## Sistema de variantes/atributos

Cada producto puede tener atributos (Talla, Color...) con opciones (M, L, Rojo...). Las combinaciones generan variantes en `product_variants`, cada una con su propia referencia, código de barras y stock.

- **Componente**: `AttributesEditor` en `components/AttributesEditor.tsx`
  - Props: `{ attributes, variants, onAttributesChange, onVariantsChange }`
  - Fase 1: definir atributos y opciones
  - Fase 2: matriz de variantes generada automáticamente (producto cartesiano)
- **Hooks**: `useProductAttributes(productId)`, `useProductVariants(productId)` en `useAgent.ts`
- **Al pedir** (agente): modal de selección → busca `variant_id` en `product_variants` → guarda en `order_items.attributes` y `order_items.variant_id`
- **Al pedir** (cliente): mismo modal en `catalogo.tsx`, guardado vía `CartContext` con `item_key` único por combinación

### CartContext (cliente)
- `CartItem` lleva: `product_id`, `item_key` (= productId + atributos serializados), `attributes?`, `variant_id?`
- `makeItemKey(productId, attrs?)` — helper exportado desde CartContext
- `updateQty` y `removeItem` usan `item_key`, NO `product_id`
- `getItemQty(supplierId, productId)` — suma todas las variantes del producto

## Convenciones de UI
- `StyleSheet.create()` siempre al final del archivo
- Usar `<Text variant="..." color="...">` (nunca `<RNText>` directamente)
- Colores: `colors.brand`, `colors.ink/ink2/ink3/ink4`, `colors.white`, `colors.surface/surface2`, `colors.line/line2`, `colors.error`
- Espaciado: `space[1..8]`
- Bordes: `radius.sm`, `radius.md`, `radius.lg`, `radius.xl`, `radius.full`

## Reglas de trabajo
1. **Nunca pasar al siguiente paso si el usuario tiene que ejecutar algo (SQL, build...) y no ha confirmado que fue bien**
2. Cuando se necesita un cambio en BD, dar el SQL al usuario para que lo ejecute en Supabase y esperar confirmación
3. Los archivos del proyecto están en: `C:\Users\jcata\Desktop\Claude\app-ventas\nudofy-project\`
4. El alias `@/` mapea a `src/` (configurado en tsconfig/babel)
