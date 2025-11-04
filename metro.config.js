// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// ✅ Agregar compatibilidad con archivos .cjs de Firebase
defaultConfig.resolver.sourceExts.push('cjs');

// ✅ Desactivar el sistema experimental de exports
defaultConfig.resolver.unstable_enablePackageExports = false;

// Alias 'tslib' to a shim that provides a default export for interop
defaultConfig.resolver.alias = {
  ...(defaultConfig.resolver.alias || {}),
  tslib: require('path').resolve(__dirname, 'shims/tslib-shim.js'),
};

module.exports = defaultConfig;
