import * as THREE from 'three';
import type { Runner } from './simulation';
export type ActorKind='courier'|'aunty'|'uncle';
/** Hierarchical volumetric character: articulated hips/knees/shoulders/elbows. */
export function createCartoonActor(kind:ActorKind='courier',girl=false){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.name=kind==='courier'?'Runner':'NeighborhoodChaser';
  const geometry=new THREE.SphereGeometry(1,8,6),materials:THREE.MeshStandardMaterial[]=[];
  const material=(color:string)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.7});materials.push(m);return m;};
  const skin=material('#EFB27C'),cloth=material(kind==='courier'?'#176BFA':kind==='aunty'?'#ED6A49':'#7951C7'),pants=material('#172B4A'),hair=material(kind==='uncle'?'#6A6570':'#292122'),cream=material('#FFF5DE'),dark=material('#25202C'),teal=material('#22A69D'),gold=material('#FFC84E');
  const ellipsoid=(parent:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;};
  // Local +Z is the face direction. +90 degrees yaw gives the requested right profile.
  const torso=new THREE.Group();body.add(torso);torso.position.y=1.15;
  ellipsoid(torso,cloth,0,.2,0,.34,.48,.24);
  if(kind==='courier'){
    ellipsoid(torso,cloth,0,.55,-.07,.31,.2,.24); // hood rim
    const pack=ellipsoid(torso,teal,0,.24,-.3,.3,.37,.14);pack.name='Backpack';
    ellipsoid(torso,dark,0,.24,-.425,.24,.29,.025);
    ellipsoid(torso,teal,0,.25,-.45,.22,.25,.025);
    for(const x of [-.22,.22])ellipsoid(torso,dark,x,.32,-.23,.04,.33,.04);
  }
  const head=new THREE.Group();head.position.y=.79;torso.add(head);head.name='Head';
  ellipsoid(head,skin,0,0,0,.37,.42,.33);
  for(const side of [-1,1]){
    ellipsoid(head,skin,side*.34,-.02,.02,.1,.14,.09);
    ellipsoid(head,cream,side*.135,.06,.29,.13,.17,.065);
    ellipsoid(head,dark,side*.135,.06,.345,.075,.11,.035);
    ellipsoid(head,cream,side*.115,.105,.37,.025,.035,.012);
    const brow=ellipsoid(head,hair,side*.14,.27,.31,.14,.035,.035);brow.rotation.z=kind==='courier'?side*.12:-side*.32;
  }
  ellipsoid(head,skin,0,-.06,.34,.085,.09,.12);
  ellipsoid(head,dark,0,-.21,.29,kind==='courier'?.12:.13,kind==='courier'?.025:.08,.035);
  ellipsoid(head,hair,0,.25,-.04,.39,.25,.34);
  if(kind==='courier')for(let i=0;i<5;i++){const tuft=ellipsoid(head,hair,(i-2)*.12,.44+(i%2)*.045,.02,.1,.19,.17);tuft.rotation.z=-.45;}
  if(girl)ellipsoid(head,hair,0,-.12,-.38,.16,.43,.14);
  if(kind==='aunty'){ellipsoid(head,hair,0,.23,-.35,.21,.22,.2);ellipsoid(head,gold,0,.21,.326,.028,.035,.02);}
  if(kind==='uncle')for(const side of [-1,1])ellipsoid(head,hair,side*.09,-.13,.34,.13,.06,.045);
  const hips=new THREE.Group();hips.position.y=1.02;body.add(hips);
  const legs:{hip:THREE.Group;knee:THREE.Group}[]=[],arms:{shoulder:THREE.Group;elbow:THREE.Group}[]=[];
  for(const side of [-1,1]){
    const hip=new THREE.Group(),knee=new THREE.Group();hip.position.x=side*.18;hips.add(hip);hip.add(knee);knee.position.y=-.43;
    ellipsoid(hip,kind==='aunty'?cloth:pants,0,-.2,0,.14,.29,.15);ellipsoid(knee,kind==='aunty'?skin:pants,0,-.19,0,.12,.25,.13);
    ellipsoid(knee,cream,0,-.38,.08,.15,.11,.24);ellipsoid(knee,cloth,0,-.34,.06,.12,.06,.17);hip.name='Hip'+legs.length;knee.name='Knee'+legs.length;legs.push({hip,knee});
    const shoulder=new THREE.Group(),elbow=new THREE.Group();shoulder.position.set(side*.37,.42,0);torso.add(shoulder);shoulder.add(elbow);elbow.position.y=-.3;
    ellipsoid(shoulder,kind==='aunty'?teal:cloth,0,-.13,0,.13,.24,.14);ellipsoid(elbow,skin,0,-.12,0,.095,.2,.1);ellipsoid(elbow,skin,0,-.29,0,.1,.11,.1);shoulder.name='Shoulder'+arms.length;elbow.name='Elbow'+arms.length;arms.push({shoulder,elbow});
  }
  const backpack=torso.getObjectByName('Backpack');
  const clothHem=ellipsoid(hips,cloth,0,-.06,0,kind==='aunty'?.41:.29,kind==='aunty'?.47:.15,.24);clothHem.visible=kind==='aunty';
  if(kind==='aunty'){const sash=ellipsoid(torso,gold,.08,.16,.245,.085,.46,.025);sash.rotation.z=-.4;}
  if(kind!=='courier'){
    const hand=arms[0].elbow;
    ellipsoid(hand,kind==='aunty'?gold:dark,0,-.42,0,kind==='aunty'?.11:.025,kind==='aunty'?.19:.42,.06);
  }
  let slideBlend=0;
  return {root,body,head,torso,hips,legs,arms,setOutfit(color:string){if(kind==='courier')cloth.color.set(color);},
    animate(s:Runner,dt:number,chaser=false){
      if(s.status==='paused'&&root.userData.volumetric)return;
      if(backpack)backpack.rotation.x=s.droneTime>0?Math.sin(s.elapsed*5)*.07:0;
      const active=s.status==='running',cycling=!chaser&&s.bikeTime>0,flying=!chaser&&s.droneTime>0;
      const sliding=!chaser&&s.slideTime>0,phase=s.animationPhase*Math.PI*2;
      // Blend entry/recovery; the lowest posture stays below the slide gate.
      slideBlend=THREE.MathUtils.damp(slideBlend,sliding?Math.min(1,s.slideTime/.12):0,sliding?28:12,dt);
      body.scale.set(1,1,1);body.position.y=0;body.rotation.set(0,0,0);
      torso.rotation.x=slideBlend*1.05+(cycling?.25:chaser?.28:active?.12:0);torso.position.y=1.15-slideBlend*.88;
      hips.position.y=1.02-slideBlend*.47;
      head.rotation.x=-slideBlend*.55;head.rotation.z=active?Math.sin(phase*2)*.025:0;
      for(let i=0;i<2;i++){
        const swing=Math.sin(phase+i*Math.PI),leg=legs[i],arm=arms[i];
        leg.hip.rotation.x=(active?swing*.85:0)*(1-slideBlend)-1.25*slideBlend;
        leg.knee.rotation.x=(active?Math.max(0,-swing)*1.35:.08)*(1-slideBlend)+1.6*slideBlend;
        if(cycling){const a=s.bikePedalPhase+(i===0?Math.PI:0),y=.45+Math.cos(a)*.18-hips.position.y+.08,z=Math.sin(a)*.18,d=Math.min(.8,Math.hypot(y,z)),k=-Math.acos(THREE.MathUtils.clamp((d*d-.43*.43-.38*.38)/(2*.43*.38),-1,1));leg.hip.rotation.x=Math.atan2(-z,-y)-Math.atan2(.38*Math.sin(k),.43+.38*Math.cos(k));leg.knee.rotation.x=k;}
        arm.shoulder.rotation.x=flying?Math.PI:cycling?(s.trick==='noHands'?-2.1:-1.15):sliding?-1.1:active?-swing*(chaser?1.15:.75):0;
        arm.elbow.rotation.x=cycling?-.45:active?-.65:0;
        if(cycling&&s.trick!=='noHands'){const y=.15*Math.cos(.48)+.48*Math.sin(.48)-.42,z=-.15*Math.sin(.48)+.48*Math.cos(.48),d=Math.hypot(y,z),k=-Math.acos(THREE.MathUtils.clamp((d*d-.3*.3-.29*.29)/(2*.3*.29),-1,1));arm.shoulder.rotation.x=Math.atan2(-z,-y)-Math.atan2(.29*Math.sin(k),.3+.29*Math.cos(k));arm.elbow.rotation.x=k;}
        arm.shoulder.rotation.z=chaser&&s.droneTime>0?(i===0?-.8:.2):0;
      }
      if(chaser&&s.caught){body.rotation.z=Math.sin(s.elapsed*12)*.12;for(const a of arms){a.shoulder.rotation.x=-1.2;a.elbow.rotation.x=-.5;}}
      clothHem.rotation.x=Math.sin(phase)*.1;clothHem.rotation.z=Math.sin(phase)*.06;
      if(!chaser){
        if(s.jumpY>.02&&!flying&&!cycling){for(const l of legs){l.hip.rotation.x=-.5;l.knee.rotation.x=1;}body.scale.y=1.04;}
        if(s.jumpAnticipation>0)body.scale.y=.88;
        if(s.landingTime>0){body.scale.y=1-s.landingTime*.35;body.scale.x=1+s.landingTime*.2;}
        if(s.stumbleTime>0)body.rotation.z=Math.sin(s.elapsed*30)*.18;
        if(s.caught)body.rotation.z=-.25;
      }
      root.userData.spriteFrame=flying?5:sliding?6:s.jumpY>.02?4:active?Math.floor(s.animationPhase*8)%4:7;
      root.userData.slideBlend=slideBlend;root.userData.volumetric=true;
    },dispose(){geometry.dispose();for(const m of materials)m.dispose();}};
}
