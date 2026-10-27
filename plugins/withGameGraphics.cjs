const { withAndroidManifest } = require('expo/config-plugins');
module.exports = function withGameGraphics(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const features = manifest['uses-feature'] || (manifest['uses-feature'] = []);
    const gl = features.find(item => item.$?.['android:glEsVersion']);
    if (gl) Object.assign(gl.$, { 'android:glEsVersion': '0x00030000', 'android:required': 'true' });
    else features.push({ $: { 'android:glEsVersion': '0x00030000', 'android:required': 'true' } });
    const application = manifest.application?.[0];
    const metadata = application?.['meta-data'] || [];
    const delayedMeasurement = metadata.find(item => item.$?.['android:name'] === 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT');
    if (delayedMeasurement) delayedMeasurement.$['tools:replace'] = 'android:value';
    return config;
  });
};
