const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FMT_FIX_CODE = `
  # Fix: fmt consteval error con Xcode 16
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      flags = config.build_settings['OTHER_CPLUSPLUSFLAGS']
      if flags.nil?
        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = ['$(inherited)', '-DFMT_CONSTEVAL=']
      elsif flags.is_a?(Array) && !flags.include?('-DFMT_CONSTEVAL=')
        config.build_settings['OTHER_CPLUSPLUSFLAGS'] << '-DFMT_CONSTEVAL='
      elsif flags.is_a?(String) && !flags.include?('-DFMT_CONSTEVAL=')
        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = [flags, '-DFMT_CONSTEVAL=']
      end
    end
  end`;

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes('OTHER_CPLUSPLUSFLAGS')) {
        return config;
      }

      if (contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          /^(post_install do \|installer\|)([\s\S]*?)(^end)/m,
          (match, open, body, end_) => `${open}${body}${FMT_FIX_CODE}\n${end_}`
        );
      } else {
        contents += `\npost_install do |installer|\n${FMT_FIX_CODE}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = withFmtFix;
