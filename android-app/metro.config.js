const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * nodejs-assets/nodejs-project حاوی یک پروژه‌ی Node کامل (با node_modules
 * مخصوص خودش) است که نباید توسط باندلر React Native اسکن شود؛ وگرنه خطای
 * "duplicate module name" می‌دهد. این مسیر را از باندلر کنار می‌گذاریم.
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList: exclusionList([
      new RegExp(
        path.resolve(__dirname, 'nodejs-assets').replace(/[/\\]/g, '[/\\\\]') +
          '[/\\\\].*',
      ),
    ]),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
