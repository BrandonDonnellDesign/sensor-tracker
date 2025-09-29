const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  resolver: {
    // Handle symlinks for shared module
    symlinks: false,
  },
  watchFolders: [
    // Watch shared module for changes
    '../shared',
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);