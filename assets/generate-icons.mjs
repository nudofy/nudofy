import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, 'icon.svg'));
const splashSvg = readFileSync(join(__dirname, 'splash.svg'));

// icon.png — 1024x1024 (iOS + general)
await sharp(svg).resize(1024, 1024).png().toFile(join(__dirname, 'icon.png'));
console.log('✓ icon.png');

// adaptive-icon.png — 1024x1024 (Android foreground)
await sharp(svg).resize(1024, 1024).png().toFile(join(__dirname, 'adaptive-icon.png'));
console.log('✓ adaptive-icon.png');

// favicon.png — 196x196 (web)
await sharp(svg).resize(196, 196).png().toFile(join(__dirname, 'favicon.png'));
console.log('✓ favicon.png');

// splash.png — 1242x2688
await sharp(splashSvg).resize(1242, 2688).png().toFile(join(__dirname, 'splash.png'));
console.log('✓ splash.png');

console.log('\nIconos generados correctamente.');
