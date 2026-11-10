import * as THREE from 'three';
import packed from '../assets/textures/roof-pixels.json';

/** Offline packed pixels avoid DOM/canvas and asynchronous texture loads on Android. */
export function createRoofTexture() {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',bytes=new Uint8Array(packed.width*packed.height*4);
  let buffer=0,bits=0,write=0;
  for(const c of packed.pixels){const value=alphabet.indexOf(c);if(value<0)break;buffer=(buffer<<6)|value;bits+=6;if(bits>=8){bits-=8;bytes[write++]=(buffer>>>bits)&255;}}
  const texture=new THREE.DataTexture(bytes,packed.width,packed.height,THREE.RGBAFormat);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,12);texture.colorSpace=THREE.SRGBColorSpace;
  texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
