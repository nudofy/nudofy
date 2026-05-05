# Nudofy TPV — Documento de Proyecto

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Autor:** Jorge Catarsis  

---

## 1. Contexto: El ecosistema Nudofy

Nudofy es una plataforma SaaS para la gestión de ventas B2B en el canal de distribución. Está compuesta por dos productos:

### Nudofy Ventas (existente, en producción)
Aplicación móvil (iOS + Android) y panel web de administración para agentes comerciales y distribuidoras. Permite gestionar clientes, catálogos de proveedores, pedidos B2B y facturación.

**Stack técnico de Nudofy Ventas:**
- **App móvil:** React Native + Expo SDK 52 + Expo Router (file-based routing)
- **Web de marketing:** Next.js App Router + Tailwind CSS (`nudofy-web`)
- **Backend:** Supabase (PostgreSQL + PostgREST + Auth/GoTrue + Edge Functions en Deno)
- **Email transaccional:** Resend (`nudofyapp@gmail.com`)
- **Builds:** EAS Build (Expo Application Services)
- **Despliegue web:** Vercel

**Repositorios:**
- `nudofy-project` → app móvil (React Native)
- `nudofy-web` → web de marketing (Next.js)

**Planes actuales (tabla `plans` en Supabase):**
- Free / Free Pro (acceso gratuito temporal)
- Básico (9 €/mes) · Pro (19 €/mes) · Agencia (39 €/mes) · Agencia Pro (79 €/mes)

**Autenticación:** Supabase Auth con roles. Perfil `agents` en BD. Panel de administración con rol `super_admin`. Los agentes se dan de alta por invitación del admin o por autoregistro en `nudofy.com/registro`.

**GDPR/LOPD:** Sistema de aceptación de DPA (Acuerdo de Encargo de Tratamiento v1.0) en el registro web y en el primer login para agentes invitados. Edge Function `delete-account` para derecho al olvido.

**Arquitectura de la app móvil (Expo Router):**
```
app/
├── (auth)/          → login
├── (agent)/         → pantallas del agente (home, clientes, catalogos, pedidos, mas)
│   ├── _layout.tsx  → AgentProvider + guard DPA
│   ├── home.tsx
│   ├── clientes.tsx
│   ├── catalogos.tsx
│   ├── pedidos.tsx
│   ├── mas.tsx
│   ├── cliente/[id].tsx
│   ├── proveedor/[id].tsx
│   ├── catalogo/[id].tsx
│   ├── producto/[id].tsx
│   ├── pedido/nuevo.tsx
│   ├── pedido/[id].tsx
│   └── dpa-aceptar.tsx
├── (client)/        → portal del cliente (acceso con link mágico)
└── (admin)/         → panel administración Nudofy
    ├── dashboard.tsx
    ├── agentes.tsx
    ├── agente/[id].tsx
    ├── planes.tsx
    └── facturacion.tsx
```

**Componentes UI principales:** `Screen`, `TopBar`, `BottomTabBar`, `Button`, `Badge`, `Text`, `Icon`, `Avatar`, `Card`, `PressableCard`, `StatusBadge`

**Contextos y hooks clave:**
- `AgentContext` → datos del agente autenticado (compartido por todas las pantallas)
- `AuthContext` → sesión Supabase
- `ToastContext` → notificaciones toast
- `useAgent`, `useOrders`, `useClients`, `useSuppliers` → hooks de datos
- `useAdmin`, `useAdminAgents`, `useAdminAgentDetail` → hooks del panel admin

**Design system (src/theme/):**
- Brand: `#E73121` (rojo) — CTA primario
- Neutros cálidos: ink `#0A0A0A`, ink2 `#3F3F3F`, ink3 `#737373`, ink4 `#A3A3A3`
- Líneas: line `#EAEAEA`, line2 `#F4F4F4`
- Superficie: surface `#FAFAFA`, surface2 `#F5F5F5`
- Semánticos: success `#047857`, warning `#B45309`, danger `#B91C1C`

**Edge Functions en Supabase:**
- `invite-agent` → dar de alta agente desde el admin
- `register-agent` → autoregistro desde la web (JWT OFF)
- `delete-account` → borrado de cuenta (JWT OFF)

**Regla de builds:** SIEMPRE `eas build --profile production --platform all`. Nunca usar servidor de desarrollo Expo (versión incompatible). El usuario sube Android a Google Play Console (Internal Testing), Claude sube iOS con `eas submit --platform ios --latest`.

---

## 2. Nudofy TPV — Visión del producto

### 2.1 Qué es

Nudofy TPV es un segundo producto dentro del ecosistema Nudofy, orientado a **comercios físicos**: boutiques, papelerías, tiendas de juguetes, pop-ups, mercados y cualquier punto de venta al público.

Es una aplicación de Punto de Venta móvil que permite al comerciante gestionar su caja diaria, cobrar ventas en mostrador con múltiples métodos de pago, imprimir tickets y llevar el control de su actividad comercial.

### 2.2 Por qué tiene sentido dentro de Nudofy

- Comparte infraestructura con Nudofy Ventas (Supabase, Auth, catálogos de productos)
- Crea un ecosistema cerrado: la distribuidora usa Nudofy Ventas para vender a sus tiendas cliente, y esas tiendas usan Nudofy TPV para vender al consumidor final
- El catálogo de productos del proveedor puede fluir desde Nudofy Ventas hasta el TPV del comercio sin duplicar datos
- Monetización independiente con sus propios planes de suscripción

### 2.3 Perfil del cliente objetivo

Pequeño y mediano comercio físico español:
- 1 a 5 empleados
- Vende productos físicos (moda, regalos, decoración, juguetes, papelería…)
- Actualmente usa caja registradora básica, TPV de banco (solo cobro con tarjeta) o papel
- Necesita control de caja, historial de ventas y tickets, pero no quiere solución cara ni compleja

---

## 3. Funcionalidades del MVP

### 3.1 Gestión de caja
- **Apertura de caja:** importe inicial en efectivo al empezar el turno
- **Cierre de caja:** total vendido por método de pago, efectivo esperado vs real contado, diferencia
- **Historial de aperturas/cierres:** registro de todos los turnos

### 3.2 Venta en mostrador
- Búsqueda rápida de producto por nombre o referencia
- Añadir productos al carrito con cantidad
- Precio unitario editable (descuentos manuales)
- Subtotal y total con IVA
- Métodos de pago: efectivo, tarjeta, Bizum, mixto
- Si efectivo: cálculo automático de cambio (importe dado → vueltas)
- Confirmar venta → genera ticket

### 3.3 Tickets
- **Ticket normal:** nombre del comercio, fecha/hora, líneas de producto, subtotal, IVA, total, método de pago
- **Ticket regalo:** igual pero sin precios
- **Impresión:** Bluetooth a impresora térmica (Epson, Star) o envío por email/WhatsApp
- **Reimpresión:** desde el historial de ventas

### 3.4 Historial y reporting
- Listado de ventas del día con buscador
- Totales del día por método de pago
- Ventas de los últimos 30 días (gráfico simple)
- Exportar resumen en PDF

### 3.5 Catálogo de productos
- Alta manual: nombre, referencia, precio, IVA, categoría
- Imagen de producto (opcional)
- Integración futura: importar catálogo desde Nudofy Ventas

---

## 4. Funcionalidades fuera del MVP (roadmap)

- Gestión de stock e inventario
- Devoluciones y abonos
- Tarjetas de fidelización / descuentos por cliente
- Integración con TPV físico de cobro (Stripe Terminal)
- Multi-caja / multi-empleado
- Factura simplificada para clientes empresas
- App para tablet (modo mostrador horizontal)
- Conexión con Nudofy Ventas para pedidos de reposición automáticos al proveedor

---

## 5. Arquitectura técnica propuesta

### 5.1 Stack

| Capa | Tecnología |
|------|-----------|
| App móvil | React Native + Expo SDK 52 + Expo Router |
| Backend | Supabase (mismo proyecto que Nudofy Ventas, esquema separado) |
| Autenticación | Supabase Auth |
| Email | Resend |
| Impresión | react-native-thermal-printer o SDK Epson/Star vía Bluetooth |
| Builds | EAS Build |

### 5.2 Tablas nuevas en Supabase

```sql
stores           -- comercios (nombre, NIF, dirección, logo)
store_products   -- catálogo (nombre, ref, precio, IVA, stock)
cash_sessions    -- sesiones de caja (apertura, cierre, importe inicial)
tpv_sales        -- ventas (total, método de pago, caja asociada)
tpv_sale_items   -- líneas de venta (producto, cantidad, precio)
tpv_receipts     -- tickets (referencia, tipo normal/regalo, PDF)
```

### 5.3 Estructura del repo (nudofy-tpv)

```
nudofy-tpv/
├── app/
│   ├── (auth)/           → login, registro TPV
│   ├── (tpv)/
│   │   ├── _layout.tsx   → StoreProvider + guard
│   │   ├── home.tsx      → dashboard del comercio
│   │   ├── venta.tsx     → pantalla de venta en mostrador
│   │   ├── caja.tsx      → gestión de caja
│   │   ├── historial.tsx → ventas del día / historial
│   │   ├── catalogo.tsx  → productos del comercio
│   │   └── ajustes.tsx   → configuración
│   └── _layout.tsx
├── src/
│   ├── components/       → UI compartida (mismo design system)
│   ├── hooks/            → useCaja, useSales, useProducts
│   ├── contexts/         → StoreContext
│   └── theme/            → mismos tokens que Nudofy Ventas
└── supabase/
    └── functions/        → Edge Functions TPV
```

---

## 6. Design System

Reutilizar íntegramente el design system de Nudofy Ventas:
- Misma paleta de colores
- Mismos componentes: `Screen`, `TopBar`, `BottomTabBar`, `Button`, `Badge`, `Text`, `Icon`
- Mismos tokens de espaciado y radio
- Mismo patrón de `BottomTabBar` custom con `style={{ flex: 1 }}` en los `ScrollView`

Las 5 pestañas del TPV: **Vender · Caja · Historial · Catálogo · Ajustes**

---

## 7. Modelo de negocio

| Plan | Precio | Límites |
|------|--------|---------|
| Starter | 9 €/mes | 1 caja, 500 productos, ticket por email |
| Comercio | 19 €/mes | 2 cajas, ilimitados, impresión Bluetooth |
| Multi | 39 €/mes | Cajas ilimitadas, multi-empleado, reporting |

15 días de prueba gratuita sin tarjeta.

**Estrategia de lanzamiento:**
1. Validar con 5-10 comercios reales antes de construir
2. Primer canal: distribuidoras en Nudofy Ventas con tiendas cliente
3. Segundo canal: captación directa en `nudofy.com/tpv`
4. Competencia: Revo, iZettle, Tillpoint — posicionarse por debajo en precio y simplicidad

---

## 8. Decisiones pendientes antes de arrancar

1. **¿App separada o modo dentro de la misma app?** → Recomendación: app separada (`nudofy-tpv`). Perfiles de usuario distintos, distribución independiente en los stores.
2. **Impresión:** validar librería y hardware real antes de comprometer fecha. Alternativa MVP: PDF compartido por WhatsApp.
3. **IVA:** decidir si el comerciante introduce precios con o sin IVA. En España lo habitual es PVP con IVA incluido.
4. **Stock:** no incluir en MVP. Validar demanda real primero.
5. **¿Mismo Apple Developer / Google Play account o uno nuevo?** Para Nudofy TPV como app separada necesita su propio Bundle ID (`com.nudofy.tpv`).

---

## 9. Criterios de éxito del MVP

- Un comerciante puede abrir caja, realizar 10 ventas y cerrar caja en menos de 5 minutos sin formación previa
- El ticket generado es válido fiscalmente (nombre, NIF, fecha, desglose IVA)
- La app funciona offline para venta básica y sincroniza al recuperar conexión
- Tiempo de carga de la pantalla de venta < 1 segundo

---

*Documento preparado como briefing de inicio de proyecto para Nudofy TPV.*  
*Revisión y validación con usuarios reales pendiente antes de arrancar desarrollo.*
