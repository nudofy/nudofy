const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FMT_FIX_CODE = `
  # Fix: fmt consteval error con Xcode 16 + react-native-reanimated
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
      if defs.nil?
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = ['$(inherited)', 'FMT_CONSTEVAL=']
      elsif defs.is_a?(Array) && !defs.include?('FMT_CONSTEVAL=')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_CONSTEVAL='
      elsif defs.is_a?(String) && !defs.include?('FMT_CONSTEVAL=')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = [defs, 'FMT_CONSTEVAL=']
      end
    end
  end`;

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes('FMT_CONSTEVAL')) {
        return config;
      }

      // Insertar dentro del post_install existente, antes del último `end`
      if (contents.includes('post_install do |installer|')) {
        // Buscar el bloque post_install y añadir el código antes de su end
        contents = contents.replace(
          /^(post_install do \|installer\|)([\s\S]*?)(^end)/m,
          (match, open, body, end_) => `${open}${body}${FMT_FIX_CODE}\n${end_}`
        );
      } else {
        // Si no existe post_install, crear uno nuevo
        contents += `\npost_install do |installer|\n${FMT_FIX_CODE}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = withFmtFix;
