# NUDOFY — Documento de Especificaciones del Proyecto
*Versión 1.0 · Abril 2026*

---

## 1. IDENTIDAD DEL PROYECTO

| Campo | Valor |
|-------|-------|
| **Nombre** | Nudofy |
| **Dominio** | nudofy.com |
| **Email soporte** | info@nudofy.com |
| **Email facturas** | facturas@nudofy.com |
| **Slogan** | Catalogs and Sales |
| **Tipo** | SaaS para agentes comerciales |
| **Plataformas** | Web + iOS + Android |
| **Monetización** | Suscripción mensual por usuario |

---

## 2. IDENTIDAD VISUAL

### Colores
- **Azul marino principal**: `#1C3A5C`
- **Azul medio**: `#5B9BD5`
- **Azul claro**: `#3B7CC4`
- **Morado app**: `#534AB7` (usado en la interfaz de la app, no en el logo)
- **Fondo crema**: `#F0EEE8`
- **Fondo oscuro**: `#0D1B2A`

### Tipografía
- **Logo**: Outfit (Google Fonts) — peso 500 para el nombre, 300 para .app
- **App**: System UI / -apple-system (nativa del dispositivo)
- **Admin web**: DM Sans

### Logo
- **Símbolo**: Curva S con dos puntos azules en los extremos (inspirado en nudo marinero)
- **Wordmark**: "nudofy" en Outfit 500 + ".app" en Outfit 300
- **Número de pedido**: NUD-YYYY-XXXX

### Archivos de diseño
Todos los mockups están en la carpeta `/mockups/` como archivos HTML.

---

## 3. ARQUITECTURA DE USUARIOS

```
Nudofy Admin (panel web)
├── Agentes individuales (Plan Básico o Pro)
│   └── Clientes del agente
└── Empresas (Plan Agencia o Agencia Pro)
    ├── Administrador de empresa
    ├── Agentes de la empresa
    └── Clientes de cada agente
```

### Acceso
- **Solo por invitación** — no hay registro libre
- Nudofy Admin da de alta agentes y empresas
- Los agentes dan de alta a sus clientes
- Los clientes acceden por invitación del agente

---

## 4. PLANES Y PRECIOS

| Plan | Precio | Productos | Clientes | Agentes |
|------|--------|-----------|----------|---------|
| **Básico** | 15 €/mes | 100 | 20 | 1 |
| **Pro** | 25 €/mes | 2.000 | 200 | 1 |
| **Agencia** | 45 € + 15 €/agente | 5.000 | 500 | hasta 10 |
| **Agencia Pro** | 150 € + 20 €/agente | Ilimitados | Ilimitados | Ilimitados |

### Comportamiento al superar límites
- Se avisa al agente automáticamente
- Puede seguir usando la app
- No puede añadir nuevos clientes ni productos hasta cambiar de plan

---

## 5. STACK TECNOLÓGICO

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| **Frontend web + app móvil** | React Native + Expo | Un solo código para iOS, Android y web |
| **Backend** | Node.js + Express | API REST |
| **Base de datos** | PostgreSQL en Supabase | Interfaz visual, fácil gestión |
| **Autenticación** | Supabase Auth | Login, recuperación contraseña |
| **Pagos** | Stripe | Estándar SaaS, cobro automático |
| **Emails** | Resend | Emails transaccionales con dominio nudofy.com |
| **PDFs** | Generación server-side | Pedidos en PDF para agentes |
| **Almacenamiento** | Supabase Storage | Imágenes de productos y catálogos |
| **Deploy backend** | Railway | Servidor Node.js |
| **Deploy web admin** | Vercel | Panel de administración |

---

## 6. PANTALLAS DISEÑADAS

### Acceso (compartidas)
| ID | Nombre | Descripción |
|----|--------|-------------|
| P-01 | Splash | Pantalla de bienvenida con logo |
| P-02 | Login | Email + contraseña, sin registro libre |

### Portal del Agente
| ID | Nombre | Descripción |
|----|--------|-------------|
| A-01 | Inicio agente | Dashboard con KPIs, accesos rápidos, últimos pedidos |
| A-02 | Mis clientes | Lista de clientes con buscador y filtros |
| A-03 | Ficha de cliente | 4 pestañas: Ficha / Pedidos / Notas / Portal |
| A-03b | Ficha cliente · Portal | Acceso, invitación y catálogos visibles por cliente |
| A-04 | Mis proveedores | Lista de proveedores con condiciones comerciales |
| A-05 | Catálogos | Vista grid proveedores → catálogos del proveedor |
| A-06 | Ficha de producto | Detalle del producto en solo lectura |
| A-07 | Nuevo pedido | 4 vistas: pedidos abiertos → editar → productos → carrito |
| A-08 | Resumen de pedido | Confirmación con número NUD-YYYY-XXXX |
| A-09 | Historial de pedidos | 3 pestañas: Realizados / Pendientes / Cancelados |
| A-10 | Notificaciones | Notificaciones con colores semánticos |
| A-11 | Estadísticas | KPIs, gráficos, rankings de clientes y productos |
| A-12 | Perfil y ajustes | Datos, firma PDF, notificaciones, plan, facturas |

### Portal del Cliente
| ID | Nombre | Descripción |
|----|--------|-------------|
| C-01 | Inicio cliente | Bienvenida, tarjeta agente, accesos rápidos |
| C-02 | Catálogo | 3 vistas: proveedores → catálogos → productos con carrito |
| C-03 | Carrito | 2 vistas: mis carritos (uno por proveedor) → carrito del proveedor |
| C-04 | Confirmación | Check verde, resumen, timeline de estado |
| C-05 | Mis pedidos | Historial con 2 estados: Recibido / Enviado al proveedor |
| C-06 | Detalle de pedido | Solo lectura, descarga PDF, contactar agente |
| C-07 | Mi perfil | Datos establecimiento, notificaciones, seguridad |

### Panel de Administración (web)
| ID | Nombre | Descripción |
|----|--------|-------------|
| ADM-01 | Dashboard | KPIs globales, ingresos, gráficos, últimos agentes |
| ADM-02 | Agentes y empresas | Lista unificada con alta de agente y alta de empresa |
| ADM-03 | Ficha de agente | Datos, plan, uso, historial de facturas |
| ADM-04 | Planes | 4 planes con precios y límites editables |
| ADM-05 | Facturación | Cobro mensual, gestión de impagos, exportación CSV |
| ADM-06 | Configuración | Datos Nudofy, email, fiscal, Stripe, seguridad |
| ADM-07 | Ficha de empresa | Agentes de la empresa, uso del plan, facturas |

---

## 7. FLUJOS CLAVE

### Flujo de pedido del agente
1. Agente crea pedido → selecciona proveedor → añade productos al carrito
2. Revisa el carrito → puede añadir observaciones y código de descuento
3. Confirma → genera PDF → decide cuándo enviarlo al proveedor
4. Puede enviar propuesta al cliente antes de confirmar

### Flujo de pedido del cliente
1. Cliente navega catálogo → añade productos al carrito (un carrito por proveedor)
2. Confirma → pedido llega al agente como notificación
3. **El agente revisa y decide cuándo enviarlo al proveedor** (no va directo)
4. Cliente ve estado: Recibido por agente → Enviado al proveedor

### Flujo de acceso del cliente al portal
1. Agente va a A-03 → pestaña Portal → activa acceso del cliente
2. Agente selecciona qué proveedores y catálogos ve el cliente
3. Agente envía invitación → cliente recibe email con enlace
4. Cliente accede con sus credenciales y ve solo lo que el agente ha habilitado

### Flujo de facturación
1. Día 1 de cada mes → Nudofy genera facturas automáticas por agente/empresa
2. Cobro automático vía Stripe con tarjeta o IBAN del agente
3. Agente recibe factura por email (facturas@nudofy.com)
4. Si falla el cobro → aviso al agente → 7 días → suspensión automática
5. Admin puede cobrar manualmente desde ADM-05

---

## 8. REGLAS DE NEGOCIO IMPORTANTES

- **Un pedido = un proveedor** — no se pueden mezclar proveedores en un pedido
- **El agente controla todo** — el cliente solo ve lo que el agente le habilita
- **Catálogos**: un proveedor puede tener múltiples catálogos (ej. "Primavera 2026", "Navidad 2025")
- **Búsqueda por código de barras** en todos los buscadores de producto
- **Tipos de cliente**: campo libre definido por el agente (no lista fija)
- **Importación de catálogos**: Excel (mapeo automático) y PDF (extracción con IA)
- **Estados de catálogo**: Activo / Archivado
- **Números de pedido**: formato NUD-YYYY-XXXX (ej. NUD-2026-0001)
- **Números de factura**: formato NUD-FAC-YYYY-XXXX

---

## 9. ESTRUCTURA DE BASE DE DATOS (esquema inicial)

```sql
-- Usuarios y roles
users (id, email, password_hash, role, created_at)
-- role: 'nudofy_admin' | 'company_admin' | 'agent' | 'client'

-- Empresas (Plan Agencia)
companies (id, name, nif, address, plan, created_at)
company_users (company_id, user_id, role) -- 'admin' | 'agent'

-- Agentes
agents (id, user_id, company_id nullable, name, email, phone,
        business_name, nif, plan, stripe_customer_id, active)

-- Clientes
clients (id, agent_id, name, fiscal_name, nif, email, phone,
         address, client_type, payment_method, iban, created_at)

-- Proveedores
suppliers (id, agent_id, name, contact, conditions, active)

-- Catálogos
catalogs (id, supplier_id, name, season, status, created_at)
-- status: 'active' | 'archived'

-- Productos
products (id, catalog_id, name, reference, barcode, price,
          description, image_url, active)

-- Acceso cliente al portal
client_portal_access (id, client_id, supplier_id, catalog_id nullable,
                       enabled, invited_at, last_access)

-- Pedidos
orders (id, agent_id, client_id nullable, supplier_id, catalog_id,
        status, total, discount_code, notes, pdf_url, created_at, sent_at)
-- status: 'draft' | 'confirmed' | 'sent_to_supplier' | 'cancelled'

-- Líneas de pedido
order_items (id, order_id, product_id, quantity, unit_price, total)

-- Facturas (Nudofy a agentes)
invoices (id, agent_id, company_id nullable, plan, amount, iva,
          total, status, stripe_payment_id, period, created_at)
-- status: 'paid' | 'pending' | 'overdue'

-- Notificaciones
notifications (id, user_id, type, title, body, read, created_at)
```

---

## 10. FASES DE DESARROLLO

### Fase 1 — Cimientos (2-3 semanas)
- Proyecto Supabase configurado
- Esquema de base de datos creado
- Autenticación (login, logout, recuperación contraseña)
- Alta de agentes desde el admin
- Estructura base de la app con React Native + Expo

### Fase 2 — Núcleo del agente (3-4 semanas)
- CRUD de proveedores
- CRUD de catálogos y productos
- CRUD de clientes
- Creación y gestión de pedidos
- Generación de PDF de pedido

### Fase 3 — Portal del cliente (2 semanas)
- Sistema de invitación por email (Resend)
- Acceso del cliente con sus credenciales
- Vista de catálogo filtrada por lo que el agente habilita
- Carrito y confirmación de pedido
- Notificación al agente cuando el cliente hace un pedido

### Fase 4 — Panel de administración (2 semanas)
- Dashboard con KPIs
- Alta de agentes y empresas con formularios
- Gestión de planes
- Facturación automática con Stripe
- Configuración global

### Fase 5 — App móvil (2 semanas)
- Build iOS con Expo
- Build Android con Expo
- Publicación en App Store y Google Play

---

## 11. VARIABLES DE ENTORNO NECESARIAS

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend (emails)
RESEND_API_KEY=

# App
APP_URL=https://nudofy.com
ADMIN_URL=https://admin.nudofy.com
```

---

## 12. INSTRUCCIONES PARA CLAUDE CODE

Eres el desarrollador principal de **Nudofy**, una app SaaS para agentes comerciales.

El diseño visual completo está en la carpeta `/mockups/` — son archivos HTML que muestran exactamente cómo debe verse cada pantalla. Úsalos como referencia fiel para implementar la UI.

**Principios de desarrollo:**
- Fidelidad total a los mockups — colores, tipografías, espaciados y flujos
- Código limpio, modular y bien comentado
- Un componente por pantalla, siguiendo la nomenclatura de los mockups
- Validaciones en cliente y servidor
- Manejo de errores en todas las llamadas a la API
- Responsive — diseñado mobile-first

**Colores principales:**
```js
const colors = {
  navy: '#1C3A5C',
  blue: '#5B9BD5',
  blueMid: '#3B7CC4',
  purple: '#534AB7',      // color principal de la app
  purpleLight: '#EEEDFE',
  green: '#3B6D11',
  greenLight: '#EAF3DE',
  amber: '#BA7517',
  amberLight: '#FAEEDA',
  red: '#A32D2D',
  redLight: '#FCEBEB',
  bg: '#f7f7f5',
  white: '#ffffff',
  text: '#1a1a1a',
  textLight: '#999999',
}
```

**Empezar siempre por la Fase 1** a menos que se indique otra cosa.
