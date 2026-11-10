import * as THREE from 'three';

export type Surface = 'plaster' | 'concrete' | 'brick' | 'fabric' | 'tank';

/** Small deterministic, offline textures: works in Expo GL without DOM/canvas. */
export function createSurfaceLibrary() {
  const textures: THREE.DataTexture[] = [];
  const cache = new Map<Surface, THREE.DataTexture>();
  function get(kind: Surface) {
    const existing = cache.get(kind);
    if (existing) return existing;
    const size = 128, data = new Uint8Array(size * size * 4);
    let seed = 70417;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const noise = random(), row = Math.floor(y / 16);
      const mortar = y % 16 < 2 || (x + (row % 2) * 16) % 32 < 2;
      const stain = Math.sin(x * 0.07 + Math.sin(y * 0.06)) * Math.cos(y * 0.04) * 9;
      let value = 225 + (noise - 0.5) * 18 + stain;
      if (kind === 'concrete') value = 207 + (noise - 0.5) * 30 + stain * 1.5 - (noise < 0.018 ? 40 : 0);
      if (kind === 'brick') value = mortar ? 175 : 225 + (noise - 0.5) * 28 + Math.sin(row * 11 + Math.floor(x / 32)) * 12;
      if (kind === 'fabric') value = 225 + (x % 3 === 0 || y % 3 === 0 ? -18 : 3) + noise * 7;
      if (kind === 'tank') value = 226 + (noise - 0.5) * 10 + Math.sin(x * 0.12) * 5 - (y % 24 < 3 ? 18 : 0);
      const p = (y * size + x) * 4;
      data[p] = data[p + 1] = data[p + 2] = Math.max(0, Math.min(255, value)); data[p + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
    textures.push(texture); cache.set(kind, texture); return texture;
  }
  return { get, dispose() { textures.forEach(texture => texture.dispose()); } };
}
