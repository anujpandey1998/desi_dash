const { withAndroidManifest } = require('expo/config-plugins');
module.exports = function withGameGraphics(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    const features = manifest['uses-feature'] || (manifest['uses-feature'] = []);
    const gl = features.find(item => item.$?.['android:glEsVersion']);
    if (gl) Object.assign(gl.$, { 'android:glEsVersion': '0x00030000', 'android:required': 'true' });
    else features.push({ $: { 'android:glEsVersion': '0x00030000', 'android:required': 'true' } });
    return config;
  });
};
