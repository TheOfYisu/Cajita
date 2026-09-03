// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Permitir que Metro resuelva archivos .wasm (necesario para expo-sqlite en web)
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('wasm');

module.exports = config;