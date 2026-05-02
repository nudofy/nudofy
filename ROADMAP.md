# Roadmap Nudofy

> Documento vivo. Última actualización: 30 abril 2026.
> Acompaña a `ESTRATEGIA_PRECIOS.md` y `CONTEXTO_PROYECTO.md`.

---

## Parte 1 — Tareas inmediatas para lanzar los planes

Por orden de prioridad. **No saltes pasos**: la validación (paso 2) puede invalidar el resto, y meterse a desarrollar Stripe sin antes haber validado el posicionamiento es perder tiempo.

### 1. Reposicionar la web/landing

> **Por qué primero**: mientras la web diga "app de gestión comercial para agentes", todos los leads que entren van a comparar Nudofy con AgentesCloud, y ahí pierdes. Cambiar el mensaje es lo más barato y lo que más impacto tiene.

- Reescribir el hero de la home: el héroe es el **portal cliente B2B**, no la app del agente.
- Frase principal sugerida: *"Da a tus clientes un portal de pedidos B2B con su propio catálogo, sus precios y desde su móvil."*
- Sustituir capturas: que la primera captura sea el portal cliente con carrito, no la app del agente.
- Sección "Para quién es Nudofy": distribuidora pequeña/mediana, marca que vende a tiendas, showroom multi-marca.
- Quitar referencias a "agente comercial autónomo".

**Salida**: nueva home publicada.

### 2. Validar con 5-10 clientes potenciales del nuevo perfil

> **Por qué antes de tocar código de Stripe**: si el perfil que hemos definido no compra esto, todo lo demás es trabajo en vano.

- Lista de 10 contactos del nuevo perfil (no agentes autónomos): distribuidoras pequeñas, showrooms multi-marca, marcas que venden a tiendas.
- Demo de 20 minutos con la versión actual + tabla de precios (`ESTRATEGIA_PRECIOS.md` §5).
- Preguntas a hacer:
  - ¿Qué plan elegirías y por qué?
  - ¿Qué echas en falta para pagar el Pro?
  - ¿El portal cliente resuelve un dolor real?
  - ¿Cuánto pagarías hoy por algo así?

**Salida**: documento `validacion/` con 10 entrevistas resumidas y conclusión: ¿seguimos con esta estrategia o ajustamos?

### 3. Implementar gating de planes en BD

- Crear tabla `plans` con: `id`, `code` (basic/pro/agency), `name`, `monthly_price`, `annual_price`, límites (`max_users`, `max_suppliers`, `max_products`, `max_clients`, `max_tariffs`).
- Añadir `plan_id` en `agents`, default plan trial.
- Añadir `subscription_status` en `agents`: `trial | active | past_due | canceled`.
- Añadir `trial_ends_at`, `current_period_end` en `agents`.
- RLS: bloqueo de creación cuando el plan no permite (vía función SQL `can_create_resource(agent_id, resource_type)`).

**SQL preliminar**: te lo redacto cuando lleguemos aquí, para que lo ejecutes tú en Supabase y confirmes.

### 4. Verificación de límites en hooks (cliente)

Cambios en `src/hooks/useAgent.ts`:

- `useProducts.createProduct`: comprueba `agent.plan.max_products` antes de insertar.
- `useClients.createClient`: ídem.
- `useSuppliers.createSupplier`: ídem.
- `useTariffs.createTariff`: ídem.
- Hook nuevo `usePlanLimits()` que devuelva `{ used, max, percentage, isAtLimit }` por recurso.
- En la UI: banner persistente cuando se supera el 80% de cualquier límite, modal de upgrade cuando se alcanza el 100%.

### 5. Página de precios pública

- Ruta nueva `/precios` (puede ser estática Next.js o dentro de la web actual).
- Tabla comparativa de los tres planes (la de §5.1 de `ESTRATEGIA_PRECIOS.md`).
- Toggle mensual / anual con etiqueta "ahorra 17%".
- Tres CTAs (uno por plan) que llevan al registro con `?plan=basic|pro|agency`.
- FAQ con 8-10 preguntas frecuentes.

### 6. Integración Stripe

- Crear los 6 productos en Stripe (3 planes × 2 ciclos).
- Configurar Stripe Customer Portal (para que el cliente cambie de plan/cancele).
- Función Edge en Supabase que escuche webhooks `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` y actualice `agents.plan_id`, `subscription_status`, `current_period_end`.
- Botón "Suscribirme" en la app que crea una `checkout.session` y redirige.

### 7. Trial de 14 días

- Al registro, asignar `subscription_status = 'trial'`, `trial_ends_at = now + 14 days`, `plan_id = pro` (que prueben el plan medio, no el básico).
- Cron diario (Edge Function programada) que envíe email a los X días: día 7, día 12, día 14 (último aviso), día 15 (degradar a Básico read-only o cancelar).

### 8. Flow de upgrade dentro de la app

- Cuando se alcanza un límite o se accede a feature de plan superior, modal "Esta función está disponible en Pro" con CTA al checkout de Stripe.
- En el `home` y en `estadisticas`, banner sutil "Estás usando 78% de tu plan Pro" con CTA a "Ver planes".

### 9. Emails transaccionales de billing

- Bienvenida al trial.
- Recordatorios trial (días 7, 12, 14).
- Confirmación de suscripción.
- Pago fallido (`invoice.payment_failed` de Stripe).
- Cambio de plan.
- Cancelación.

### 10. QA y pruebas con cuenta real

- Ciclo completo: registro → trial → suscripción mensual → cambio a anual → cambio de plan → cancelación → reactivación.
- Probar en sandbox de Stripe.

---

## Parte 2 — Roadmap para alcanzar a AgentesCloud (lo que sí encaja)

> **Filtro**: solo metemos features que refuerzan el posicionamiento de Nudofy (portal B2B + app comercial moderna). Cosas como "visitas con notas de voz", "geolocalización de rutas" o "gestión de gastos del agente" pertenecen al ERP del agente autónomo y NO están en este roadmap. Ver §3 al final para la lista de descartados.

### Fase A — Imprescindibles para no quedar atrás (3-6 meses)

Cosas que cualquier cliente serio va a pedir tarde o temprano. La mayoría aparecen en la propuesta de valor de AgentesCloud y deben estar en Nudofy si queremos competir.

| #  | Feature                                              | Esfuerzo | Por qué                                                |
|----|------------------------------------------------------|----------|--------------------------------------------------------|
| A1 | Importación masiva Excel/CSV (productos, clientes, tarifas) | M        | AgentesCloud lo tiene en todo. Sin esto el onboarding es manual y lento. |
| A2 | Categorías / familias / subfamilias de productos    | S        | Catálogos de >5K productos sin categorías son inmanejables. |
| A3 | Descontinuar / descatalogar producto sin borrar     | XS       | Imprescindible para histórico de pedidos.              |
| A4 | Múltiples personas de contacto por cliente          | S        | Distribuidoras venden a tiendas con varios interlocutores. |
| A5 | Documentos adjuntos en producto (fichas PDF) y cliente (contratos) | S        | Estándar B2B. AgentesCloud lo tiene.                   |
| A6 | Pedidos: descuento global a pie de pedido           | XS       | Caso de uso super común que hoy no resolvemos bien.    |
| A7 | Pedidos: hasta 3 tipos de IVA por pedido            | S        | España, productos con IVA reducido y normal a la vez.  |
| A8 | Cálculo de comisión por pedido (campo opcional)     | S        | Importante para agentes que cobran a porcentaje.       |
| A9 | Búsqueda de pedidos por múltiples criterios + filtros guardados | M | Cuando hay >100 pedidos, sin esto se pierde la información. |
| A10| Mensajes de aviso configurables por proveedor/cliente | S        | "No cobrar antes del día 5" o "stock limitado". AgentesCloud lo tiene. |

> Esfuerzo: XS = 1 día, S = 2-5 días, M = 1-2 semanas, L = 3-4 semanas, XL = >1 mes.

### Fase B — Competitivo y diferenciador (6-12 meses)

Cosas que llevan a Nudofy de "el que tiene buen portal cliente" a "el producto serio".

| #  | Feature                                              | Esfuerzo | Por qué                                                |
|----|------------------------------------------------------|----------|--------------------------------------------------------|
| B1 | **Presupuestos** (módulo nuevo)                     | L        | AgentesCloud tiene módulo entero. Estados, conversión a pedido, ratios de conversión. |
| B2 | Datos logísticos por producto (stock, cajas/base, bases/palé, unidades mínimas) | M | Estándar para distribuidoras de gran consumo.          |
| B3 | Productos similares y complementarios (cross-sell)  | M        | Más venta cruzada en el portal y en la app del agente. |
| B4 | Promociones automáticas (artículo y cliente)        | M        | "3x2", "10% si más de 50 unidades". AgentesCloud lo tiene. |
| B5 | Múltiples tarifas por producto (más allá de per-cliente actual) | M | Tarifas por canal, por temporada, por volumen.         |
| B6 | Tarifas por cantidad / descuentos por volumen       | M        | "A partir de 100 unidades, precio Y". Muy común en B2B. |
| B7 | Histórico de cambios de precio                      | S        | Auditoría y transparencia con el cliente.              |
| B8 | Catálogos PDF descargables del proveedor            | S        | AgentesCloud lo tiene. Mantener el viejo catálogo PDF junto al digital. |
| B9 | Carga de pedidos desde Excel                        | M        | Para clientes grandes que envían su pedido en Excel.   |
| B10| 3 niveles de descuento por línea de pedido          | S        | Estándar B2B. Hoy solo tenemos uno.                    |

### Fase C — Profesionalización y escala (12-18 meses)

Funciones que profesionalizan el producto y abren mercado a clientes mayores.

| #  | Feature                                              | Esfuerzo | Por qué                                                |
|----|------------------------------------------------------|----------|--------------------------------------------------------|
| C1 | Estadísticas avanzadas: ratios de conversión, comparativas año vs año | L | Plan Agencia lo necesita para justificar precio.       |
| C2 | Liquidación de comisiones (módulo)                  | L        | Si el cliente Agencia tiene varios comerciales, lo va a pedir. |
| C3 | CRM ligero del cliente: notas, último contacto, etiquetas, segmentos | M | NO incluye visitas/rutas (eso no es nuestro perfil). Solo lo justo para no perder contexto. |
| C4 | Multi-almacén básico (stock por almacén)            | L        | Distribuidoras con varios almacenes de envío.          |
| C5 | Integraciones con ERPs (Holded, A3, Sage)           | XL       | Plan Agencia lo va a pedir. Empezar por Holded (mercado pyme España). |
| C6 | API REST pública v1 (documentada)                   | M        | Ya está en el plan Agencia. Falta documentarla y pulirla. |
| C7 | Webhooks salientes configurables                    | M        | Que el cliente reciba notificaciones en su Slack/Discord/sistema. |
| C8 | Multi-idioma del portal cliente (EN, FR, IT, PT)    | M        | Abre mercado europeo amplio.                           |
| C9 | App offline-first robusta (sync con conflictos)     | XL       | Comerciales en visitas a tiendas con mala cobertura.   |
| C10| Auditoría completa de cambios (audit log)           | M        | Plan Agencia + clientes con compliance.                |

### Fase D — Cosas de AgentesCloud que NO vamos a hacer (descartadas)

> Está aquí explícitamente para que no se nos olvide y nadie las proponga sin contexto. Estas funciones existen porque AgentesCloud sirve a otro segmento (agente comercial autónomo tradicional). Nudofy NO sirve a ese segmento y por tanto no las necesita.

| Feature de AgentesCloud                              | Por qué NO hacerla en Nudofy                            |
|------------------------------------------------------|---------------------------------------------------------|
| Registro de visitas con notas de voz                 | Es CRM de agente. Nuestro perfil (distribuidora/showroom) tiene su propio CRM. |
| Geolocalización de clientes y optimización de rutas  | Mismo motivo. Es para comerciales en ruta tradicional.  |
| Tipificación de acciones comerciales y agenda        | Lo hace Calendly, HubSpot, Pipedrive — no nuestro foco. |
| Detección de clientes inactivos sin visita           | Es CRM puro.                                            |
| Gestión de gastos del agente (viaje, suministros…)   | Es del lado del agente como autónomo, no de la operación de la distribuidora. |
| Almacén de depósito multi-warehouse complejo         | Para distribuidoras grandes; cuando lleguemos ahí, ver C4 (multi-almacén básico). |
| Hasta 21 niveles de tarifa por producto              | Overkill. Con tarifas + per-cliente + por cantidad cubres el 99%. |
| Subagentes con liquidaciones cruzadas                | Caso de uso de agencia tradicional.                     |

---

## 3. Cómo decidir qué entra en cada release

Cada vez que llegue una propuesta de feature, pasarla por este filtro:

1. **¿Refuerza el posicionamiento de portal B2B + app comercial moderna?** → si no, va a Fase D.
2. **¿La piden ≥3 clientes reales (de pago o trial)?** → si sí, sube de fase. Si solo la pide 1, espera.
3. **¿Es un bloqueante de venta?** (cliente potencial dice "sin esto no compro") → Fase A inmediata.
4. **¿Mejora margen o reduce churn?** → si sí, prioriza.
5. **¿Aparece en >2 competidores directos?** → señal de que es estándar de mercado, mover a A o B.

---

## 4. Métricas a vigilar para reajustar el roadmap

Estas son las que de verdad importan para saber si el roadmap va bien:

| Métrica                              | Objetivo a 6 meses | Cuándo te avisa de un problema |
|--------------------------------------|--------------------|--------------------------------|
| Conversión trial → de pago           | >25%               | <15% → la propuesta de valor o el precio están mal |
| Reparto entre planes                 | 20% / 65% / 15%    | <50% en Pro → Pro está mal definido |
| Churn mensual (Pro y Agencia)        | <3%/mes            | >5% → falta una feature crítica de Fase A o B |
| Ratio cancelación con motivo "le faltan features" | <30% del total | Si crece, mirar qué feature concreta sale en las salidas |
| LTV / CAC                            | >3                 | <2 → o subir precios o reducir CAC |

---

## Anexos

- Estrategia y precios: `ESTRATEGIA_PRECIOS.md`
- Contexto técnico del proyecto: `CONTEXTO_PROYECTO.md`
