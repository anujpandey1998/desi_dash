import * as THREE from 'three';
import atlas from '../assets/runner/chaser-run-frames.json';
import type {Runner} from './simulation';
export function createChaserSprite(source:THREE.Texture){
  const root=new THREE.Group();root.name='NeighborhoodChaser';const map=source.clone();if((source as any).isDataTexture)(map as any).isDataTexture=true;
  map.colorSpace=THREE.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=map.magFilter=THREE.LinearFilter;map.needsUpdate=true;
  const geometry=new THREE.PlaneGeometry(1,1),material=new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.17,side:THREE.DoubleSide,toneMapped:false}),sprite=new THREE.Mesh(geometry,material);root.add(sprite);
  return {root,update(s:Runner,camera:THREE.Camera){
    const count=s.chaserKind===0?10:6,offset=s.chaserKind===0?0:10,frame=offset+(s.caught?0:Math.floor(s.animationPhase*8)%count),f=atlas.frames[frame],unit=2.75/f.h;
    map.repeat.set(f.w/atlas.width,f.h/atlas.height);map.offset.set(f.x/atlas.width,1-(f.y+f.h)/atlas.height);
    sprite.scale.set(f.w*unit,f.h*unit,1);sprite.position.y=f.h*unit/2+.02;
    root.rotation.y=Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z);
    root.rotation.z=s.chaserEscaped>0?Math.sin(s.elapsed*8)*.035:0;root.userData.style='matching-courier-art';root.userData.runFrame=frame;
  },dispose(){map.dispose();geometry.dispose();material.dispose();}};
}
