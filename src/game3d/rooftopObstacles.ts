import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
/** Eight roof objects, each merged to one vertex-colored mesh and shared by all slots. */
export function createRooftopObstacles(){
  const models=new Map<string,THREE.Mesh>(),owned:THREE.BufferGeometry[]=[],material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.83,metalness:.08});
  function build(key:string,make:(part:(g:THREE.BufferGeometry,color:string,x:number,y:number,z:number,rx?:number,ry?:number,rz?:number)=>void)=>void){
    const parts:THREE.BufferGeometry[]=[];
    make((g,color,x,y,z,rx=0,ry=0,rz=0)=>{const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1));g.applyMatrix4(m);const c=new THREE.Color(color),colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(g);});
    const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());owned.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.name=key;models.set(key,mesh);
  }
  const box=(x:number,y:number,z:number)=>new THREE.BoxGeometry(x,y,z),cyl=(r:number,h:number,n=12)=>new THREE.CylinderGeometry(r,r,h,n);
  build('tank-0',p=>{p(box(1.9,.27,1.9),'#AD775B',0,.135,0);p(cyl(.8,1.65),'#26383D',0,1.1,0);for(let i=0;i<6;i++)p(cyl(.82,.045),'#3E5051',0,.4+i*.27,0);p(cyl(.84,.09),'#172D34',0,1.97,0);p(cyl(.35,.09),'#172D34',0,2.05,0);p(cyl(.055,1.75),'#D6E1DA',-.98,1.03,0);p(cyl(.055,.5),'#D6E1DA',-.75,1.89,0,0,0,Math.PI/2);p(box(.25,.08,.12),'#46B3B0',-.93,.4,.05);});
  build('tank-1',p=>{p(box(1.8,1.15,.65),'#DDDCD0',0,.78,0);p(box(1.72,1.04,.04),'#A9B1AC',0,.78,.35);p(cyl(.43,.045,20),'#33454B',-.25,.8,.39,Math.PI/2);for(let i=0;i<4;i++)p(new THREE.TorusGeometry(.12+i*.09,.012,4,20),'#BAC3BE',-.25,.8,.43);for(let i=0;i<4;i++)p(box(.04,.6,.025),'#BAC3BE',-.25,.8,.45,0,0,i*Math.PI/4);for(const x of [-.66,.66])p(box(.14,.25,.8),'#727F7C',x,.15,0);for(let i=0;i<5;i++)p(box(.34,.025,.03),'#717D7E',.56,.5+i*.13,.4);});
  build('tank-2',p=>{for(const x of [-.65,.65])p(box(.12,.55,1.1),'#647F84',x,.275,0);p(box(2.2,.09,1.8),'#365D79',0,.78,0,-.32);for(let i=0;i<6;i++)p(box(.018,.012,1.75),'#A5CCDC',-.99+i*.4,.85,0,-.32);for(let i=0;i<4;i++)p(box(2.1,.012,.018),'#A5CCDC',0,.57+i*.17,-.78+i*.5,-.32);});
  build('tank-3',p=>{p(box(1.4,.14,1.3),'#B5ADA0',0,.07,0);p(cyl(.06,.9),'#667D83',0,.55,0);p(new THREE.SphereGeometry(.65,16,8,0,Math.PI*2,0,Math.PI/2),'#BEC5BF',0,1.1,0,.6,0,0);p(cyl(.035,.8),'#506D77',.2,1.05,.25,Math.PI/3,0,.3);p(box(.18,.15,.15),'#E1DECE',.3,1.1,.58);});
  build('barrier-0',p=>{for(const z of [-.28,.28]){p(cyl(.095,2.15),'#C8D5CD',0,.3,z,0,0,Math.PI/2);for(const x of [-.85,.85])p(box(.25,.23,.22),'#AAA38C',x,.115,z);}for(const x of [-.8,.8])p(cyl(.12,.1),'#879F9F',x,.3,.28,0,0,Math.PI/2);});
  build('barrier-1',p=>{for(let i=0;i<9;i++)p(box(.48,.2,.32),i%2?'#BC8060':'#A4664E',(i%3-1)*.5,.1+Math.floor(i/3)*.2,-.2);for(let i=0;i<3;i++)p(box(.8,.18,.42),'#CABB91',.28,.1+i*.19,.42);p(box(.8,.035,.6),'#3185A9',-.5,.64,-.3);});
  build('barrier-2',p=>{p(box(2,.25,1.45),'#AFA78D',0,.125,0);p(box(1.8,.08,1.25),'#5C8E9B',0,.5,0,-.3);for(const x of [-.92,0,.92])p(box(.045,.05,1.3),'#AFBDBC',x,.53,0,-.3);for(const z of [-.65,.65])p(box(1.9,.05,.05),'#AFBDBC',0,.53,z,-.3);});
  build('arch-0',p=>{for(const x of [-1.03,1.03]){p(box(.22,.22,.4),'#A69F8A',x,.11,0);p(cyl(.035,2.5),'#606E68',x,1.35,0);}p(cyl(.015,2.1),'#958B6C',0,2.5,0,0,0,Math.PI/2);for(let i=0;i<3;i++){p(box(.55,1.15,.035),['#CC655E','#5F98B3','#E9BF65'][i],-.68+i*.68,1.92,0);p(box(.06,.14,.06),'#C58B46',-.85+i*.68,2.49,.015);}});
  return{clone(key:string){const model=models.get(key);if(!model)throw Error('Unknown rooftop obstacle '+key);return model.clone();},dispose(){owned.forEach(g=>g.dispose());material.dispose();}};
}
