// Metro config for Expo SDK 54.
// Firebase JS SDK ships CommonJS with a "exports" map that Metro's default
// package-exports resolution mishandles on React Native, causing
// "Component auth has not been registered yet". Disabling package exports and
// adding the `.cjs` source extension restores the correct Firebase build.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
