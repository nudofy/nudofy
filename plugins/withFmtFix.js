const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix para error de compilación iOS con Xcode 16 + react-native-reanimated:
 * "call to consteval function 'fmt::basic_format_string' is not a constant expression"
 *
 * Aplica GCC_PREPROCESSOR_DEFINITIONS = FMT_CONSTEVAL= a todos los pods
 * vía post_install hook en el Podfile.
 */
const withFmtFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes('FMT_CONSTEVAL')) {
        return config;
      }

      const hook = `
# Fix: fmt consteval error con Xcode 16 + react-native-reanimated
post_install do |installer|
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
  end
end
`;

      fs.writeFileSync(podfilePath, contents + hook);
      return config;
    },
  ]);
};

module.exports = withFmtFix;
