const sharp = require('sharp');
const files = ['screenshot-1', 'screenshot-2', 'screenshot-3', 'screenshot-4'];

files.forEach(f => {
  // iPhone 6.5" — 1242×2688
  sharp('./assets/store/' + f + '.png')
    .resize(1242, 2688, { fit: 'contain', background: '#f7f7f5' })
    .toFile('./assets/store/ios-' + f + '.png', (e) => {
      console.log(e ? '✗ ' + e.message : '✓ ios-' + f + '.png');
    });

  // iPad 12.9" — 2048×2732
  sharp('./assets/store/' + f + '.png')
    .resize(2048, 2732, { fit: 'contain', background: '#f7f7f5' })
    .toFile('./assets/store/ipad-' + f + '.png', (e) => {
      console.log(e ? '✗ ' + e.message : '✓ ipad-' + f + '.png');
    });
});
