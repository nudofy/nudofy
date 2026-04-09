const sharp = require('sharp');
const files = ['screenshot-1', 'screenshot-2', 'screenshot-3', 'screenshot-4'];

files.forEach(f => {
  // Tablet 7 pulgadas — 1200×1920
  sharp('./assets/store/' + f + '.png')
    .resize(1200, 1920, { fit: 'contain', background: '#f7f7f5' })
    .toFile('./assets/store/tablet-7-' + f + '.png', (e) => {
      console.log(e ? '✗ ' + e.message : '✓ tablet-7-' + f + '.png');
    });

  // Tablet 10 pulgadas — 1600×2560
  sharp('./assets/store/' + f + '.png')
    .resize(1600, 2560, { fit: 'contain', background: '#f7f7f5' })
    .toFile('./assets/store/tablet-10-' + f + '.png', (e) => {
      console.log(e ? '✗ ' + e.message : '✓ tablet-10-' + f + '.png');
    });
});
