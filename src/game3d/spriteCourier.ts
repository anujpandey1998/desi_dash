import * as THREE from 'three';

/** Reference-art runner on an animated camera-facing plane inside the 3D world. */
export function createSpriteCourier(source: THREE.Texture, runSource?: THREE.Texture) {
  const root = new THREE.Group(); root.name = 'Runner';
  const body = new THREE.Group(); root.add(body);
  const texture = source.clone();
  // R3F native marks URI-backed images this way for EXGL's non-DOM upload path.
  // Texture.copy() does not carry that extra flag onto an ordinary Texture clone.
  if ((source as THREE.Texture & { isDataTexture?: boolean }).isDataTexture) {
    (texture as THREE.Texture & { isDataTexture?: boolean }).isDataTexture = true;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false; texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const runMap = runSource?.clone();
  if(runMap){if((runSource as any).isDataTexture)(runMap as any).isDataTexture=true;runMap.colorSpace=THREE.SRGBColorSpace;runMap.wrapS=runMap.wrapT=THREE.ClampToEdgeWrapping;runMap.generateMipmaps=false;runMap.minFilter=runMap.magFilter=THREE.LinearFilter;runMap.needsUpdate=true;}
  const image = source.image as { width?: number; height?: number };
  const width = image?.width || 1536, height = image?.height || 1024;
  // Inner gutters prevent adjacent poses bleeding into shoes/raised hands.
  texture.repeat.set(1 / 4 - 4 / width, 1 / 2 - 8 / height);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, alphaTest: 0.12, side: THREE.DoubleSide });
  const recolor = { value: 0 }, tint = { value: new THREE.Color('#176BFA') };
  material.onBeforeCompile = shader => {
    shader.uniforms.courierRecolor = recolor; shader.uniforms.courierTint = tint;
    shader.fragmentShader = 'uniform float courierRecolor; uniform vec3 courierTint;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float blueMask = step(diffuseColor.r * 1.8, diffuseColor.b) * step(diffuseColor.g * 1.4, diffuseColor.b) * step(0.09, diffuseColor.b);
      diffuseColor.rgb = mix(diffuseColor.rgb, courierTint * max(diffuseColor.b, 0.15), blueMask * courierRecolor);`);
  };
  const geometry = new THREE.PlaneGeometry(2.14, 2.85);
  const sprite = new THREE.Mesh(geometry, material); sprite.name = 'ReferenceCourierSprite';
  sprite.position.y = 1.34; body.add(sprite);
  let frame = -1;
  // Align the head anchors of the approved sheet instead of letting artwork drift.
  const headX = [266, 224, 203.5, 180.5, 211.5, 220, 253.5, 185];
  function setFrame(next: number) {
    if (next === frame) return; frame = next;
    texture.offset.set((next % 4) / 4 + 2 / width, 1 - (Math.floor(next / 4) + 1) / 2 + 4 / height);
    texture.repeat.set(1 / 4 - 4 / width, 1 / 2 - 8 / height);
    sprite.scale.set(1, 1, 1); sprite.position.y = 1.34;
    sprite.position.x = (192 - headX[next]) / 384 * 2.14;
    const rect = (x: number, y: number, w: number, h: number) => {
      texture.repeat.set(w / width, h / height);
      texture.offset.set(x / width, 1 - (y + h) / height);
    };
    // The wide low slide occupies safe empty space beside its atlas cell.
    // Matching the plane aspect to the crop keeps the face round, not squashed.
    if (next === 6) {
      const unit = 0.0047;
      rect(720, 744, 464, 280);
      sprite.scale.set(464 * unit / 2.14, 280 * unit / 2.85, 1);
      sprite.position.set((952 - 895) * unit, 0.03 - 140 * unit + 264 * unit, 0);
    } else if (next === 5) {
      const unit = 2.14 / 384;
      rect(448, 508, 272, 500);
      sprite.scale.set(272 * unit / 2.14, 500 * unit / 2.85, 1);
      sprite.position.x = (584 - 604) * unit;
    } else if (next === 7) {
      const unit = 2.14 / 384;
      rect(1216, 516, 272, 504);
      sprite.scale.set(272 * unit / 2.14, 504 * unit / 2.85, 1);
      sprite.position.set((1352 - 1337) * unit, 0.03 - 252 * unit + 492 * unit, 0);
    }
    root.userData.spriteFrame = next;
  }
  setFrame(7);
  return {
    root, body, map: texture,
    animate(time: number, grounded: boolean, sliding: boolean, flying: boolean, running: boolean, camera: THREE.Camera, motion?: { phase:number; landing:number; anticipation:number; stumble:number; caught:boolean; delta:number }) {
      const isRun=running&&grounded&&!sliding&&!flying&&!motion?.caught;
      const nextMap=isRun&&runMap?runMap:texture;
      if(material.map!==nextMap){material.map=nextMap;material.needsUpdate=true;frame=-1;}
      setFrame(flying ? 5 : sliding ? 6 : !grounded ? 4 : isRun ? Math.floor(time * 8) % 4 : 7);
      if(isRun&&runMap){const phase=Math.floor((motion?.phase??time*1.65)*8)%8;runMap.repeat.set(.25-.004,.5-.008);runMap.offset.set((phase%4)/4+.002,1-(Math.floor(phase/4)+1)/2+.004);sprite.position.set(0,1.34,0);sprite.scale.set(1,1,1);root.userData.runFrame=phase;}
      if(motion){const damp=(a:number,b:number)=>THREE.MathUtils.damp(a,b,18,motion.delta);
        const stretch=motion.anticipation>0?.83:motion.landing>0?1-motion.landing*.5:!grounded&&!flying?1.05:1;
        body.scale.y=damp(body.scale.y,stretch);body.scale.x=damp(body.scale.x,2-stretch);
        body.rotation.z=damp(body.rotation.z,motion.caught?-.28:motion.stumble>0?Math.sin(time*30)*.16:0);
        body.position.y=damp(body.position.y,motion.anticipation>0?-.12:isRun?Math.sin(motion.phase*Math.PI*4)*.035:0);
      }
      body.rotation.y = Math.atan2(camera.position.x - root.position.x, camera.position.z - root.position.z);
    },
    setOutfit(color: string) { recolor.value = color.toLowerCase() === '#176bfa' ? 0 : 1; tint.value.set(color); },
    dispose() { geometry.dispose(); material.dispose(); texture.dispose(); runMap?.dispose(); },
  };
}
