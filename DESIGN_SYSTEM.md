# Nudofy · Libro de estilo

> Versión 2.0 — Rediseño minimalista premium
> Actualizado: Abril 2026

---

## 1. Filosofía

Nudofy es una herramienta de trabajo. El comercial la abre 30 veces al día delante de un cliente. El diseño debe ser **invisible, rápido y respetuoso del contenido**.

**Principios rectores:**

1. **Silencio visual.** El blanco y el gris dominan. El color solo aparece cuando el usuario puede actuar.
2. **Una sola voz.** El rojo Nudofy (#E73121) se reserva para la acción primaria. Nada más compite con él.
3. **Jerarquía por tipografía y espacio**, no por color ni por bordes gruesos.
4. **Contenido > cromo.** Productos, pedidos y clientes son los protagonistas. Todo lo demás es marco.
5. **Consistencia radical.** Mismos tamaños, mismos radios, mismos espaciados en toda la app.

**Referencias visuales:** Linear, Vercel, Notion, Stripe Dashboard.

---

## 2. Color

### Paleta principal

| Token | Hex | Uso |
|---|---|---|
| `brand` | `#E73121` | CTA primario, acento único, estados activos críticos |
| `brandHover` | `#D22818` | Estado pressed del CTA |
| `brandSoft` | `#FEF2F1` | Fondo tintado muy sutil (badges, highlights) |

### Neutros (99% de la UI)

Escala de grises cálida — ligeramente desplazada hacia el rojo para armonizar con la marca.

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0A0A0A` | Texto principal, titulares |
| `ink2` | `#3F3F3F` | Texto secundario, descripciones |
| `ink3` | `#737373` | Texto terciario, metadatos |
| `ink4` | `#A3A3A3` | Placeholders, iconos inactivos |
| `line` | `#EAEAEA` | Bordes, divisores |
| `line2` | `#F4F4F4` | Divisores muy sutiles, hover backgrounds |
| `surface` | `#FAFAFA` | Fondo de la app |
| `surface2` | `#F5F5F5` | Fondo de inputs, chips |
| `white` | `#FFFFFF` | Tarjetas, modales, fondos interactivos |

### Semánticos

Solo se usan cuando hay semántica real (éxito, advertencia, error). Nunca decorativos.

| Token | Hex | Uso |
|---|---|---|
| `success` | `#047857` | Pedidos confirmados, checks |
| `successSoft` | `#ECFDF5` | Fondo badges de éxito |
| `warning` | `#B45309` | Borradores, avisos |
| `warningSoft` | `#FFFBEB` | Fondo badges de aviso |
| `danger` | `#B91C1C` | Errores destructivos (distinto del brand) |
| `dangerSoft` | `#FEF2F2` | Fondo de estados de error |

### Reglas de uso del color

- ✅ El rojo solo en: botón primario, icono activo del tab bar, badge de notificación, enlaces inline muy puntuales.
- ❌ Nunca rojo en: headers completos, barras de progreso genéricas, iconos decorativos, fondos de tarjetas.
- ✅ Los grises hacen todo el trabajo pesado.
- ❌ No mezclar `brand` con `danger` en la misma vista.

---

## 3. Tipografía

**Familia:** Inter (Google Fonts, gratuita, optimizada para pantalla).
Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

### Escala

| Nombre | Tamaño | Line-height | Peso | Letter-spacing | Uso |
|---|---|---|---|---|---|
| `display` | 32 | 38 | 600 | -0.5 | Cifras grandes (hero KPI) |
| `title` | 22 | 28 | 600 | -0.3 | Título de pantalla |
| `heading` | 17 | 24 | 600 | -0.2 | Sección, card header |
| `body` | 15 | 22 | 400 | 0 | Texto principal |
| `bodyMedium` | 15 | 22 | 500 | 0 | Énfasis, nombres |
| `small` | 13 | 18 | 400 | 0 | Metadatos, etiquetas |
| `caption` | 11 | 14 | 500 | 0.3 | Labels uppercase, tags |

### Reglas

- Solo 3 pesos: 400 (regular), 500 (medium), 600 (semibold). Nunca bold 700.
- Títulos de sección en `caption` uppercase color `ink3`. No en heading grande.
- Números siempre con `font-variant: tabular-nums` para alinear columnas.

---

## 4. Espaciado

Escala de 4px. Usar SIEMPRE los tokens, nunca valores arbitrarios.

| Token | Valor | Uso típico |
|---|---|---|
| `space.0` | 0 | — |
| `space.1` | 4 | Gap entre icono y label |
| `space.2` | 8 | Gap en listas densas |
| `space.3` | 12 | Gap estándar en cards |
| `space.4` | 16 | Padding horizontal estándar |
| `space.5` | 20 | Padding de cards |
| `space.6` | 24 | Separación entre secciones |
| `space.8` | 32 | Separación amplia |
| `space.10` | 40 | Bloques principales |
| `space.12` | 48 | Hero spacing |

**Padding horizontal de pantalla:** siempre `space.4` (16px).
**Gap vertical entre secciones:** `space.6` (24px).

---

## 5. Radios y sombras

### Radios

| Token | Valor | Uso |
|---|---|---|
| `radius.sm` | 6 | Chips, tags, badges pequeños |
| `radius.md` | 10 | Inputs, botones, cards pequeñas |
| `radius.lg` | 14 | Cards estándar |
| `radius.xl` | 20 | Modales, bottom sheets |
| `radius.full` | 999 | Avatares, píldoras |

### Sombras

Muy sutiles. Preferir bordes antes que sombras.

| Token | Uso |
|---|---|
| `shadow.none` | Defecto. Usar borde `line`. |
| `shadow.sm` | Botón primario elevado |
| `shadow.md` | Modales, popovers |

```ts
shadow.sm = {
  shadowColor: '#0A0A0A',
  shadowOpacity: 0.04,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
}
```

---

## 6. Iconografía

**Librería oficial:** [Lucide](https://lucide.dev) (`lucide-react-native`).

### Reglas

- **Tamaños permitidos:** 16, 20, 24. Nunca otros.
- **Stroke width:** 1.75 por defecto. 1.5 para iconos grandes (24+). Nunca 2 o más — rompe la elegancia.
- **Color:** heredan de `ink2` o `ink3`. El rojo solo en iconos de estado activo o CTA.
- **Nunca** usar emojis (🔔 ＋ ▦) como iconos de UI.

### Catálogo de iconos habituales

| Contexto | Icon Lucide |
|---|---|
| Inicio / Home | `LayoutGrid` |
| Clientes | `Users` |
| Proveedores / Catálogos | `Package` |
| Pedidos | `ClipboardList` |
| Más / Ajustes | `Menu` o `MoreHorizontal` |
| Nuevo pedido | `Plus` |
| Buscar | `Search` |
| Notificación | `Bell` |
| Volver | `ChevronLeft` |
| Avanzar | `ChevronRight` |
| Cerrar | `X` |
| Editar | `Pencil` |
| Eliminar | `Trash2` |
| Filtrar | `SlidersHorizontal` |
| Éxito | `Check` / `CheckCircle2` |
| Advertencia | `AlertTriangle` |

---

## 7. Componentes

### Botones

**Primario** — acción principal de la pantalla. Solo uno por pantalla.

```
background: brand
text: white
height: 48
radius: md (10)
font: bodyMedium (15/500)
shadow: none (borde interno no visible)
pressed: brandHover
```

**Secundario** — acción alternativa.

```
background: white
border: 1px line
text: ink
height: 48
radius: md
```

**Ghost** — acción terciaria, en listas.

```
background: transparent
text: ink2
height: 44
```

**Destructivo** — solo para eliminar.

```
background: white
border: 1px dangerSoft
text: danger
```

### Inputs

```
background: surface2 (#F5F5F5) en rest, white en focus
border: 1px transparent → 1px ink (focus)
height: 48
radius: md
padding: 12 16
font: body
placeholder: ink4
```

Label arriba en `caption` color `ink3`. Nunca flotante.

### Cards

```
background: white
border: 1px line
radius: lg (14)
padding: space.5 (20)
shadow: none
```

**Card presionable** — mismo estilo, sin elevación. Al presionar: `opacity: 0.7` (iOS) o `ripple` (Android).

### Badges / Chips

```
height: 24
padding: 4 10
radius: sm
font: caption (11/500)
```

Variantes por estado:
- `draft` → warningSoft bg, warning text
- `confirmed` → successSoft bg, success text
- `sent` → brandSoft bg, brand text
- `cancelled` → line2 bg, ink3 text

### Top bar

Simple: blanco, texto ink, borde inferior line de 1px. Sin gradientes, sin barras rojas.

```
height: 56
padding: 0 16
background: white
borderBottom: 1px line
title: heading
```

### Tab bar (bottom)

```
background: white
borderTop: 1px line
height: 56 + safeArea
```

Icono 24px, label 11px caption. Activo: icono `brand` + label `ink`. Inactivo: icono `ink4` + label `ink4`.
**Eliminar el borde superior rojo actual** — demasiado ruidoso.

### Avatar

Iniciales sobre fondo `surface2`, texto `ink2`. Nunca colores aleatorios por usuario (rompe el minimalismo).

---

## 8. Layout y composición

- **Una acción primaria por pantalla.** Todo lo demás es secundario.
- **Listas** > `FlatList` con separador `line` de 1px entre items. Altura mínima 56px.
- **Secciones** separadas por `space.6` vertical. Título de sección en `caption` uppercase.
- **Vacíos** con icono grande (40px) color `ink4`, título `heading`, subtítulo `body` color `ink3`, botón primario.

---

## 9. Movimiento

- **Duraciones:** 150ms (micro), 250ms (estándar), 350ms (modales).
- **Easing:** `ease-out` (React Native default es suficiente).
- **Transiciones de navegación:** las nativas de Expo Router. No animar manualmente.
- **Press feedback:** `activeOpacity: 0.7` en TouchableOpacity, siempre.

---

## 10. Accesibilidad

- Contraste mínimo AA (4.5:1) para texto, AAA (7:1) en contenido crítico.
- Touch targets ≥ 44×44.
- `accessibilityLabel` en todo TouchableOpacity sin texto visible.
- Dark mode: pendiente (fase posterior).

---

## 11. Do / Don't

✅ Usar `ink3` para metadatos, no gris cualquiera.
✅ Botón primario con `brand`, secundario con borde `line`.
✅ Iconos Lucide 20px stroke 1.75.

❌ Emojis como iconos.
❌ Bordes rojos en headers o tab bars.
❌ Quickcards con fondos de colores distintos.
❌ Más de 3 pesos de fuente.
❌ Sombras pronunciadas.
