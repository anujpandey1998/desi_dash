import * as THREE from 'three';

/** Allocation-free two-bone IK. Target is in world space; joints point down local Y. */
export function createLimbSolver(){
  const target=new THREE.Vector3(),axis=new THREE.Vector3(),bend=new THREE.Vector3(),joint=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0),tip=new THREE.Vector3(),inverse=new THREE.Quaternion();
  return (upper:THREE.Group,lower:THREE.Group,world:THREE.Vector3,a:number,b:number)=>{
    upper.parent!.updateWorldMatrix(true,false);
    target.copy(world);upper.parent!.worldToLocal(target);target.sub(upper.position);
    const d=THREE.MathUtils.clamp(target.length(),.01,a+b-.001);
    target.setLength(d);axis.copy(target).normalize();bend.set(0,0,1).addScaledVector(axis,-axis.z).normalize();
    const along=(a*a+d*d-b*b)/(2*d);
    joint.copy(axis).multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
    upper.quaternion.setFromUnitVectors(down,tip.copy(joint).normalize());
    tip.copy(target).sub(joint).applyQuaternion(inverse.copy(upper.quaternion).invert()).normalize();
    lower.quaternion.setFromUnitVectors(down,tip);
  };
}
