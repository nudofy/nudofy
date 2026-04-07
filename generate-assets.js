/**
 * Nudofy — generador de assets para Expo
 * Genera icon.png, adaptive-icon.png, splash.png y favicon.png
 * usando el logo vectorial SVG (sin dependencias de fuentes).
 *
 * Uso: node generate-assets.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'assets');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

// ─── Símbolo "S" — todos los elementos son paths/círculos, sin texto ──────────
// viewBox original del icono: 0 0 90 90
// Escala a 1024: factor = 1024/90 = 11.378
//   cx=45 → 512  |  cy=14 → 159  |  cy=48 → 546  |  cy=78 → 887
//   r=7 → 79.6   |  r=3.5 → 39.8  |  stroke=6 → 68.3

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

// ─── icon.png — 1024×1024, símbolo blanco sobre fondo marino ─────────────────
const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024"
     fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#1C3A5C"/>
  ${symbolPaths('white', '#5B9BD5', 68)}
</svg>`;

// ─── adaptive-icon.png — 1024×1024, símbolo marino sobre fondo transparente ──
// Android lo compone sobre el fondo backgroundColor definido en app.json
const adaptiveSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024"
     fill="none" xmlns="http://www.w3.org/2000/svg">
  ${symbolPaths('#1C3A5C', '#5B9BD5', 68)}
</svg>`;

// ─── splash.png — 1242×2688, símbolo blanco centrado sobre fondo púrpura ──────
// El símbolo se escala ~3.8× respecto al ícono y se centra en y≈1344
// transform="translate(621−512·0.5, 1344−523·0.5) scale(0.5)"
// → aproximando manualmente a escala 0.43 (símbolo ~310px alto)
//   512×0.43=220 → cx=621  |  159×0.43=68 → 1044  |  887×0.43=381 → 1725
// Usamos transform directo en SVG para no recalcular todos los puntos
const splashSvg = `<svg width="1242" height="2688" viewBox="0 0 1242 2688"
     fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1242" height="2688" fill="#534AB7"/>
  <!-- Símbolo S centrado; traducimos el centro del símbolo (512,523) al centro del splash (621,1344) -->
  <g transform="translate(${621 - 512 * 0.44}, ${1344 - 523 * 0.44}) scale(0.44)">
    ${symbolPaths('white', '#A8C8FF', 68)}
  </g>
</svg>`;

// ─── favicon.png — 196×196 ────────────────────────────────────────────────────
const faviconSvg = `<svg width="196" height="196" viewBox="0 0 196 196"
     fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="196" height="196" rx="28" fill="#1C3A5C"/>
  <!-- Escala 196/1024 = 0.191 aplicada a los mismos puntos -->
  <g transform="translate(${98 - 512 * 0.173}, ${98 - 523 * 0.173}) scale(0.173)">
    ${symbolPaths('white', '#5B9BD5', 68)}
  </g>
</svg>`;

// ─── Generación ───────────────────────────────────────────────────────────────
async function generate() {
  const tasks = [
    { svg: iconSvg,     file: 'icon.png',          label: 'icon.png          (1024×1024)' },
    { svg: adaptiveSvg, file: 'adaptive-icon.png',  label: 'adaptive-icon.png (1024×1024, fondo transparente)' },
    { svg: splashSvg,   file: 'splash.png',         label: 'splash.png        (1242×2688)' },
    { svg: faviconSvg,  file: 'favicon.png',        label: 'favicon.png       (196×196)' },
  ];

  console.log('\nNudofy — generando assets...\n');
  for (const { svg, file, label } of tasks) {
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, file));
    console.log(`  ✓  ${label}`);
  }
  console.log('\n✅  Assets guardados en ./assets/\n');
}

generate().catch(err => {
  console.error('\n❌  Error:', err.message);
  if (err.message.includes('Cannot find module')) {
    console.error('   → Instala sharp primero:  npm install --save-dev sharp\n');
  }
  process.exit(1);
});
