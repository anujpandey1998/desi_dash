import * as THREE from 'three';
import { CYCLE_VIEW_YAW, CYCLE_GRIP } from './cyclePresentation';
import { RUN, type Runner } from './simulation';
export function createCycleModel(){
  const root=new THREE.Group(),pivot=new THREE.Group(),bike=new THREE.Group();root.name='Cycle';root.add(pivot);pivot.add(bike);
  const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
  const mat=(color:string)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.5});materials.push(m);return m;};
  const blue=mat('#2EC4B6'),rubber=mat('#172632'),silver=mat('#D8E7EC'),gold=mat('#FFAA45');
  function add(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0){geometries.push(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  function bar(parent:THREE.Object3D,a:number[],b:number[],r=.035,m:THREE.Material=blue){const from=new THREE.Vector3(a[0],a[1],a[2]),to=new THREE.Vector3(b[0],b[1],b[2]),mesh=add(new THREE.CylinderGeometry(r,r,from.distanceTo(to),6),m,parent);mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());}
  const wheels:THREE.Group[]=[],pedals:THREE.Mesh[]=[];
  const yaw=new THREE.Quaternion(),roll=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),forward=new THREE.Vector3(0,0,1);
  for(const z of [-.75,.75]){const wheel=new THREE.Group();wheel.name=z<0?'RearWheel':'FrontWheel';wheel.position.set(0,.43,z);bike.add(wheel);wheels.push(wheel);
    add(new THREE.TorusGeometry(.41,.055,5,18).rotateY(Math.PI/2),rubber,wheel);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;bar(wheel,[0,0,0],[0,Math.sin(a)*.38,Math.cos(a)*.38],.008,silver);}
  }
  const frame=[[[0,.43,-.75],[0,.9,-.3]],[[0,.9,-.3],[0,.45,0]],[[0,.45,0],[0,.43,-.75]],[[0,.9,-.3],[0,.95,.48]],[[0,.95,.48],[0,.45,0]],[[0,.95,.48],[0,.43,.75]],[[0,.9,-.3],[0,1.13,-.34]]];
  for(const [a,b] of frame)bar(bike,a,b);
  add(new THREE.SphereGeometry(1,8,5),rubber,bike,0,1.13,-.35).scale.set(.16,.055,.22);
  bar(bike,[0,.95,.48],[0,CYCLE_GRIP.y,CYCLE_GRIP.z]);bar(bike,[-.4,CYCLE_GRIP.y,CYCLE_GRIP.z],[.4,CYCLE_GRIP.y,CYCLE_GRIP.z],.035,rubber);
  
  const grip=new THREE.Object3D();grip.name='BikeGrip';grip.position.set(CYCLE_GRIP.x,CYCLE_GRIP.y,CYCLE_GRIP.z);bike.add(grip);
  const seat=new THREE.Object3D();seat.name='BikeSeat';seat.position.set(0,1.13,-.35);bike.add(seat);
  const crank=new THREE.Group();crank.position.set(0,.45,0);bike.add(crank);
  for(const side of [-1,1]){bar(crank,[side*.12,0,0],[side*.12,side*.18,0],.02,silver);const pedal=add(new THREE.BoxGeometry(.18,.04,.12),gold,crank,side*.12,side*.18,0);pedal.name=side<0?'LowPedal':'HighPedal';pedals.push(pedal);}
  const shape=new THREE.Shape();shape.moveTo(-2,0);shape.lineTo(2,0);shape.lineTo(2,.9);shape.closePath();
  const rampG=new THREE.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false});rampG.rotateY(Math.PI/2);rampG.translate(-1,0,0);geometries.push(rampG);
  const ramps=Array.from({length:6},()=>{const mesh=new THREE.Mesh(rampG,gold);mesh.name='CycleRamp';mesh.receiveShadow=true;root.add(mesh);return mesh;});
  return{root,pivot,bike,update(s:Runner,camera:THREE.Camera,lean=0){
    pivot.visible=s.bikeTime>0;pivot.position.set(s.x,s.jumpY,0);pivot.quaternion.copy(yaw.setFromAxisAngle(up,CYCLE_VIEW_YAW)).premultiply(roll.setFromAxisAngle(forward,lean));bike.rotation.set(s.bikePitch,s.bikeYaw,0);
    const pedalPhase=s.bikePedalPhase;
    for(const wheel of wheels)wheel.rotation.x=s.distance/.41;crank.rotation.x=pedalPhase;for(const pedal of pedals)pedal.rotation.x=-pedalPhase;
    for(let i=0;i<6;i++){ramps[i].visible=s.ramps[i].active;ramps[i].position.set(s.ramps[i].lane*RUN.laneWidth,0,s.ramps[i].z);}
  },dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
