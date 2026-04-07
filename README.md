# Nudofy

SaaS para agentes comerciales — Catalogs and Sales.

## Arranque rápido

### 1. Instalar dependencias
```bash
cd nudofy-project
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales de Supabase.

### 3. Configurar Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta `supabase/schema.sql`
3. Copia la URL y la anon key en tu `.env`

### 4. Arrancar la app
```bash
npm start
```
- Pulsa `w` para web
- Pulsa `a` para Android
- Pulsa `i` para iOS (solo Mac)

---

## Estructura del proyecto

```
nudofy-project/
├── app/                    # Rutas (expo-router)
│   ├── _layout.tsx         # Layout raíz con AuthProvider
│   ├── index.tsx           # Splash (P-01)
│   ├── login.tsx           # Login (P-02)
│   ├── (agent)/            # Portal del agente
│   ├── (client)/           # Portal del cliente
│   └── (admin)/            # Panel de administración
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx # Sesión y rol del usuario
│   ├── lib/
│   │   └── supabase.ts     # Cliente Supabase
│   ├── screens/            # Componentes de pantalla
│   └── theme/
│       └── colors.ts       # Paleta de colores
├── supabase/
│   └── schema.sql          # Esquema completo de la BD
└── mockups/                # Diseños HTML de referencia
```

## Fases de desarrollo

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Cimientos: auth, BD, splash, login | ✅ Completada |
| **Fase 2** | Núcleo del agente: CRUD completo + pedidos | ✅ Completada |
| **Fase 3** | Portal del cliente | ✅ Completada |
| **Fase 4** | Panel de administración web | ⏳ Pendiente |
| **Fase 5** | Build iOS y Android | ⏳ Pendiente |

## Colores principales

| Variable | Hex | Uso |
|----------|-----|-----|
| `purple` | `#534AB7` | Color principal de la app |
| `navy` | `#1C3A5C` | Azul marino (admin) |
| `blue` | `#5B9BD5` | Azul medio |
| `bg` | `#f7f7f5` | Fondo general |
