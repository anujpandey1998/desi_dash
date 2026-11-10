import * as THREE from 'three';
import type { Runner } from './simulation';
import boyAtlas from '../assets/runner/boy-back-frames.json';
import girlAtlas from '../assets/runner/girl-back-frames.json';
import type {CharacterId} from './profile';
import {createCyclePresentation} from './cyclePresentation';

/** Approved face/clothes rendered as dimensionally shaded, back-facing artwork. */
export function createReferenceCourier(source:THREE.Texture,character:CharacterId='boy'){
  const atlas=character==='girl'?girlAtlas:boyAtlas;
  const root=new THREE.Group(),body=new THREE.Group();root.name='Runner';root.add(body);
  const map=source.clone();if((source as any).isDataTexture)(map as any).isDataTexture=true;
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.generateMipmaps=false;map.minFilter=map.magFilter=THREE.LinearFilter;map.needsUpdate=true;
  const material=new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.12,side:THREE.DoubleSide,toneMapped:false});
  const geometry=new THREE.PlaneGeometry(2.8,2.8),sprite=new THREE.Mesh(geometry,material);sprite.name='ApprovedBackCourier';sprite.position.y=1.4;body.add(sprite);
  const cycleGeometry=new THREE.PlaneGeometry(2.8,2.8,32,40),cycleFrame=atlas.frames[13],cycleUnit=2.8/(atlas.width/4)*.9;
  const cyclePose=createCyclePresentation(cycleGeometry,character,cycleFrame.w*cycleUnit,cycleFrame.h*cycleUnit);
  const tint={value:new THREE.Color('#176BFA')},recolor={value:0};
  material.onBeforeCompile=shader=>{shader.uniforms.courierTint=tint;shader.uniforms.courierRecolor=recolor;shader.fragmentShader='uniform vec3 courierTint; uniform float courierRecolor;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float blueMask=step(diffuseColor.r*1.8,diffuseColor.b)*step(diffuseColor.g*1.4,diffuseColor.b)*step(.2,diffuseColor.b);
    diffuseColor.rgb=mix(diffuseColor.rgb,courierTint*max(diffuseColor.b,.15),blueMask*courierRecolor);`);};
  let frame=-1,lastSliding=false,lean=0;
  return{root,body,map,setOutfit(color:string){recolor.value=color.toLowerCase()==='#176bfa'?0:1;tint.value.set(color);},
    animate(s:Runner,dt:number,camera:THREE.Camera){
      const flying=s.droneTime>0,cycling=s.bikeTime>0,sliding=s.slideTime>0&&!flying;
      // Keep a stable seated pose: alternating mirrored full-body frames flashes at high speed.
      const next=flying?12:sliding?(s.slideTime>.8?8:s.slideTime<.12?10:9):cycling?13:s.jumpY>.02?11:s.stumbleTime>0?8:s.status==='running'?Math.floor(s.animationPhase*8)%8:15;
      if(next!==frame||sliding!==lastSliding){frame=next;lastSliding=sliding;const f=atlas.frames[frame],unit=2.8/(atlas.width/4)*(cycling?.9:1),limit=sliding?1.2:frame===8?1.65:4,scale=Math.min(1,limit/(f.h*unit));
        map.repeat.set(f.w/atlas.width,f.h/atlas.height);map.offset.set(f.x/atlas.width,1-(f.y+f.h)/atlas.height);
        sprite.scale.set(f.w*unit*scale/2.8,f.h*unit*scale/2.8,1);sprite.position.set(0,f.h*unit*scale/2+.01,0);root.userData.visualHeight=f.h*unit*scale;
      }
      sprite.geometry=cycling?cycleGeometry:geometry;
      body.position.set(0,0,0);body.rotation.set(0,0,0);
      body.rotation.y=Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z);
      lean=THREE.MathUtils.damp(lean,s.stumbleTime>0?Math.sin(s.elapsed*25)*.1:s.caught?-.12:0,15,dt);
      body.rotation.z=lean;
      body.scale.y=THREE.MathUtils.damp(body.scale.y,s.landingTime>0?1-s.landingTime*.25:1,16,dt);
      if(cycling)cyclePose.update(s,Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z),body);
      root.userData.cycleAnchors=cycling?cyclePose.anchors:null;
      root.userData.frontAtlasFrame=frame;root.userData.faceVisible=false;root.userData.backOnly=true;root.userData.character=character;root.userData.appearance='approved-blue-courier';root.userData.volumetric=false;
      root.userData.spriteFrame=flying?5:sliding?6:s.jumpY>.02?4:s.status==='running'?Math.floor(s.animationPhase*8)%4:7;
    },dispose(){cycleGeometry.dispose();geometry.dispose();material.dispose();map.dispose();}};
}
