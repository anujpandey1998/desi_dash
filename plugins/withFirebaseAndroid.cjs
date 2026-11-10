const {withAppBuildGradle,withProjectBuildGradle,withMainApplication}=require('expo/config-plugins');
const setup="// MANUAL: Download Firebase Android config for this exact applicationId.\nif (file('google-services.json').exists()) {\n    apply plugin: 'com.google.gms.google-services'\n}\ndef releaseSetting = { key -> System.getenv(key) ?: findProperty(key) }\ndef releaseStorePath = releaseSetting('ROOFTOP_UPLOAD_STORE_FILE')\ndef releaseStorePassword = releaseSetting('ROOFTOP_UPLOAD_STORE_PASSWORD')\ndef releaseKeyAlias = releaseSetting('ROOFTOP_UPLOAD_KEY_ALIAS')\ndef releaseKeyPassword = releaseSetting('ROOFTOP_UPLOAD_KEY_PASSWORD')\ndef releaseSigningReady = releaseStorePath && releaseStorePassword && releaseKeyAlias && releaseKeyPassword\ndef allowTestRelease = releaseSetting('ROOFTOP_ALLOW_TEST_RELEASE') == 'true'\n\ngradle.taskGraph.whenReady { graph ->\n    def releaseRequested = graph.allTasks.any { it.project == project && (it.name == 'assembleRelease' || it.name == 'bundleRelease') }\n    if (releaseRequested && !allowTestRelease) {\n        if (!releaseSigningReady) throw new GradleException('MANUAL: Set ROOFTOP_UPLOAD_* signing values outside the repository. See docs/FIREBASE_SETUP.md.')\n        if (!file('google-services.json').exists()) throw new GradleException('MANUAL: Add android/app/google-services.json before a production release.')\n    }\n}\n\n";
const release="        release {\n            if (releaseSigningReady) {\n                storeFile file(releaseStorePath)\n                storePassword releaseStorePassword\n                keyAlias releaseKeyAlias\n                keyPassword releaseKeyPassword\n            }\n        }";
const nativeGuard="\n          // Optional native services require a real default Firebase app before eager TurboModule init.\n          if (!BuildConfig.FIREBASE_CONFIGURED) {\n            removeAll { reactPackage ->\n              reactPackage is io.invertase.firebase.appcheck.ReactNativeFirebaseAppCheckPackage ||\n              reactPackage is io.invertase.firebase.auth.ReactNativeFirebaseAuthPackage ||\n              reactPackage is io.invertase.firebase.firestore.ReactNativeFirebaseFirestorePackage ||\n              reactPackage is io.invertase.firebase.functions.NativeFunctionsPackage\n            }\n          }\n";
module.exports=function withFirebaseAndroid(config){
 config=withMainApplication(config,c=>{
   if(!c.modResults.contents.includes('if (!BuildConfig.FIREBASE_CONFIGURED)'))c.modResults.contents=c.modResults.contents.replace('PackageList(this).packages.apply {','PackageList(this).packages.apply {'+nativeGuard);
   return c;
 });
 config=withProjectBuildGradle(config,c=>{if(!c.modResults.contents.includes('com.google.gms:google-services:'))c.modResults.contents=c.modResults.contents.replace("classpath('com.android.tools.build:gradle')","classpath('com.google.gms:google-services:4.4.4')\n    classpath('com.android.tools.build:gradle')");return c;});
 return withAppBuildGradle(config,c=>{
  let s=c.modResults.contents;
  if(!s.includes('"FIREBASE_CONFIGURED"'))s=s.replace('    defaultConfig {','    defaultConfig {\n'+"        buildConfigField \"boolean\", \"FIREBASE_CONFIGURED\", file(\"google-services.json\").exists().toString()");
  if(!s.includes('def releaseSigningReady'))s=s.replace('def projectRoot',setup+'def projectRoot');
  if(!s.includes('storeFile file(releaseStorePath)'))s=s.replace('    signingConfigs {','    signingConfigs {\n'+release);
  const split=s.indexOf('    buildTypes {');
  if(split>=0)s=s.slice(0,split)+s.slice(split).replace(/(release \{[\s\S]*?)signingConfig signingConfigs.debug/,'$1signingConfig releaseSigningReady ? signingConfigs.release : (allowTestRelease ? signingConfigs.debug : null)');
  c.modResults.contents=s;return c;
 });
};
