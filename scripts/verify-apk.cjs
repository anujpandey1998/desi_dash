const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const apkPath = process.argv[2] || 'android/app/build/outputs/apk/release/app-release.apk';
const zip = fs.readFileSync(apkPath);
let eocd = zip.length - 22;
while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
if (eocd < 0) throw Error('Invalid APK ZIP');
let offset = zip.readUInt32LE(eocd + 16);
const count = zip.readUInt16LE(eocd + 10);
let nativeCount = 0, hasBundle = false;
for (let i = 0; i < count; i++) {
  if (zip.readUInt32LE(offset) !== 0x02014b50) throw Error('Invalid central directory');
  const length = zip.readUInt16LE(offset + 28);
  const name = zip.toString('utf8', offset + 46, offset + 46 + length);
  if (name === 'assets/index.android.bundle') hasBundle = true;
  if (/^lib\/(arm64-v8a|x86_64)\/.*\.so$/.test(name)) {
    const local = zip.readUInt32LE(offset + 42);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + zip.readUInt32LE(offset + 20));
    const method = zip.readUInt16LE(offset + 10);
    const elf = method === 8 ? zlib.inflateRawSync(data) : data;
    if (elf.readUInt32LE(0) !== 0x464c457f || elf[4] !== 2) throw Error(`Expected ELF64: ${name}`);
    const phoff = Number(elf.readBigUInt64LE(32));
    const entrySize = elf.readUInt16LE(54), entries = elf.readUInt16LE(56);
    for (let j = 0; j < entries; j++) {
      const ph = phoff + entrySize * j;
      if (elf.readUInt32LE(ph) === 1 && elf.readBigUInt64LE(ph + 48) < 16384n) {
        throw Error(`Native library lacks 16 KB LOAD alignment: ${name}`);
      }
    }
    nativeCount++;
  }
  offset += 46 + length + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
}
if (!hasBundle || !nativeCount) throw Error('APK must contain its JS bundle and native libraries');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) throw Error('Set ANDROID_HOME to verify APK ZIP alignment');
const tools = path.join(sdk, 'build-tools', '37.0.0');
const exe = name => path.join(tools, process.platform === 'win32' ? `${name}.exe` : name);
const aligned = spawnSync(exe('zipalign'), ['-c', '-P', '16', '4', apkPath], { encoding: 'utf8' });
if (aligned.status !== 0) throw Error(aligned.stderr || aligned.stdout || 'zipalign failed');
const manifest = spawnSync(exe('aapt2'), ['dump', 'badging', apkPath], { encoding: 'utf8' });
if (manifest.status !== 0) throw Error(manifest.stderr || 'Unable to inspect APK manifest');
if (!/(?:minSdkVersion|sdkVersion):'33'/.test(manifest.stdout) || !manifest.stdout.includes("targetSdkVersion:'36'")) throw Error('Unexpected minimum or target Android SDK');
const config = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
if (!manifest.stdout.includes("versionName='" + config.version + "'") || !manifest.stdout.includes("versionCode='" + config.android.versionCode + "'")) throw Error('APK version differs from app.json. Rebuild the APK.');
const mappingFile = 'android/app/build/outputs/mapping/release/mapping.txt';
if (fs.existsSync(mappingFile)) {
  const mapping = fs.readFileSync(mappingFile, 'utf8');
  const glStart = mapping.indexOf('expo.modules.gl.GLView ->');
  const glEnd = mapping.indexOf('\nexpo.', glStart + 1);
  const gl = mapping.slice(glStart, glEnd < 0 ? undefined : glEnd);
  if (glStart < 0 || !gl.includes('<init>(android.content.Context,expo.modules.kotlin.AppContext)')) throw Error('Release shrinker removed the reflective GLView constructor');
  const contextStart = mapping.indexOf('expo.modules.gl.GLContext ->');
  const contextEnd = mapping.indexOf('\nexpo.', contextStart + 1);
  const context = mapping.slice(contextStart, contextEnd < 0 ? undefined : contextEnd);
  if (contextStart < 0 || !/void flush\(\).* -> flush(?:\r?\n|$)/.test(context)) throw Error('Release shrinker removed or renamed the native GLContext.flush callback');
}
console.log(`APK verified: API 33 minimum, API 36 target, bundled JS, ${nativeCount} ELF64 libraries with 16 KB alignment, ZIP alignment passed.`);
