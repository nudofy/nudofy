const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Fix para error de compilación iOS con Xcode 16 + react-native-reanimated:
 * "call to consteval function 'fmt::basic_format_string' is not a constant expression"
 *
 * Solución: Deshabilitar FMT_CONSTEVAL para todos los pods añadiendo
 * GCC_PREPROCESSOR_DEFINITIONS = FMT_CONSTEVAL=
 */
const withFmtFix = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (typeof buildConfig === 'object' && buildConfig.buildSettings) {
        const settings = buildConfig.buildSettings;
        if (!settings.GCC_PREPROCESSOR_DEFINITIONS) {
          settings.GCC_PREPROCESSOR_DEFINITIONS = ['$(inherited)', 'FMT_CONSTEVAL='];
        } else if (Array.isArray(settings.GCC_PREPROCESSOR_DEFINITIONS)) {
          if (!settings.GCC_PREPROCESSOR_DEFINITIONS.includes('FMT_CONSTEVAL=')) {
            settings.GCC_PREPROCESSOR_DEFINITIONS.push('FMT_CONSTEVAL=');
          }
        } else if (typeof settings.GCC_PREPROCESSOR_DEFINITIONS === 'string') {
          if (!settings.GCC_PREPROCESSOR_DEFINITIONS.includes('FMT_CONSTEVAL=')) {
            settings.GCC_PREPROCESSOR_DEFINITIONS = [settings.GCC_PREPROCESSOR_DEFINITIONS, 'FMT_CONSTEVAL='];
          }
        }
      }
    }

    return config;
  });
};

module.exports = withFmtFix;
