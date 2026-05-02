# Estrategia de precios — Nudofy

> Documento de trabajo. Mercado España + Europa. Precios en EUR, sin IVA.
> Última actualización: 30 abril 2026 (v2 — reposicionamiento tras análisis AgentesCloud).

---

## 1. Resumen ejecutivo (TL;DR)

**Nudofy NO compite con AgentesCloud.** Es un producto distinto, dirigido a otro perfil de cliente y por eso los precios no se comparan tier-a-tier.

- **AgentesCloud**: ERP completo para el agente comercial autónomo tradicional. CRM con visitas, presupuestos, comisiones, gastos, almacén. Producto maduro, 10+ años de mercado.
- **Nudofy**: portal de pedidos B2B con app comercial moderna, dirigido a **distribuidoras, marcas que venden a tiendas y showrooms multi-marca**. El héroe del producto es el portal del cliente: que el cliente final (la tienda) entre desde su móvil y se autoabastezca.

### Planes propuestos

| Plan         | Mensual    | Anual (€/mes equivalente) | Anual total | Pensado para                                |
|--------------|------------|---------------------------|-------------|---------------------------------------------|
| **Básico**   | **14€/mes** | 11,67€/mes              | **140€/año** | Distribuidora pequeña arrancando            |
| **Pro** (★)  | **34€/mes** | 28,33€/mes              | **340€/año** | Distribuidora mediana / showroom / marca    |
| **Agencia**  | **79€/mes** | 65,83€/mes              | **790€/año** | Showroom grande, multi-marca, multi-empresa |

Add-on común: **+6€/mes por usuario adicional** (Pro y Agencia).

### Por qué estos números

- **Coste de infraestructura** por cuenta: 3-16€/mes según el tier → todos los planes mantienen **margen bruto del 75-82%** (sano para un SaaS B2B, mínimo 70%).
- **Posicionamiento**: por encima de AgentesCloud Profesional (12,90€) y Avanzado (24,90€) en precio, pero por **otro motivo** (portal cliente, app moderna, variantes en matriz), no por más features de gestión.
- **Anclaje**: Agencia a 79€ hace que Pro a 34€ se vea como "el plan obvio".
- **Ratio anual = 10× el mensual** → 2 meses gratis ≈ 17% descuento (estándar SaaS).

---

## 2. Reposicionamiento: por qué Nudofy NO es AgentesCloud

Esta sección es la más importante del documento. Si esto no queda claro en la web y en el discurso comercial, el cliente comparará Nudofy con AgentesCloud y perderá.

### 2.1 Lo que AgentesCloud hace y Nudofy no quiere hacer

AgentesCloud cubre, entre otras cosas: CRM con visitas y notas de voz, planificación de rutas con geolocalización, presupuestos completos con conversión a pedido, liquidación de comisiones, facturas de comisiones, gestión de gastos del agente, almacén de depósito con múltiples almacenes, hasta 21 tarifas por producto, datos logísticos (cajas/palé), productos similares y complementarios, múltiples personas de contacto por cliente, carga masiva Excel en todos los módulos, hasta 3 tipos de IVA por pedido, 3 niveles de descuento por línea.

**Esto NO es el producto que Nudofy quiere ser.** Construir todo eso son 12+ meses, y aunque se construyera, no se ganaría: AgentesCloud lleva 10+ años, tiene acuerdo con CGAC y está consolidado en el segmento del agente autónomo tradicional.

### 2.2 Lo que Nudofy hace y AgentesCloud no hace

| Diferenciador                                      | Nudofy | AgentesCloud |
|----------------------------------------------------|:------:|:------------:|
| Portal del cliente B2B (catálogo + carrito propio) |   ✅   |      ❌      |
| Cliente final hace sus pedidos sin pasar por agente|   ✅   |      ❌      |
| Variantes en matriz (talla × color × material)     |   ✅   |      ❌      |
| Stock por SKU/variante                             |   ✅   |      ❌      |
| App React Native moderna (iOS/Android)             |   ✅   |   parcial    |
| Dominio propio para portal cliente                  |   ✅   |      ❌      |
| White-label completo del portal                     |   ✅   |      ❌      |
| API REST + webhooks                                 |   ✅   |      ❌      |

### 2.3 Cliente ideal de Nudofy

**No es** el agente comercial autónomo tradicional que necesita CRM, gestión de visitas, comisiones y gastos. **Para ese cliente, AgentesCloud es mejor producto.**

**Sí es**:

1. **Distribuidora pequeña/mediana** que vende a tiendas y quiere dar a esas tiendas un portal de pedidos online en lugar de recibir todos los pedidos por WhatsApp/email.
2. **Marca que vende a través de canal B2B** (moda, cosmética, decoración, papelería…) y quiere ofrecer a sus tiendas-cliente un catálogo digital con sus precios.
3. **Showroom multi-marca** (sobre todo en moda y mobiliario) con varios comerciales que enseñan colecciones a tiendas y necesitan tomar pedidos con variantes (tallas y colores) sobre la marcha.
4. **Agencia de representación moderna** que quiere ofrecer a sus clientes una experiencia digital más allá del Excel y el PDF.

### 2.4 Mensaje en la web (sugerencia)

Hoy la web debería decir algo como:

> **Da a tus clientes un portal de pedidos B2B con su propio catálogo, sus precios y desde su móvil.**
>
> Tu equipo comercial toma pedidos al instante con variantes y stock en tiempo real. Tus clientes ven el catálogo con sus precios, hacen sus pedidos solos y tú los recibes ordenados en tu app.

NO debería decir "App de gestión comercial para agentes" (porque ahí pierde frente a AgentesCloud).

---

## 3. Análisis de competencia (actualizado)

### 3.1 Competidor principal en España: AgentesCloud

| Plan AgentesCloud | Precio   | Incluye                                                  |
|-------------------|----------|----------------------------------------------------------|
| Profesional       | 12,90€   | 1 usuario, 5 firmas, 10.000 productos, +6,90€ usuario     |
| Avanzado          | 24,90€   | 2 usuarios, 13 firmas, 60.000 productos                  |
| Premium           | 49,90€   | Usuarios, firmas y productos ilimitados                  |

**Características clave**: ERP completo (CRM + visitas + comisiones + gastos + almacén), fuerte en agente tradicional. **Sin portal cliente B2B**.

### 3.2 Resto del panorama

| Competidor       | Precio                                       | Posicionamiento                              |
|------------------|----------------------------------------------|----------------------------------------------|
| Order Sender     | desde 6€/agente/mes (13€ con catálogo+rutas) | Toma de pedidos pura, muy básico             |
| ForceManager     | desde 15€/agente/mes (10€ con CGAC)          | CRM móvil, no enfocado a catálogo            |
| SuperVentaMovil  | "por vendedor sin mínimos"                   | Toma pedidos + rutas                         |
| Pepperi          | $48-128 USD/usuario/mes                      | Enterprise B2B (gold standard caro)          |
| Onsight          | desde $25 USD/mes                            | Toma de pedidos B2B móvil                    |
| B2B Wave         | $19 PAYG, $295/mes Pro                       | E-commerce B2B (no app móvil agente)         |
| LogiCommerce B2B | desde 99€/mes                                | Plataforma B2B ecommerce (no móvil)          |

### 3.3 Lectura del mercado

- En España hay **dos extremos**: ERPs para agentes (AgentesCloud, ForceManager, InaCatalog) y plataformas B2B ecommerce (LogiCommerce, OpenTiendas).
- **Nadie cubre bien el medio**: la distribuidora que quiere a la vez (a) app comercial moderna para tomar pedidos y (b) portal cliente B2B donde sus tiendas hacen sus propios pedidos. **Ese es el hueco de Nudofy.**
- Los competidores internacionales (Onsight, Pepperi, B2B Wave) sí cubren ese hueco, pero ninguno tiene presencia fuerte en España y ninguno está en español.

---

## 4. Costes de infraestructura

> Asumiendo 100 cuentas activas en steady state. Recalcular cuando se llegue a 500/1.000.

### 4.1 Costes fijos (compartidos entre todas las cuentas)

| Servicio              | Plan                    | Coste/mes | Por cuenta (÷100) |
|-----------------------|-------------------------|-----------|-------------------|
| Supabase Pro          | $25 base                | ~23€      | 0,23€             |
| EAS Production        | $199 (50K MAU updates)  | ~184€     | 1,84€             |
| Resend Pro            | $20 (50K emails)        | ~18,50€   | 0,19€             |
| Dominio + SSL + DNS   | varios                  | ~5€       | 0,05€             |
| Monitoring (Sentry…)  | starter                 | ~25€      | 0,25€             |
| App Store + Play      | 99$ + 25$ una vez       | amortizar | ~0,15€            |
| **Total fijo**        |                         | **~256€** | **~2,71€/cuenta** |

### 4.2 Costes variables por cuenta

| Tipo de cuenta            | Volumen                                       | Coste total/mes |
|---------------------------|-----------------------------------------------|-----------------|
| **Básico**                | 1 usuario, 2 firmas, 2K productos, 50 clientes  | **~3-4€**     |
| **Pro**                   | 3 usuarios, 10 firmas, 25K productos, 500 clientes | **~6-9€**  |
| **Agencia**               | 10 usuarios, ilimitado, 100K productos, ilimitado | **~14-22€** |

### 4.3 Margen bruto resultante

| Plan       | Precio | Coste estimado | Margen bruto | Saludable (≥70%)  |
|------------|--------|----------------|--------------|-------------------|
| Básico     | 14€    | ~3,50€         | **75%**      | ✅                |
| Pro        | 34€    | ~7,50€         | **78%**      | ✅                |
| Agencia    | 79€    | ~17€           | **78%**      | ✅                |

> **Aviso**: a partir de 500-1.000 cuentas hay que revisar la arquitectura. Subir a Supabase Team ($599/mes) o partir en organizaciones, considerar CDN propio (Cloudflare R2/Bunny) para storage de imágenes (es lo que peor escala con egress).

---

## 5. Planes detallados

### 5.1 Matriz comparativa

#### Límites de uso

| Recurso                       | Básico        | Pro (★)        | Agencia              |
|-------------------------------|---------------|----------------|----------------------|
| Usuarios agente incluidos     | 1             | 3              | 10                   |
| Usuarios adicionales          | no permitido  | +6€/mes c/u    | +6€/mes c/u          |
| Firmas / marcas representadas | 2             | 10             | Ilimitadas           |
| Productos (total catálogo)    | 2.000         | 25.000         | 100.000              |
| Variantes por producto        | 10            | Ilimitadas     | Ilimitadas           |
| Clientes (tiendas)            | 50            | 500            | Ilimitados           |
| Tarifas comerciales           | 1             | 5              | Ilimitadas           |
| Pedidos / mes                 | Ilimitados    | Ilimitados     | Ilimitados           |
| Histórico de pedidos          | 6 meses       | 24 meses       | Sin límite           |
| Almacenamiento de imágenes    | 2 GB          | 20 GB          | 100 GB               |

#### Funcionalidades

| Funcionalidad                                    | Básico | Pro (★) | Agencia |
|--------------------------------------------------|:------:|:-------:|:-------:|
| **Catálogo y productos**                         |        |         |         |
| Gestión de proveedores y catálogos               | ✅     | ✅      | ✅      |
| Productos con imagen principal                   | ✅     | ✅      | ✅      |
| Imágenes adicionales por producto                | hasta 3| hasta 10| Ilimitadas |
| Variantes y atributos en matriz (talla × color)  | básico¹| ✅      | ✅      |
| Importación de catálogos vía CSV/Excel           | manual | ✅      | ✅ + asistida |
| Códigos de barras (escaneo cámara)               | ❌     | ✅      | ✅      |
| **Clientes y tarifas**                           |        |         |         |
| Ficha de cliente con direcciones de envío         | ✅     | ✅      | ✅      |
| Tarifas personalizadas por cliente                | ❌     | ✅      | ✅      |
| Histórico de compras por cliente                  | 30 días| ✅      | ✅      |
| **Pedidos**                                      |        |         |         |
| Toma de pedidos rápida desde la app comercial    | ✅     | ✅      | ✅      |
| Borradores con autosave                          | ✅     | ✅      | ✅      |
| Estados de pedido y notificaciones                | ✅     | ✅      | ✅      |
| Envío automático del PDF al proveedor             | ❌     | ✅      | ✅      |
| Duplicar / repedir desde histórico                | ❌     | ✅      | ✅      |
| **Portal del cliente** (★ diferenciador clave)   |        |         |         |
| Portal cliente con catálogo + carrito             | ✅     | ✅      | ✅      |
| Subdominio compartido (cliente.nudofy.app/xxx)    | ✅     | ✅      | ✅      |
| Dominio propio (pedidos.tu-empresa.com)           | ❌     | ✅      | ✅      |
| Marca personalizada (logo, colores)               | logo solo | ✅   | ✅ + login white-label |
| Variantes visibles para el cliente (talla, color) | ✅     | ✅      | ✅      |
| **Estadísticas**                                 |        |         |         |
| Dashboard con totales del mes                     | ✅     | ✅      | ✅      |
| Estadísticas por cliente / producto / proveedor   | ❌     | ✅      | ✅      |
| Comparativas anuales y por temporada              | ❌     | ❌      | ✅      |
| Exportación a Excel/PDF                          | ❌     | ✅      | ✅      |
| **Equipo y permisos**                            |        |         |         |
| Multi-usuario                                     | ❌     | ✅ (3)  | ✅ (10) |
| Roles y permisos por usuario                      | ❌     | básico² | avanzado³ |
| Multi-empresa (varias razones sociales)           | ❌     | ❌      | ✅      |
| **Integraciones**                                |        |         |         |
| Notificaciones push                               | ✅     | ✅      | ✅      |
| Email transaccional al confirmar pedido           | ✅     | ✅      | ✅      |
| API REST pública                                  | ❌     | ❌      | ✅      |
| Webhooks (integración ERP/Holded/A3...)          | ❌     | ❌      | ✅      |
| **Soporte**                                      |        |         |         |
| Soporte por email                                 | 48 h   | 24 h    | 4 h     |
| Soporte por chat dentro de la app                 | ❌     | ✅      | ✅      |
| Onboarding inicial                                | self-service | 30 min videollamada | 1 h + migración asistida |
| Account manager dedicado                          | ❌     | ❌      | ✅      |
| SLA disponibilidad                                | best effort | 99% | 99,5%   |

> ¹ **Variantes "básico"**: máximo 1 atributo por producto (solo talla, o solo color). En Pro/Agencia se pueden combinar (matriz).
> ² **Roles "básico" en Pro**: dos perfiles (admin / vendedor). El vendedor solo ve sus clientes.
> ³ **Roles "avanzado" en Agencia**: perfiles personalizables por funcionalidad.

### 5.2 Descripción por plan

#### BÁSICO — 14€/mes · 140€/año

> *El primer paso. Para una distribuidora pequeña que arranca con Nudofy y quiere validar el modelo del portal cliente.*

**Lo que resuelve**: dejar el WhatsApp y el Excel. Tienes un catálogo digital con tus productos, das acceso a 50 tiendas-cliente para que vean el catálogo y hagan sus pedidos, y tú los recibes ordenados.

**Lo que NO incluye y por qué eso te puede frenar**:
- Sin tarifas personalizadas por cliente (todos los clientes ven el mismo precio).
- Sin escaneo de códigos de barras al tomar pedidos en visita.
- Sin envío automático del PDF al proveedor (lo descargas tú).
- Sin variantes complejas (solo 1 atributo, talla *o* color, no combinaciones).
- Sin multi-usuario (si entra otro comercial, subes a Pro).
- Soporte solo por email a 48 h.

**Coste de infraestructura estimado**: ~3,50€/mes → **margen 75%** ✅

---

#### PRO (★) — 34€/mes · 340€/año *(plan recomendado)*

> *El plan central. Para distribuidoras medianas, marcas que venden a tiendas y showrooms multi-marca con un equipo de 2-3 comerciales.*

**Lo que añade frente a Básico**:

1. **3 usuarios** y **10 firmas/marcas** en lugar de 1 y 2.
2. **25.000 productos** vs 2.000.
3. **500 clientes** (tiendas) vs 50.
4. **Tarifas personalizadas por cliente** — cada tienda ve sus precios. Imprescindible si trabajas con condiciones distintas por cliente.
5. **Variantes en matriz completa** — talla × color × material con stock por SKU.
6. **Escaneo de códigos de barras** al tomar pedidos en visita.
7. **Envío automático del PDF al proveedor** cuando el pedido pasa a "confirmado".
8. **Duplicar / repedir desde histórico** — un click para repetir el pedido anterior.
9. **Dominio propio** del portal cliente (`pedidos.tu-empresa.com`).
10. **Estadísticas por cliente, producto y proveedor** + exportación a Excel.
11. **Soporte por chat 24h** + **onboarding de 30 minutos**.

**Lo que sigue sin tener**:
- Sin API ni webhooks → no se conecta con tu ERP.
- Sin multi-empresa → si llevas varias razones sociales, te tocan cuentas separadas.
- Sin account manager.

**Coste de infraestructura estimado**: ~7,50€/mes → **margen 78%** ✅

---

#### AGENCIA — 79€/mes · 790€/año

> *El plan de techo. Para showrooms grandes, agencias de representación con varios comerciales y empresas que llevan varias razones sociales.*

**Lo que añade frente a Pro**:

1. **10 usuarios** y **firmas ilimitadas**.
2. **100.000 productos** y **clientes ilimitados**.
3. **Multi-empresa dentro de la misma cuenta** — llevas varias razones sociales sin duplicar suscripción.
4. **API REST + webhooks** — integración con Holded, A3, SAP Business One o el ERP que uses.
5. **Roles avanzados con permisos por funcionalidad** — comercial junior solo ve sus clientes y no puede tocar precios, etc.
6. **Estadísticas avanzadas con comparativas año contra año** y por temporada.
7. **Histórico ilimitado** de pedidos.
8. **Account manager dedicado** + **soporte 4 h** + **SLA 99,5%**.
9. **Onboarding completo de 1 h** + **migración asistida**.
10. **White-label completo del portal cliente** (incluso el login con tu marca).

**Coste de infraestructura estimado**: ~17€/mes → **margen 78%** ✅

---

## 6. Reglas y add-ons

| Concepto                           | Política                                                         |
|------------------------------------|------------------------------------------------------------------|
| Usuarios extra (Pro/Agencia)       | +6€/mes/usuario · +60€/año/usuario                               |
| Productos extra (paquetes 5K)      | +9€/mes en Pro, no aplicable en Agencia                          |
| Trial gratuito                     | 14 días, sin tarjeta, plan Pro completo                          |
| Onboarding dedicado (Básico/Pro)   | One-off 79€ opcional                                             |
| Migración desde otro software       | A partir de Pro, gratis hasta 5K productos                       |
| Cambio de plan                     | Inmediato, prorrateo automático                                  |
| Cancelación                        | Mensual sin penalización · Anual reembolso prorrata primeros 30 días |
| IVA                                | NO incluido en precio mostrado (estándar B2B España/EU)         |

---

## 7. Riesgos y cosas a vigilar

| Riesgo                                                       | Mitigación                                                              |
|--------------------------------------------------------------|-------------------------------------------------------------------------|
| Cliente confunde Nudofy con AgentesCloud                     | Web debe enfatizar portal cliente, no "app de gestión comercial"        |
| Cliente pide features de AgentesCloud (visitas, comisiones…) | Decir claro: "no es lo nuestro" y enfocar la conversación en el portal cliente y la app moderna como diferenciadores |
| Storage de imágenes se dispara > previsto                    | Migrar a Cloudflare R2 (egress gratis) cuando se pase de 500GB          |
| Email egress alto en notificaciones de pedidos               | Resend Pro 50K emails sobra hasta ~500 cuentas activas                  |
| Cliente del plan Básico que importa muchos productos         | Límite duro a 2.000, mostrar toast claro al pasar el 80%                 |
| Churn en plan mensual                                        | Empujar al anual con email a los 30 días: "ahorra 28€"                   |
| Costes Apple/Google al escalar                               | NO usar IAP — facturar por web/Stripe, suscripción es B2B no consumer  |

---

## 8. Próximos pasos sugeridos

1. **Reescribir landing y mensaje principal** — primer paso, el más importante. Mientras la web diga "app de gestión comercial" la comparativa con AgentesCloud te perjudica. Cambiar el héroe a "portal de pedidos B2B + app comercial".
2. **Validar con 5-10 clientes potenciales del nuevo perfil** — distribuidoras pequeñas y showrooms, no agentes autónomos. Enseñar la tabla y preguntar "¿qué plan elegirías?".
3. **Implementar gating por plan en BD** — nueva tabla `plans` y campo `agents.plan_id`, con límites verificados en RLS y en hooks (`useProducts` debe bloquear `createProduct` si se pasa el límite).
4. **Stripe** — Customer Portal + 6 productos (3 planes × 2 ciclos) + webhooks → función Edge en Supabase que actualice `agents.plan_id`.
5. **Página de precios pública con la tabla comparativa** — los precios públicos generan confianza, auto-cualifican al lead y reducen el ciclo de venta. La gran mayoría de competidores (AgentesCloud, ForceManager, InaCatalog) los esconden o solo los muestran tras formulario; mostrar los tuyos en abierto es ya una diferencia.

---

## Fuentes

- [AgentesCloud — Precios](https://agentescloud.es/precios/)
- [AgentesCloud — Funcionalidades](https://agentescloud.es/funcionalidades/)
- [Order Sender — Prices](https://www.ordersender.com/en/prices/)
- [ForceManager — Pricing](https://www.forcemanager.com/pricing/)
- [Pepperi — Pricing](https://www.pepperi.com/pricing/)
- [Onsight — Pricing](https://www.onsightapp.com/mobile-sales-app-pricing)
- [B2B Wave — Pricing](https://www.b2bwave.com/pricing)
- [Supabase — Pricing](https://supabase.com/pricing)
- [Supabase — Manage Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [Expo Application Services — Pricing](https://expo.dev/pricing)
- [Resend — Pricing](https://resend.com/pricing)
- [Maxio — Three-Tier Pricing Strategy](https://www.maxio.com/blog/tiered-pricing-examples-for-saas-businesses)
- [FastSpring — Three-Tier Pricing Strategy for SaaS](https://fastspring.com/blog/three-tier-pricing-strategy-for-saas-is-it-still-ideal/)
