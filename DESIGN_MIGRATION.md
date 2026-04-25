# Nudofy · Plan de migración al sistema v2

> Acompaña a `DESIGN_SYSTEM.md`. Esta guía dice **qué tocar y en qué orden**.

---

## 0. Antes de nada — instalar dependencias

```bash
cd C:\Users\jcata\Desktop\Claude\app-ventas\nudofy-project
npm install
# o usa el comando de Expo si prefieres alinear versiones:
npx expo install lucide-react-native react-native-svg
```

Esto añade `lucide-react-native` + `react-native-svg` que el nuevo `Icon` necesita.

---

## 1. Patrón de migración pantalla-por-pantalla

Para cada pantalla haz exactamente esto:

### 1.1 Imports

```diff
- import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
- import { SafeAreaView } from 'react-native-safe-area-context';
- import { colors } from '@/theme/colors';
+ import { View, Pressable, StyleSheet } from 'react-native';
+ import { colors, space } from '@/theme';
+ import { Screen, TopBar, Text, Button, Card, Icon } from '@/components/ui';
```

### 1.2 Scaffolding

```tsx
return (
  <Screen>
    <TopBar title="…" onBack={() => router.back()} />
    <ScrollView ...>
      {/* contenido */}
    </ScrollView>
    {/* si tiene tabs */}
    <BottomTabBar activeTab="…" />
  </Screen>
);
```

### 1.3 Reemplazos mecánicos

| Antes | Después |
|---|---|
| `<Text style={{fontSize: 22, fontWeight: '600'}}>` | `<Text variant="title">` |
| `<Text style={{fontSize: 15}}>` | `<Text variant="body">` |
| `<Text style={{fontSize: 11, textTransform: 'uppercase'}}>` | `<Text variant="caption" color="ink3">` |
| `<TouchableOpacity style={btn}>` | `<Button label="…" />` o `<Pressable>` |
| Emoji `＋ 🔔 ▦` como icon | `<Icon name="Plus" /> <Icon name="Bell" />` |
| `colors.text` | `colors.ink` (legacy sigue funcionando) |
| `colors.textMuted` | `colors.ink4` |
| `colors.border` | `colors.line` |
| Cualquier `backgroundColor: '#...'` pastel en chips | `<Badge variant="…">` |
| `#FDECEA` / `colors.brandLight` | `colors.brandSoft` |
| `borderWidth: 1.5, borderColor: colors.border` | `borderWidth: 1, borderColor: colors.line` |

### 1.4 Reglas de color

- El **rojo** solo en CTA primario (`<Button variant="primary">`), badge de notificación, icono activo del tab bar.
- Quitar **barras superiores rojas u oscuras**. Usar `<TopBar />` blanca.
- Quick cards con fondos de colores distintos → todas blancas con `surface2` para el icono.

### 1.5 Iconos

Reemplazar cualquier emoji o glyph por `<Icon name="…">`. Referencia rápida:

| Antes | Después |
|---|---|
| `＋` añadir | `Plus` |
| `🔔` notificación | `Bell` |
| `▦` cuadrícula | `LayoutGrid` |
| `≡` lista | `AlignJustify` / `List` |
| `▲` arriba / stats | `TrendingUp` / `BarChart3` |
| `👤` usuario | `User` / `Users` |
| `🔍` buscar | `Search` |
| `←` volver | `ChevronLeft` |
| `→` avanzar | `ChevronRight` |
| `👁` ver contraseña | `Eye` / `EyeOff` |
| `✏️` editar | `Pencil` |
| `🗑️` eliminar | `Trash2` |

---

## 2. Orden de migración propuesto

Ordenado por **frecuencia de uso real** del agente comercial:

### Fase A — Núcleo diario (crítico) ✅ demo aplicada

1. ✅ `app/login.tsx` → hecho
2. ✅ `app/(agent)/home.tsx` → hecho
3. ✅ `src/components/BottomTabBar.tsx` → hecho
4. ✅ `src/components/StatusBadge.tsx` → hecho
5. ✅ `src/components/Avatar.tsx` → hecho

### Fase B — Flujo de pedido (alto uso)

6. `app/(agent)/pedido/nuevo.tsx` — grid productos, añadir al carrito
7. `app/(agent)/pedido/[id].tsx` — detalle, resumen, IVA
8. `app/(agent)/pedidos.tsx` — lista con borradores
9. `app/(agent)/clientes.tsx` — lista clientes
10. `app/(agent)/cliente/[id].tsx` — ficha cliente
11. `app/(agent)/cliente/nuevo.tsx` — formulario

### Fase C — Catálogo

12. `app/(agent)/catalogos.tsx`
13. `app/(agent)/catalogo/[id].tsx`
14. `app/(agent)/catalogo/importar.tsx`
15. `app/(agent)/producto/[id].tsx`
16. `app/(agent)/producto/nuevo.tsx`
17. `app/(agent)/producto/editar.tsx`
18. `app/(agent)/proveedor/[id].tsx`
19. `app/(agent)/proveedor/nuevo.tsx`
20. `app/(agent)/proveedor/editar.tsx`

### Fase D — Perfil / utilidades

21. `app/(agent)/mas.tsx`
22. `app/(agent)/perfil.tsx`
23. `app/(agent)/estadisticas.tsx`

### Fase E — Portal cliente

24. `src/components/ClientBottomTabBar.tsx`
25. `app/(client)/home.tsx`
26. `app/(client)/catalogo.tsx`
27. `app/(client)/carrito.tsx`
28. `app/(client)/pedidos.tsx`
29. `app/(client)/pedido/[id].tsx`
30. `app/(client)/confirmacion/[id].tsx`
31. `app/(client)/perfil.tsx`

### Fase F — Admin

32. `src/components/AdminShell.tsx`
33. `app/(admin)/dashboard.tsx`
34. `app/(admin)/agentes.tsx` + `agente/[id].tsx`
35. `app/(admin)/empresa/[id].tsx`
36. `app/(admin)/facturacion.tsx`
37. `app/(admin)/planes.tsx`
38. `app/(admin)/configuracion.tsx`

---

## 3. Qué NO tocar todavía

- Lógica de datos (hooks en `src/hooks/`) — solo UI.
- `CartContext`, `AuthContext` — solo UI.
- El flujo de navegación de `app/_layout.tsx` — funciona.

---

## 4. Checklist por pantalla

Al terminar cada pantalla, verifica:

- [ ] Sin emojis como iconos de UI
- [ ] Solo un `<Button variant="primary">` (el CTA principal)
- [ ] Uso de `<Screen>` + `<TopBar>` en vez de SafeAreaView manual
- [ ] Todos los textos pasan por `<Text variant="…">` del sistema
- [ ] Ningún `StyleSheet` define colores hex inline — usar tokens
- [ ] Cards con `border: line` en vez de sombras
- [ ] Espaciados con `space[…]`, no números mágicos
- [ ] Iconos Lucide 16/20/24 únicamente
- [ ] Badges con `<Badge variant="…">` en vez de View estilado

---

## 5. Cosas pendientes relacionadas con el rediseño

- **Fuente Inter**: opcional, añadir con `expo-font` si quieres el look premium completo. Fallback actual es el del sistema (se ve bien).
- **Dark mode**: pospuesto. Los tokens están pensados para facilitarlo en una fase posterior.
- **Animaciones de transición**: las de Expo Router bastan.

---

## 6. Quickstart para el siguiente sprint

```bash
# 1) Instalar deps
npm install

# 2) Verificar que la app arranca
npx expo start

# 3) Abrir Login → Home del agente → ver el nuevo look

# 4) Ir tachando pantallas en el orden de la Fase B
```

Cuando hayas migrado la Fase B completa, revisamos juntos antes de seguir.
