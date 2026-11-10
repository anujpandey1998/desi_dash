import * as THREE from 'three';
import { createSurfaceLibrary } from './surfaces';
import { createRoofTexture } from './roofTexture';

/** Discrete buildings linked by metal roof bridges; safe lanes stay unchanged. */
export function createTerraceRoute(){
  const root=new THREE.Group();root.name='TerraceRoute';const geo=new THREE.BoxGeometry(1,1,1),materials:THREE.Material[]=[],meshes:THREE.InstancedMesh[]=[];
  const surfaces=createSurfaceLibrary(),tex=createRoofTexture();
  const floor=new THREE.MeshStandardMaterial({color:'#F4F2E8',map:tex,roughness:.94});materials.push(floor);
  const dummy=new THREE.Object3D();
  function batch(color:string,count:number,place:(i:number,o:THREE.Object3D)=>void,material?:THREE.Material){const m=material||new THREE.MeshStandardMaterial({color,roughness:.86});if(!material)materials.push(m);const mesh=new THREE.InstancedMesh(geo,m,count);mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);for(let i=0;i<count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);place(i,dummy);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}return mesh;}
  const depth=(i:number)=>1.5-i*27;
  batch('',9,(i,o)=>{o.position.set(0,-.14,depth(i));o.scale.set(14.4,.26,25.4);},floor);
  const facades=batch('#FFFFFF',9,(i,o)=>{o.position.set(0,-4.2,depth(i));o.scale.set(14.1,8,25.2);});
  const colors=['#D8B99B','#A6C5BD','#E2CEAF'];for(let i=0;i<9;i++)facades.setColorAt(i,new THREE.Color(colors[i%3]));
  batch('#E8D6B9',18,(i,o)=>{o.position.set((i%2?1:-1)*7.05,.32,depth(Math.floor(i/2)));o.scale.set(.22,.65,25.1);});
  batch('#BDB5A0',18,(i,o)=>{o.position.set((i%2?1:-1)*7.05,.67,depth(Math.floor(i/2)));o.scale.set(.4,.1,25.3);});
  batch('#5C777C',9,(i,o)=>{o.position.set(0,-.04,depth(i)-13.5);o.scale.set(8.6,.16,1.65);});
  batch('#344851',72,(i,o)=>{o.position.set((i%8-3.5)*1.05,.05,depth(Math.floor(i/8))-13.5);o.scale.set(.035,.02,1.65);});
  batch('#C9B89F',18,(i,o)=>{o.position.set((i%2?1:-1)*5.7,.10,depth(Math.floor(i/2))+(i%2?-7:6));o.scale.set(1.45,.18,2.8);});
  batch('#8C9C91',18,(i,o)=>{o.position.set((i%2?1:-1)*5.6,.17,depth(Math.floor(i/2))-1);o.scale.set(1.5,.02,2.2);});
  batch('#365A69',54,(i,o)=>{const side=i%2?1:-1;o.position.set(side*7.08,-1.9-Math.floor(i/2)%3*2.2,depth(Math.floor(i/6))+3);o.scale.set(.06,.95,1.3);});
  return{root,update(distance:number){root.position.z=distance%27;},dispose(){meshes.forEach(m=>m.dispose());geo.dispose();materials.forEach(m=>m.dispose());tex.dispose();surfaces.dispose();}};
}
