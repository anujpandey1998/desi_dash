const fs = require('node:fs');
const path = require('node:path');
const { generateImageAsync } = require('@expo/image-utils');
const root = path.resolve(__dirname, '..');
const res = path.join(root, 'android/app/src/main/res');
const brand = path.join(root, 'src/assets/branding');
async function png(src, width, height, round = false) {
  const result = await generateImageAsync({ projectRoot: root, cacheType: 'rooftop-brand' }, { src, width, height, resizeMode: 'cover', backgroundColor: round ? 'transparent' : '#246BFD', removeTransparency: !round, ...(round ? { borderRadius: width / 2 } : {}) });
  return result.source;
}
async function main() {
  const icon = path.join(brand, 'app-icon.png');
  for (const [density, size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]) {
    const dir = path.join(res, 'mipmap-' + density); fs.mkdirSync(dir, { recursive: true });
    for (const [name, round] of [['ic_launcher',false],['ic_launcher_round',true]]) {
      fs.writeFileSync(path.join(dir, name + '.png'), await png(icon,size,size,round));
      const old = path.resolve(dir, name + '.webp');
      if (!old.startsWith(res + path.sep)) throw Error('Unexpected resource path');
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
  }
  const drawable = path.join(res, 'drawable-nodpi'); fs.mkdirSync(drawable, { recursive: true });
  fs.writeFileSync(path.join(drawable, 'rooftop_splash_icon.png'), await png(icon,256,256,true));
  const exports = path.join(brand, 'store'); fs.mkdirSync(exports, { recursive: true });
  fs.writeFileSync(path.join(exports, 'app-icon-512.png'), await png(icon,512,512));
  fs.writeFileSync(path.join(exports, 'feature-graphic-1024x500.png'), await png(path.join(brand,'feature-banner.png'),1024,500));
  console.log('Prepared Android launcher densities, native launch icon and store-size PNG exports.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
