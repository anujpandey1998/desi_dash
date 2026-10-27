const { withAppBuildGradle } = require('expo/config-plugins');

// Windows Ninja cannot compile some generated autolinking paths over 260 chars.
module.exports = function withShortCmakePaths(config) {
  return withAppBuildGradle(config, config => {
    if (!config.modResults.contents.includes('-DCMAKE_OBJECT_PATH_MAX=240')) {
      config.modResults.contents = config.modResults.contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=240"
            }
        }`
      );
    }
    return config;
  });
};
