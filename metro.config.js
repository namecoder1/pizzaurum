const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add resolver to handle missing font files
config.resolver.assetExts.push("woff2", "woff", "ttf", "otf");

// Ignore problematic packages
config.resolver.blockList = [
  /node_modules\/react-native-country-select\/lib\/assets\/fonts\/.*\.woff2$/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
