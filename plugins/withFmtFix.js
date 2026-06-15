const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Parcha directamente los headers de fmt en los Pods descargados.
// El flag preprocessor no funciona porque fmt redefine FMT_CONSTEVAL sin #ifndef.
// Esta solución reemplaza `#define FMT_CONSTEVAL consteval` por `#define FMT_CONSTEVAL`
// en cualquier header .h dentro de los Pods que use el patron.
const FMT_FIX_CODE = `
  # Fix: fmt consteval error con Xcode 26 — parchea headers de fmt en Pods
  require 'find'
  Find.find(installer.sandbox.root.to_s) do |file_path|
    next unless file_path.end_with?('.h')
    begin
      content = File.read(file_path)
      if content.include?('FMT_CONSTEVAL') && content.include?('consteval')
        patched = content.gsub(/^(\\s*#\\s*define\\s+FMT_CONSTEVAL\\s+)consteval\\b/, '\\1')
        File.write(file_path, patched) if patched != content
      end
    rescue
      # ignorar archivos no legibles
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
