import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createChaserSprite } from './chaserSprite';
import type { Runner } from './simulation';

/** Fixed pools: no particles, bird meshes or materials allocated during a frame. */
export function createChaseEffects(texture:THREE.Texture) {
  const root=new THREE.Group();root.name='ChaseEffects';
  const materials:THREE.Material[]=[],geometries:THREE.BufferGeometry[]=[];
  const keep=<T extends THREE.BufferGeometry>(g:T)=>{geometries.push(g);return g;};
  const mat=(color:string,opacity=1)=>{const m=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1});materials.push(m);return m;};
  const parts=[new THREE.SphereGeometry(.2,8,5).scale(1.4,.8,.8),new THREE.SphereGeometry(.13,8,5).translate(.22,.13,0)];
  const shape=mergeGeometries(parts)!;for(const g of parts)g.dispose();
  const dummy=new THREE.Object3D(),birdColor=new THREE.Color(),birdBody=new THREE.InstancedMesh(keep(shape),mat('#FFFFFF'),18);
  const wingG=keep(new THREE.SphereGeometry(.27,6,4).scale(1.6,.16,.8)),wingM=mat('#334551');
  const left=new THREE.InstancedMesh(wingG,wingM,18),right=new THREE.InstancedMesh(wingG,wingM,18);
  const beak=new THREE.InstancedMesh(keep(new THREE.ConeGeometry(.07,.19,5).rotateZ(-Math.PI/2).translate(.38,.12,0)),mat('#FFC44D'),18);
  root.add(birdBody,left,right,beak);birdBody.name='AirBirds';
  const dust=new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(.075,0)),mat('#EED9AD',.35),24);root.add(dust);
  for(const mesh of [birdBody,left,right,beak,dust])mesh.frustumCulled=false;
  const skyline=new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1,1,1)),mat('#A5A6A5'),32);skyline.frustumCulled=false;root.add(skyline);
  const lineG=keep(new THREE.BufferGeometry()),lineData=new Float32Array(16*6);lineG.setAttribute('position',new THREE.BufferAttribute(lineData,3));
  const lineM=new THREE.LineBasicMaterial({color:'#CDEAFF',transparent:true,opacity:.5});materials.push(lineM);
  const lines=new THREE.LineSegments(lineG,lineM);root.add(lines);
  const actor=createChaserSprite(texture),chaser=actor.root;root.add(chaser);
  // Fixed ring buffer gives a 0.4 second reaction delay without frame allocations.
  const history=new Float32Array(128),times=new Float64Array(128);let cursor=1,total=1,lastTick=-1,caughtTime=0;times[0]=-.4;
  return {root,update(s:Runner,dt:number,camera:THREE.Camera){
    let count=0;for(const b of s.birds){if(!b.active)continue;
      dummy.position.set(b.x,b.y,b.z);dummy.rotation.set(0,b.vx>0?0:Math.PI,0);dummy.scale.set(1.5,1,.8);dummy.updateMatrix();birdBody.setMatrixAt(count,dummy.matrix);beak.setMatrixAt(count,dummy.matrix);birdBody.setColorAt(count,birdColor.set(b.kind?'#26333F':'#81919D'));
      for(const [sign,wing] of [[-1,left],[1,right]] as const){dummy.position.set(b.x+sign*.3,b.y,b.z);dummy.rotation.set(0,0,sign*Math.sin(s.elapsed*18+b.z)*.65);dummy.scale.set(1,1,1);dummy.updateMatrix();wing.setMatrixAt(count,dummy.matrix);}count++;
    }
    for(const mesh of [birdBody,left,right,beak]){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}if(birdBody.instanceColor)birdBody.instanceColor.needsUpdate=true;
    const moving=s.status==='running',grounded=s.jumpY<.02;
    for(let i=0;i<32;i++){const h=5+(i*7%13);dummy.position.set((i%2?-1:1)*(26+i%5*4),h/2-8,-160+(i%16)*12+(s.distance*.25)%12);dummy.rotation.set(0,0,0);dummy.scale.set(5,h,6);dummy.updateMatrix();skyline.setMatrixAt(i,dummy.matrix);}skyline.instanceMatrix.needsUpdate=true;
    dust.count=moving&&grounded?24:s.landingTime>0?24:0;
    (dust.material as THREE.MeshBasicMaterial).color.set(s.slideTime>0?'#FFB54D':'#EED9AD');
    for(let i=0;i<dust.count;i++){const life=(s.animationPhase*1.7+i/24)%1,landing=s.landingTime>0;
      dummy.position.set(s.x+(i%2?-.25:.25)+Math.sin(i*4)*life*(landing?1.5:.3),.07+Math.sin(life*Math.PI)*.15,life*2.8);
      dummy.rotation.set(0,0,i);dummy.scale.setScalar((1-life)*(landing?2.3:1));dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);
    }dust.instanceMatrix.needsUpdate=true;
    lines.visible=moving&&(s.boostTime>0||s.speed>19);
    if(lines.visible){for(let i=0;i<16;i++){const phase=(s.elapsed*1.5+i*.127)%1,x=(i%2?1:-1)*(3.8+i%3),y=1+(i%5)*.6+s.jumpY,z=-20+phase*27;lineData.set([x,y,z,x,y,z-2.5],i*6);}lineG.attributes.position.needsUpdate=true;}
    chaser.visible=s.limit===0&&!s.training;
    // Perspective already conveys distance; do not shrink the chaser a second time.
    chaser.scale.setScalar(1);
    if(s.tick<lastTick){cursor=1;total=1;history[0]=0;times[0]=s.elapsed-.4;chaser.position.x=0;}lastTick=s.tick;
    if(s.status==='running'){
      history[cursor]=s.x;times[cursor]=s.elapsed;cursor=(cursor+1)%128;total=Math.min(128,total+1);
      let target=history[(cursor-total+128)%128];
      for(let i=0;i<total;i++){const j=(cursor-1-i+128)%128;if(times[j]<=s.elapsed-.4){target=history[j];break;}}
      chaser.position.x=THREE.MathUtils.damp(chaser.position.x,target,9,dt);
    }
    chaser.position.y=0;chaser.position.z=Math.max(.8,s.chaserGap);
    actor.update(s,camera);
    caughtTime=s.caught?caughtTime+dt:0;
    if(s.caught){chaser.rotation.z=Math.sin(caughtTime*14)*.1;}
  },dispose(){birdBody.dispose();left.dispose();right.dispose();beak.dispose();dust.dispose();skyline.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();actor.dispose();}};
}
