/**
 * Nudofy — generador de assets para Google Play Store
 * Genera:
 *   - feature-graphic.png   (1024×500)  — gráfico de funciones
 *   - screenshot-1.png      (1080×1920) — pantalla de catálogo
 *   - screenshot-2.png      (1080×1920) — pantalla de pedidos
 *   - screenshot-3.png      (1080×1920) — pantalla de clientes
 *   - screenshot-4.png      (1080×1920) — pantalla de admin
 *
 * Uso: node generate-store-assets.js
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const OUT = path.join(__dirname, 'assets', 'store');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ─── Colores ──────────────────────────────────────────────────────────────────
const PURPLE = '#534AB7';
const NAVY   = '#1C3A5C';
const BLUE   = '#5B9BD5';
const BG     = '#f7f7f5';
const WHITE  = '#ffffff';

// ─── Símbolo S (igual que generate-assets.js) ─────────────────────────────────
function symbolPaths(fg, accent, sw) {
  return `
  <circle cx="512" cy="159" r="80" fill="${fg}"/>
  <circle cx="512" cy="159" r="40" fill="${accent}"/>
  <path d="M 512 159 C 705 159 796 273 796 386 C 796 523 637 546 512 546"
        stroke="${fg}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
  <path d="M 512 546 C 364 546 205 568 205 705 C 205 818 318 887 512 887"
        stroke="${fg}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
  <circle cx="512" cy="887" r="80" fill="${fg}"/>
  <circle cx="512" cy="887" r="40" fill="${accent}"/>`;
}

function symbolScaled(cx, cy, scale, fg, accent, sw) {
  return `<g transform="translate(${cx - 512 * scale}, ${cy - 523 * scale}) scale(${scale})">
    ${symbolPaths(fg, accent, sw)}
  </g>`;
}

// ─── 1. GRÁFICO DE FUNCIONES — 1024×500 ──────────────────────────────────────
const featureSvg = `<svg width="1024" height="500" viewBox="0 0 1024 500"
     fill="none" xmlns="http://www.w3.org/2000/svg">

  <!-- Fondo degradado púrpura → marino -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${PURPLE}"/>
      <stop offset="100%" stop-color="${NAVY}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="white" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" fill="url(#shine)"/>

  <!-- Círculos decorativos de fondo -->
  <circle cx="900" cy="80"  r="180" fill="white" fill-opacity="0.04"/>
  <circle cx="950" cy="420" r="120" fill="white" fill-opacity="0.04"/>
  <circle cx="80"  cy="420" r="100" fill="white" fill-opacity="0.04"/>

  <!-- Símbolo S grande a la derecha -->
  ${symbolScaled(760, 250, 0.22, 'white', '${BLUE}', 68)}

  <!-- Texto NUDOFY -->
  <text x="80" y="210" font-family="Arial, sans-serif" font-weight="700"
        font-size="88" fill="white" letter-spacing="6">NUDOFY</text>

  <!-- Tagline -->
  <text x="82" y="268" font-family="Arial, sans-serif" font-weight="400"
        font-size="32" fill="white" fill-opacity="0.85">
    Catálogos y ventas para agentes comerciales
  </text>

  <!-- Tres badges de features -->
  <!-- Badge 1 -->
  <rect x="80" y="330" width="220" height="60" rx="30" fill="white" fill-opacity="0.15"/>
  <text x="190" y="368" font-family="Arial, sans-serif" font-size="22" fill="white"
        text-anchor="middle">📦 Catálogos</text>

  <!-- Badge 2 -->
  <rect x="320" y="330" width="220" height="60" rx="30" fill="white" fill-opacity="0.15"/>
  <text x="430" y="368" font-family="Arial, sans-serif" font-size="22" fill="white"
        text-anchor="middle">🛒 Pedidos</text>

  <!-- Badge 3 -->
  <rect x="560" y="330" width="220" height="60" rx="30" fill="white" fill-opacity="0.15"/>
  <text x="670" y="368" font-family="Arial, sans-serif" font-size="22" fill="white"
        text-anchor="middle">👥 Clientes</text>

</svg>`;

// ─── Helper: marco de teléfono ─────────────────────────────────────────────────
function phoneSvg({ title, subtitle, items, accentColor, icon }) {
  const W = 1080, H = 1920;
  const itemsHtml = items.map((item, i) => {
    const y = 780 + i * 170;
    return `
    <!-- Tarjeta ${i+1} -->
    <rect x="60" y="${y}" width="960" height="145" rx="20"
          fill="white" filter="url(#shadow)"/>
    <rect x="60" y="${y}" width="10" height="145" rx="5" fill="${accentColor}"/>
    <text x="110" y="${y + 55}" font-family="Arial, sans-serif" font-weight="700"
          font-size="34" fill="${NAVY}">${item.title}</text>
    <text x="110" y="${y + 100}" font-family="Arial, sans-serif" font-size="28"
          fill="#888">${item.subtitle}</text>
    <text x="990" y="${y + 80}" font-family="Arial, sans-serif" font-weight="700"
          font-size="30" fill="${accentColor}" text-anchor="end">${item.value}</text>`;
  }).join('');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="black" flood-opacity="0.07"/>
    </filter>
    <linearGradient id="header" x1="0" y1="0" x2="${W}" y2="400" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${PURPLE}"/>
      <stop offset="100%" stop-color="${NAVY}"/>
    </linearGradient>
  </defs>

  <!-- Fondo -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Header -->
  <rect width="${W}" height="640" fill="url(#header)"/>
  <rect width="${W}" height="640" fill="white" fill-opacity="0.05"/>

  <!-- Símbolo S en header -->
  ${symbolScaled(120, 160, 0.13, 'white', '${BLUE}', 68)}

  <!-- Nombre app -->
  <text x="220" y="140" font-family="Arial, sans-serif" font-weight="700"
        font-size="48" fill="white">nudofy</text>
  <text x="220" y="190" font-family="Arial, sans-serif" font-size="30"
        fill="white" fill-opacity="0.7">Agentes comerciales</text>

  <!-- Icono grande central en header -->
  <text x="540" y="460" font-family="Arial, sans-serif" font-size="160"
        text-anchor="middle">${icon}</text>

  <!-- Título pantalla -->
  <text x="60" y="720" font-family="Arial, sans-serif" font-weight="700"
        font-size="52" fill="${NAVY}">${title}</text>
  <text x="60" y="775" font-family="Arial, sans-serif" font-size="32"
        fill="#666">${subtitle}</text>

  ${itemsHtml}

  <!-- Bottom bar -->
  <rect y="${H - 140}" width="${W}" height="140" fill="white"/>
  <rect y="${H - 141}" width="${W}" height="1" fill="#e0e0e0"/>

  <!-- Nav icons -->
  <text x="135"  y="${H - 50}" font-size="44" text-anchor="middle">🏠</text>
  <text x="405"  y="${H - 50}" font-size="44" text-anchor="middle">📦</text>
  <text x="675"  y="${H - 50}" font-size="44" text-anchor="middle">🛒</text>
  <text x="945"  y="${H - 50}" font-size="44" text-anchor="middle">👤</text>

</svg>`;
}

// ─── 4 Capturas ───────────────────────────────────────────────────────────────
const screenshots = [
  {
    file: 'screenshot-1.png',
    label: 'screenshot-1.png — Catálogos',
    svg: phoneSvg({
      title: 'Mis Catálogos',
      subtitle: '3 catálogos activos',
      icon: '📦',
      accentColor: PURPLE,
      items: [
        { title: 'Temporada Verano 2026', subtitle: '48 productos · Activo', value: 'Ver →' },
        { title: 'Línea Premium',         subtitle: '22 productos · Activo', value: 'Ver →' },
        { title: 'Ofertas Especiales',    subtitle: '15 productos · Activo', value: 'Ver →' },
        { title: 'Colección Invierno',    subtitle: '36 productos · Borrador', value: 'Ver →' },
      ],
    }),
  },
  {
    file: 'screenshot-2.png',
    label: 'screenshot-2.png — Pedidos',
    svg: phoneSvg({
      title: 'Pedidos',
      subtitle: 'Esta semana: 12 pedidos',
      icon: '🛒',
      accentColor: BLUE,
      items: [
        { title: 'Pedido #1042',  subtitle: 'María García · hace 1h',    value: '€340' },
        { title: 'Pedido #1041',  subtitle: 'Carlos López · hace 3h',    value: '€210' },
        { title: 'Pedido #1040',  subtitle: 'Ana Martínez · ayer',       value: '€580' },
        { title: 'Pedido #1039',  subtitle: 'Luis Fernández · ayer',     value: '€125' },
      ],
    }),
  },
  {
    file: 'screenshot-3.png',
    label: 'screenshot-3.png — Clientes',
    svg: phoneSvg({
      title: 'Clientes',
      subtitle: '24 clientes en total',
      icon: '👥',
      accentColor: '#27AE60',
      items: [
        { title: 'María García',    subtitle: 'último pedido hace 1h',   value: '8 pedidos' },
        { title: 'Carlos López',    subtitle: 'último pedido hace 3h',   value: '5 pedidos' },
        { title: 'Ana Martínez',    subtitle: 'último pedido ayer',      value: '12 pedidos' },
        { title: 'Luis Fernández',  subtitle: 'último pedido esta sem.', value: '3 pedidos' },
      ],
    }),
  },
  {
    file: 'screenshot-4.png',
    label: 'screenshot-4.png — Panel Admin',
    svg: phoneSvg({
      title: 'Panel Admin',
      subtitle: 'Resumen del mes',
      icon: '📊',
      accentColor: NAVY,
      items: [
        { title: 'Ventas del mes',   subtitle: 'abril 2026',             value: '€8.420' },
        { title: 'Pedidos totales',  subtitle: 'abril 2026',             value: '47' },
        { title: 'Clientes activos', subtitle: 'últimos 30 días',        value: '18' },
        { title: 'Agentes activos',  subtitle: 'en la plataforma',       value: '4' },
      ],
    }),
  },
];

// ─── Generación ───────────────────────────────────────────────────────────────
async function generate() {
  console.log('\nNudofy — generando assets para Play Store...\n');

  // Gráfico de funciones
  await sharp(Buffer.from(featureSvg)).png().toFile(path.join(OUT, 'feature-graphic.png'));
  console.log('  ✓  feature-graphic.png  (1024×500)');

  // Capturas
  for (const { svg, file, label } of screenshots) {
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, file));
    console.log(`  ✓  ${label}  (1080×1920)`);
  }

  console.log(`\n✅  Assets guardados en ./assets/store/\n`);
}

generate().catch(err => {
  console.error('\n❌  Error:', err.message);
  process.exit(1);
});
