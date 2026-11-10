const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// R3F/native patches TextureLoader on Three's CommonJS entry. Metro's import
// condition otherwise loads a second, unpatched ESM copy for application code.
const nativeThree = require.resolve('three');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three' && (platform === 'android' || platform === 'ios')) {
    return { type: 'sourceFile', filePath: nativeThree };
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
