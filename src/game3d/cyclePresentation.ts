import * as THREE from 'three';
import type { CharacterId } from './profile';
import type { Runner } from './simulation';
export const CYCLE_VIEW_YAW=Math.PI-.6;
export const CYCLE_GRIP={x:-.4,y:1.78,z:.6};
const anchors={boy:{hip:[.33,.32],low:[.42,.09],high:[.84,.34],hand:[.76,.60]},girl:{hip:[.45,.28],low:[.54,.09],high:[.90,.36],hand:[.82,.57]}};
/** Deform only the authored cycle pose; head/backpack and the texture identity remain unchanged. */
export function createCyclePresentation(geometry:THREE.PlaneGeometry,character:CharacterId,width:number,height:number){
  const a=anchors[character],position=geometry.attributes.position,uv=geometry.attributes.uv;
  const original=new Float32Array(position.array),weights=new Float32Array(position.count*3);
  const base=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),CYCLE_VIEW_YAW),baseInverse=base.clone().invert();
  const neutral=new THREE.Quaternion(),inverse=new THREE.Quaternion(),delta=new THREE.Quaternion(),stunt=new THREE.Quaternion(),euler=new THREE.Euler(),up=new THREE.Vector3(0,1,0);
  const offset=new THREE.Vector3(),hip=new THREE.Vector3((a.hip[0]-.5)*width,a.hip[1]*height+.01,0),seat=new THREE.Vector3(0,1.13,-.35).applyQuaternion(base);
  const shifts=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],target=new THREE.Vector3();
  const sx=width/2.8,sy=height/2.8;
  for(let i=0;i<position.count;i++){
    const u=uv.getX(i),v=uv.getY(i),py=1-v;
    const distance=(point:number[])=>Math.hypot((u-point[0])*width,(v-point[1])*height);
    weights[i*3]=(1-THREE.MathUtils.smoothstep(distance(a.low),.30,.9))*THREE.MathUtils.smoothstep(py,.72,.84);
    weights[i*3+1]=(1-THREE.MathUtils.smoothstep(distance(a.high),.32,.9))*THREE.MathUtils.smoothstep(u,.54,.72)*THREE.MathUtils.smoothstep(py,.48,.56);
    weights[i*3+2]=(1-THREE.MathUtils.smoothstep(distance(a.hand),.22,.8))*THREE.MathUtils.smoothstep(u,.48,.66)*(1-THREE.MathUtils.smoothstep(py,.50,.56));
  }
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),5);
  function shift(index:number,point:number[],x:number,y:number,z:number){
    target.set(x,y,z).applyQuaternion(base).sub(offset).applyQuaternion(inverse);
    shifts[index].set((target.x-(point[0]-.5)*width)/sx,(target.y-(point[1]*height+.01))/sy,target.z);
  }
  return {anchors:a,update(s:Runner,cameraYaw:number,body:THREE.Group){
    neutral.setFromAxisAngle(up,cameraYaw);inverse.copy(neutral).invert();
    offset.copy(hip).applyQuaternion(neutral).negate().add(seat);
    stunt.setFromEuler(euler.set(s.bikePitch,s.bikeYaw,0));delta.copy(base).multiply(stunt).multiply(baseInverse);
    body.position.copy(offset).applyQuaternion(delta);body.quaternion.copy(delta).multiply(neutral);body.scale.set(1,1,1);
    const phase=s.bikePedalPhase||0;
    shift(0,a.low,-.12,.45-Math.cos(phase)*.18+.07,-Math.sin(phase)*.18);
    shift(1,a.high,.12,.45+Math.cos(phase)*.18+.07,Math.sin(phase)*.18);
    shift(2,a.hand,CYCLE_GRIP.x,CYCLE_GRIP.y,CYCLE_GRIP.z);
    if(s.trick==='noHands')shifts[2].set(0,0,0);
    for(let i=0;i<position.count;i++){
      const j=i*3;let x=original[j],y=original[j+1],z=original[j+2];
      for(let k=0;k<3;k++){const w=weights[j+k],d=shifts[k];x+=d.x*w;y+=d.y*w;z+=d.z*w;}
      position.setXYZ(i,x,y,z);
    }
    position.needsUpdate=true;
  }};
}
