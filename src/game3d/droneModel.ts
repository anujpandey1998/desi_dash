import * as THREE from 'three';
export function createDroneModel(){
  const root=new THREE.Group();root.name='DeliveryDrone';const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
  const mat=(color:string,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:.4});materials.push(m);return m;};
  const teal=mat('#2EC4B6',.25),dark=mat('#163958',.4),white=mat('#E7F8FF'),gold=new THREE.MeshBasicMaterial({color:'#9CFFF2'});materials.push(gold);
  const add=(g:THREE.BufferGeometry,m:THREE.Material,at:number[])=>{geometries.push(g);const o=new THREE.Mesh(g,m);o.position.set(at[0],at[1],at[2]);root.add(o);return o;};
  const shell=add(new THREE.SphereGeometry(.48,12,8),teal,[0,0,0]);shell.scale.set(1,.42,.8);
  const rotors:THREE.Mesh[]=[];
  for(const x of [-.65,.65])for(const z of [-.56,.56]){
    const arm=add(new THREE.BoxGeometry(.08,.07,.85),dark,[x/2,0,z/2]);arm.rotation.y=x*z>0?-.9:.9;
    const rim=add(new THREE.TorusGeometry(.32,.025,4,16),dark,[x,.07,z]);rim.rotation.x=Math.PI/2;
    const blade=add(new THREE.BoxGeometry(.53,.018,.065),white,[x,.09,z]);rotors.push(blade);
    const light=add(new THREE.SphereGeometry(.045,6,4),gold,[x,-.02,z]);light.name='DroneLight';
  }
  const grips:THREE.Object3D[]=[],skids:THREE.Object3D[]=[];
  for(const x of [-.4,.4]){
    skids.push(add(new THREE.CylinderGeometry(.025,.025,.64,5),dark,[x,-.44,0]));
    skids.push(add(new THREE.BoxGeometry(.07,.065,.42),dark,[x,-.76,0]));
    const grip=new THREE.Object3D();grip.position.set(x,-.76,0);root.add(grip);grips.push(grip);
  }
  root.visible=false;
  return{root,grips,setGripWidth(width:number){for(let i=0;i<grips.length;i++){const x=(i===0?-1:1)*width;grips[i].position.x=x;skids[i*2].position.x=x;skids[i*2+1].position.x=x;}},update(time:number,lean=0){rotors.forEach((r,i)=>r.rotation.y=time*(i%2?55:-55));root.rotation.z=Math.sin(time*4)*.035+THREE.MathUtils.clamp(lean*.7,-.24,.24);},dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
