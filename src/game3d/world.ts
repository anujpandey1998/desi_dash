import * as THREE from 'three';
import { RUN, DRONE, airCoinPosition, type Runner } from './simulation';
import { createChaseEffects } from './chaseEffects';
import { createSurfaceLibrary, type Surface } from './surfaces';
import { createCityDetails } from './cityDetails';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const PALETTE = ['#176BFA', '#2ba6a0', '#6963ba', '#e8ae35', '#cf668b'];
import type {CharacterId} from './profile';
import { createReferenceCourier } from './referenceCourier';
import {createRooftopObstacles} from './rooftopObstacles';
import { createCycleModel } from './cycleModel';
import { createTerraceRoute } from './terraceRoute';
import { createDroneModel } from './droneModel';

export function createRunnerWorld(courierTexture:THREE.Texture,chaserTexture:THREE.Texture,character:CharacterId='boy') {
  const root = new THREE.Group();
  const surfaces = createSurfaceLibrary();
  const city = createCityDetails(); root.add(city.root);
  const route = createTerraceRoute(); root.add(route.root);
  const drone = createDroneModel(); root.add(drone.root);
  const effects=createChaseEffects(chaserTexture);root.add(effects.root);
  const cycle=createCycleModel();root.add(cycle.root);
  let renderer: THREE.WebGLRenderer | undefined;
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries: THREE.BufferGeometry[] = [];
  const cylinders = new Map<string, THREE.CylinderGeometry>();
  const boxes = new Map<string, THREE.BoxGeometry>();
  function mat(color: string, metalness = 0, roughness = 0.8, surface?: Surface) {
    const key = `${color}/${metalness}/${roughness}/${surface}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness, map: surface ? surfaces.get(surface) : null }));
    return materials.get(key)!;
  }
  function box(parent: THREE.Object3D, size: [number, number, number], at: [number, number, number], color: string, material?: THREE.Material) {
    const key = size.join('/');
    let g = boxes.get(key);
    if (!g) {
      g = new THREE.BoxGeometry(...size);
      // World-sized UVs prevent a 250 m roof stretching a single texture pixel.
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const face = Math.floor(i / 4);
        uv.setXY(i, uv.getX(i) * (face < 2 ? size[2] : size[0]), uv.getY(i) * (face === 2 || face === 3 ? size[2] : size[1]));
      }
      boxes.set(key, g); geometries.push(g);
    }
    const m = new THREE.Mesh(g, material || mat(color)); m.position.set(...at); parent.add(m); return m;
  }
  function cylinder(parent: THREE.Object3D, radius: number, length: number, at: [number, number, number], color: string, material?: THREE.Material) {
    const key = radius + '/' + length;
    let g = cylinders.get(key);
    if (!g) { g = new THREE.CylinderGeometry(radius, radius, length, 16); cylinders.set(key, g); geometries.push(g); }
    const m = new THREE.Mesh(g, material || mat(color)); m.position.set(...at); parent.add(m); return m;
  }
  function sphere(parent: THREE.Object3D, radius: number, at: [number, number, number], color: string) {
    const g = new THREE.SphereGeometry(radius, 12, 10); geometries.push(g);
    const m = new THREE.Mesh(g, mat(color)); m.position.set(...at); parent.add(m); return m;
  }
  const capsuleGeometry = new THREE.CapsuleGeometry(1, 1, 4, 8); geometries.push(capsuleGeometry);
  function rounded(parent: THREE.Object3D, size: [number, number, number], at: [number, number, number], material: THREE.Material) {
    const mesh = new THREE.Mesh(capsuleGeometry, material); mesh.scale.set(size[0] / 2, size[1] / 3, size[2] / 2); mesh.position.set(...at); parent.add(mesh); return mesh;
  }
  function batchModel(group: THREE.Group) {
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const child of group.children) if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      child.updateMatrix();
      const g = child.geometry.clone().applyMatrix4(child.matrix);
      const list = batches.get(child.material) || []; list.push(g); batches.set(child.material, list);
    }
    group.clear();
    for (const [material, parts] of batches) {
      const geometry = mergeGeometries(parts, false)!; geometries.push(geometry);
      parts.forEach(part => part.dispose()); const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
    }
  }
  const skyGeometry = new THREE.SphereGeometry(190, 20, 12); geometries.push(skyGeometry);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, precision: 'highp',
    uniforms: { zenith: { value: new THREE.Color('#3269B4') }, horizon: { value: new THREE.Color('#F8BB8E') } },
    vertexShader: 'varying float height; varying vec3 skyPosition; void main(){height=position.y;skyPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `
      uniform vec3 zenith; uniform vec3 horizon; varying float height; varying vec3 skyPosition;
      float hash(vec2 p) { vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
      float noise(vec2 p) { vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
      void main(){
        float blend=smoothstep(-5.0,85.0,height); vec3 color=mix(horizon,zenith,blend);
        vec3 direction=normalize(skyPosition); vec2 p=direction.xz/max(0.12,direction.y)*2.4;
        float cloud=noise(p)*0.6+noise(p*2.1)*0.27+noise(p*4.3)*0.13;
        cloud=smoothstep(0.51,0.73,cloud)*smoothstep(0.06,0.3,direction.y);
        color=mix(color,vec3(0.95,0.87,0.76),cloud*0.62);
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  // Shader chunks require their own lines in both native GL and browser WebGL.
  skyMaterial.fragmentShader = skyMaterial.fragmentShader.replace(';#include', ';\n#include');
  const sky = new THREE.Mesh(skyGeometry, skyMaterial); sky.renderOrder = -100; root.add(sky);
  const sunGeometry = new THREE.SphereGeometry(5.5, 12, 8); geometries.push(sunGeometry);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: '#fff2c7', fog: false });
  const sunDisk = new THREE.Mesh(sunGeometry, sunMaterial); sunDisk.position.set(-48, 25, -145); root.add(sunDisk);
  root.add(new THREE.HemisphereLight('#E9D9C4', '#56606D', 1.3));
  const sun = new THREE.DirectionalLight('#FFD3A0', 2.8); sun.position.set(-24, 18, -35); root.add(sun);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18; sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 100; sun.shadow.bias = -0.0007; sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 0, -16); root.add(sun.target);
  const fill = new THREE.DirectionalLight('#D7EAFF', 1.4); fill.position.set(16, 10, 20); root.add(fill);

  const concrete = mat('#D5C8AC',0,.95,'concrete');
  const plaster = mat('#E1CEB4',0,.95,'plaster');
  const brick = mat('#AB6A4E',0,.94,'brick');
  const dummy = new THREE.Object3D();
  function instances(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    geometries.push(geometry);const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;root.add(mesh);return mesh;
  }
  const tiles = new THREE.Group();
  const scenery = new THREE.Group(); root.add(scenery);
  const facadeShape=new THREE.Shape();facadeShape.moveTo(-.46,-.5);facadeShape.lineTo(.46,-.5);facadeShape.quadraticCurveTo(.5,-.5,.5,-.46);facadeShape.lineTo(.5,.46);facadeShape.quadraticCurveTo(.5,.5,.46,.5);facadeShape.lineTo(-.46,.5);facadeShape.quadraticCurveTo(-.5,.5,-.5,.46);facadeShape.lineTo(-.5,-.46);facadeShape.quadraticCurveTo(-.5,-.5,-.46,-.5);
  const buildingGeometry = new THREE.ExtrudeGeometry(facadeShape,{depth:.94,bevelEnabled:true,bevelSize:.025,bevelThickness:.03,bevelSegments:1,steps:1,curveSegments:2});buildingGeometry.translate(0,0,-.47); geometries.push(buildingGeometry);
  const buildings = new THREE.InstancedMesh(buildingGeometry, mat('#ffffff', 0, 0.95, 'plaster'), 56); buildings.frustumCulled = false; scenery.add(buildings);
  const roof = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), mat('#B78062'), 56); geometries.push(roof.geometry); roof.frustumCulled = false; scenery.add(roof);
  const windowGeometry = new THREE.BoxGeometry(0.55, 0.8, 0.09); geometries.push(windowGeometry);
  const windows = new THREE.InstancedMesh(windowGeometry, mat('#314b5a', 0.2, 0.4), 56 * 8); windows.frustumCulled = false; scenery.add(windows);
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 1.0, 0.06), mat('#ecdfbf'), 56 * 8); geometries.push(frames.geometry); frames.frustumCulled = false; scenery.add(frames);
  const doors = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1.8, 0.9), mat('#425c60'), 56); geometries.push(doors.geometry); doors.frustumCulled = false; scenery.add(doors);
  const houseColors = ['#E6C6A0','#A5CEC4','#EDDBBC','#94B8CE','#DDB6A0','#E5D4BC'];
  for (let i = 0; i < 56; i++) {
    const side = i % 2 ? 1 : -1, index = Math.floor(i / 2), h = [6, 9, 7, 11, 5, 8][index % 6], x = side * (10 + (index % 3) * 0.8), z = 15 - index * 10;
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(x, h / 2 - 6, z); dummy.scale.set(5.5, h, 8); dummy.updateMatrix(); buildings.setMatrixAt(i, dummy.matrix); buildings.setColorAt(i, new THREE.Color(houseColors[(index + (side > 0 ? 2 : 0)) % houseColors.length]));
    dummy.position.set(x, h - 6 + 0.16, z); dummy.scale.set(5.8, 0.32, 8.3); dummy.updateMatrix(); roof.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x - side * 2.78, -5.08, z + 2.5); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); doors.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 8; j++) {
      dummy.position.set(x - side * 2.8, -4.6 + (j % 4) * Math.min(2.3, (h - 1.8) / 4), z - 2.1 + Math.floor(j / 4) * 3.8);
      dummy.rotation.set(0, Math.PI / 2, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); windows.setMatrixAt(i * 8 + j, dummy.matrix); dummy.position.x += side * 0.04; dummy.updateMatrix(); frames.setMatrixAt(i * 8 + j, dummy.matrix);
    }
  }
  dummy.rotation.set(0, 0, 0);
  const structures = new THREE.Group(); root.add(structures);
  const decor = (geometry: THREE.BufferGeometry, color: string, count: number, position: (i: number) => [number, number, number], leaf = false) => {
    const mesh = instances(geometry, mat(color), count); structures.add(mesh);
    for (let i = 0; i < count; i++) {
      dummy.position.set(...position(i)); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, leaf ? 0.75 : 1, 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
  };
  const side = (i: number) => i % 2 ? 1 : -1;
  const depth = (i: number) => 10 - Math.floor(i / 2) * 27;
  decor(new THREE.CylinderGeometry(0.7, 0.7, 1.5, 10), '#3a5360', 16, i => [side(i) * 6, 0.75, depth(i)]);
  decor(new THREE.BoxGeometry(1.8, 0.12, 2.5), '#234f70', 16, i => [side(i) * 6.5, 0.4, depth(i) - 8]);
  decor(new THREE.BoxGeometry(0.12, 4.6, 0.12), '#8F806B', 16, i => [side(i) * 5.8, 2.3, depth(i) - 14]);
  decor(new THREE.BoxGeometry(0.025, 0.025, 7), '#786959', 16, i => [side(i)*6, 4.5, depth(i)-14]);
  decor(new THREE.BoxGeometry(0.8, 0.65, 0.025), '#BD957C', 24, i => [side(i)*6, 4.15, 10-Math.floor(i/6)*27-14-i%3*1.3]);

  const courier=createReferenceCourier(courierTexture,character);
  const runner=courier.root;
  root.add(runner);
  const shadowGeometry = new THREE.CircleGeometry(0.65, 18); geometries.push(shadowGeometry);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#1f2e32', transparent: true, opacity: 0.24, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.08; root.add(shadow);
  const shieldGeometry = new THREE.TorusGeometry(0.78, 0.028, 6, 30); geometries.push(shieldGeometry);
  const shieldMaterial = new THREE.MeshBasicMaterial({ color: '#55e8e2' });
  const shieldRing = new THREE.Mesh(shieldGeometry, shieldMaterial); shieldRing.position.y = 1; runner.add(shieldRing);

  const ghostCourier = createReferenceCourier(courierTexture,character);
  const ghostRunner = ghostCourier.root; ghostRunner.name = 'GhostCourier';

  const ghostMaterial = new THREE.MeshBasicMaterial({ color: '#6affef', map:ghostCourier.map, transparent: true, alphaTest: .12, opacity: 0.35, depthWrite: false });
  ghostRunner.traverse(object => { if (object instanceof THREE.Mesh) { object.material = ghostMaterial; object.castShadow = false; object.receiveShadow = false; } });
  ghostRunner.visible = false; root.add(ghostRunner);
  const roofObjects=createRooftopObstacles();
  const slots: THREE.Group[] = [];
  for (let i = 0; i < 28; i++) {
    const slot = new THREE.Group(); root.add(slot); slots.push(slot);
    const tank = new THREE.Group(); tank.name = 'tank'; slot.add(tank);
    box(tank, [2.2, 0.22, 9.6], [0, 0.11, 0], '#b59075');
    for (const z of [-3.2, 0, 3.2]) {
      cylinder(tank, 0.98, 2.6, [0, 1.52, z], '', mat('#2B414C', 0.18, 0.42, 'tank'));
      cylinder(tank, 1.02, 0.12, [0, 2.84, z], '#253d49');
      cylinder(tank, 0.24, 0.15, [0, 2.96, z], '#182f39');
      for (const y of [0.5, 1.2, 1.9, 2.6]) cylinder(tank, 1.005, 0.055, [0, y, z], '#4B5655');
      box(tank, [0.36, 0.2, 0.025], [0, 1.8, z + 0.98], '#D3C9A8');
    }
    const barrier = new THREE.Group(); barrier.name = 'barrier'; slot.add(barrier);
    for (const side of [-1, 1]) box(barrier, [0.16, 1.0, 0.22], [side * 0.91, 0.5, 0], '#d5d7c9');
    box(barrier, [2.15, 0.65, 0.42], [0, 0.68, 0], '#f3b938');
    for (const x of [-0.7, 0, 0.7]) { const stripe = box(barrier, [0.21, 0.64, 0.015], [x, 0.68, 0.22], '#493c30'); stripe.rotation.z = -0.35; }
    for (const side of [-1, 1]) {
      box(barrier, [0.35, 0.09, 0.8], [side * 0.91, 0.05, 0], '#515A58');
      sphere(barrier, 0.045, [side * 0.91, 0.78, 0.235], '#E3E0D2');
    }
    const arch = new THREE.Group(); arch.name = 'arch'; slot.add(arch);
    for (const side of [-1, 1]) box(arch, [0.18, 2.4, 0.24], [side * 1.0, 1.2, 0], '#576c69');
    box(arch,[2.22,.10,.20],[0,2.4,0],'#536D73');
    for(const side of [-1,1])box(arch,[.95,.98,.07],[side*.51,1.82,0],side>0?'#418AB6':'#E8B67C',mat(side>0?'#418AB6':'#E8B67C',0,.95,'fabric'));

    box(arch, [1.7, 0.10, 0.025], [0, 1.32, 0.06], '#F6D45C');
    for (const side of [-1, 1]) box(arch, [0.28, 0.20, 0.035], [side * 0.86, 1.55, 0.335], '#CF783A');
    batchModel(tank); batchModel(barrier); batchModel(arch);
    for(const key of ['tank-0','tank-1','tank-2','tank-3','barrier-0','barrier-1','barrier-2','arch-0'])slot.add(roofObjects.clone(key));
    slot.visible = false;
  }
  const coinGeometry = new THREE.CylinderGeometry(0.26, 0.26, 0.09, 12); coinGeometry.rotateX(Math.PI / 2);
  const coins = instances(coinGeometry, mat('#f9c84e', 0.65, 0.3), 100); coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pickups = instances(new THREE.OctahedronGeometry(0.45), mat('#41cfc9', 0.4, 0.25), 10); pickups.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const airCoins=instances(new THREE.CylinderGeometry(.24,.24,.07,10).rotateX(Math.PI/2),mat('#FFD45A',.5,.24),35);airCoins.count=0;
  coins.count = 0; pickups.count = 0;
  let lastX = 0;
  const fog = new THREE.Fog('#D8BCA0', 48, 165);
  return {
    root,
    configure(scene: THREE.Scene, camera: THREE.PerspectiveCamera, gl?: THREE.WebGLRenderer) {
      renderer = gl;
      if (renderer) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
      scene.background = new THREE.Color('#9bc3cc'); scene.fog = fog;
      camera.fov = 65; camera.near = 0.1; camera.far = 220; camera.position.set(0, 4.3, 11); camera.lookAt(0, 1.15, -15); camera.updateProjectionMatrix();
    },
    setQuality(low: boolean) { windows.count = frames.count = low ? 224 : 448; buildings.count = roof.count = doors.count = low ? 28 : 56; fog.far = low ? 100 : 165; city.setQuality(low); sun.castShadow = !low; if (renderer) renderer.shadowMap.enabled = !low; },
    setOutfit(index: number) { courier.setOutfit(PALETTE[index % PALETTE.length]); },
    update(s: Runner, delta: number, camera: THREE.PerspectiveCamera, preview = false, ghost?: Runner) {
      const flying=s.droneTime>0, lifted=flying||(s.bikeTime>0&&s.jumpY>.1);
      const t = s.distance, stride = preview ? t * 2 : s.elapsed * (11.5 + s.speed * 0.18), grounded = s.jumpY < 0.02, sliding = !flying && s.slideTime > 0;
      route.update(t);
      tiles.position.z = t % 1.6; scenery.position.z = t % 60; structures.position.z = t % 27;
      // The route is a stationary mesh; scroll its surface at the actual run speed.
      if (concrete.map) concrete.map.offset.y = t % 128;
      if (brick.map) brick.map.offset.x = t % 128;
      city.root.position.z = scenery.position.z;
      runner.position.set(s.x, s.jumpY + (grounded && !sliding && s.bikeTime <= 0 ? Math.abs(Math.sin(stride)) * 0.045 : 0), 0);
      runner.scale.y = 1;
      runner.rotation.z = THREE.MathUtils.damp(runner.rotation.z, -(s.x - lastX) * 1.8, 10, delta); lastX = s.x;
      courier.animate(s,delta,camera);
      runner.rotation.y=0;
      cycle.update(s,camera,runner.rotation.z);
      drone.root.visible=flying||s.droneApproach>0;
      drone.root.position.set(s.x,s.droneApproach>0?2.7+s.droneApproach*4:s.jumpY+2.7,s.droneApproach>0?-s.droneApproach*2:0);drone.update(s.elapsed,runner.rotation.z+(s.droneHitGrace>0?Math.sin(s.elapsed*45)*.3:0));
      if(s.droneCrashed&&flying)drone.root.rotation.z=Math.sin(s.elapsed*24)*.3+.35;
      // The approved artwork is the character in EVERY mode; never swap to a generic mesh.
      courier.body.visible=true;
      if(flying){
        const gripHeight=(runner.userData.visualHeight||2.8)-.1;
        drone.root.position.y=s.jumpY+gripHeight+.76;
        drone.setGripWidth(character==='girl'?.44:.5);
      }
      effects.update(s,delta,camera);
      shadow.position.x = s.x; shadow.scale.setScalar(Math.max(0.45, 1 - s.jumpY * 0.08)); shadowMaterial.opacity = Math.max(.06,.24 - s.jumpY * .03);
      shieldRing.visible = s.shield || s.grace > 0; shieldRing.rotation.y += delta * 1.6;
      runner.visible = s.bikeTime > 0 || s.grace <= 0 || Math.floor(s.elapsed * 12) % 2 === 0;
      ghostRunner.visible = !!ghost && ghost.status !== 'gameover';
      if (ghost && ghostRunner.visible) {
        ghostRunner.position.set(ghost.x, ghost.jumpY, 0);
        ghostRunner.scale.y = 1;
        ghostCourier.animate(ghost,delta,camera);ghostRunner.rotation.y=0;
      }
      airCoins.count=flying?35:0;
      if(flying){for(let i=0;i<35;i++){const p=airCoinPosition(Math.floor(s.droneDistance/DRONE.coinSpacing)+i+1);dummy.position.set(p.x,p.y,-(i+1)*DRONE.coinSpacing+s.droneDistance%DRONE.coinSpacing);dummy.rotation.set(0,s.elapsed*2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();airCoins.setMatrixAt(i,dummy.matrix);}airCoins.instanceMatrix.needsUpdate=true;}
      let obstacleCount = 0, coinCount = 0, pickupCount = 0;
      for (const e of s.entities) {
        if (!e.active || e.z < -RUN.drawDistance || e.z > 15) continue;
        if (e.kind === 'coin' || e.kind === 'shield') {
          dummy.position.set(e.lane * RUN.laneWidth, e.y + Math.sin(s.elapsed * 3 + e.z) * 0.06, e.z);
          dummy.scale.set(1, 1, 1); dummy.rotation.set(0, s.elapsed * 2.8 + e.z * 0.08, 0); dummy.updateMatrix();
          if (e.kind === 'coin') coins.setMatrixAt(coinCount++, dummy.matrix);
          else if (pickupCount < 10) pickups.setMatrixAt(pickupCount++, dummy.matrix);
        } else if (obstacleCount < slots.length) {
          const slot = slots[obstacleCount++]; slot.visible = true; slot.position.set(e.lane * RUN.laneWidth, 0, e.z);
          for (const variant of slot.children) variant.visible = variant.name === (s.limit>0?e.kind:e.kind+'-'+(e.kind==='arch'?0:e.variant%(e.kind==='tank'?4:3)));
        }
      }
      for (let i = obstacleCount; i < slots.length; i++) slots[i].visible = false;
      coins.count = coinCount; coins.instanceMatrix.needsUpdate = true; pickups.count = pickupCount; pickups.instanceMatrix.needsUpdate = true;
      const targetX = preview ? 0.6 : s.x * 0.65;
      // Keep both outer lanes and the courier's arms in frame on narrow phones.
      camera.position.z = THREE.MathUtils.damp(camera.position.z,Math.max(8.8, 3.9 / camera.aspect)+(flying?8:0),5,delta);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 14, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, (preview ? 3.8 : 4.0) + s.jumpY * (lifted ? .82 : .13), 5, delta);
      camera.lookAt(s.x * .55, 1.3 + s.jumpY * (lifted ? .85 : .12), -15);
      const shake=s.landingTime*.07+s.droneHitGrace*.06+s.stumbleTime*.04;
      camera.position.x+=Math.sin(s.elapsed*67)*shake;camera.position.y+=Math.cos(s.elapsed*59)*shake;
    },
    dispose() {
      root.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      const disposed = new Set<THREE.BufferGeometry>();
      for (const geometry of geometries) if (!disposed.has(geometry)) { geometry.dispose(); disposed.add(geometry); }
      for (const material of materials.values()) material.dispose(); surfaces.dispose(); city.dispose(); route.dispose(); courier.dispose(); ghostCourier.dispose(); drone.dispose(); effects.dispose(); cycle.dispose(); roofObjects.dispose(); sun.shadow.map?.dispose(); shadowMaterial.dispose(); ghostMaterial.dispose(); shieldMaterial.dispose(); skyMaterial.dispose(); sunMaterial.dispose();
      // The React primitive owns scene attachment; disposed buffers can be recreated during Strict Mode.
    },
  };
}
export type RunnerWorld = ReturnType<typeof createRunnerWorld>;
