const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const env = { ...process.env };
const windows = process.platform === 'win32';
const studioJdk = path.join(env.ProgramFiles || 'C:\\Program Files', 'Android', 'Android Studio', 'jbr');
if (windows && fs.existsSync(path.join(studioJdk, 'bin', 'java.exe'))) env.JAVA_HOME = studioJdk;
const java = env.JAVA_HOME ? path.join(env.JAVA_HOME, 'bin', windows ? 'java.exe' : 'java') : 'java';
const version = spawnSync(java, ['-version'], { encoding: 'utf8', env });
const major = /version "(\d+)/.exec(version.stderr || '')?.[1];
if (!major || Number(major) < 21) {
  console.error('Android build requires JDK 21+. Set JAVA_HOME, or install Android Studio with its bundled JDK.');
  process.exit(1);
}
if (process.argv[2] === 'run') {
  const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'run:android'], { cwd: root, env, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}
const task = process.argv[2] === 'aab' ? ':app:bundleRelease' : ':app:assembleRelease';
const abis = env.NEON_ANDROID_ABIS || 'armeabi-v7a,arm64-v8a';
const args = [task, '--console=plain', '--max-workers=2', '-PreactNativeArchitectures=' + abis];
const result = windows
  ? spawnSync('cmd.exe', ['/d', '/c', 'gradlew.bat', ...args], { cwd: path.join(root, 'android'), env, stdio: 'inherit' })
  : spawnSync('./gradlew', args, { cwd: path.join(root, 'android'), env, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
