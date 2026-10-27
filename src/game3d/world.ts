import * as THREE from 'three';
import { RUN, type Runner } from './simulation';

const PALETTE = ['#ef6c35', '#2ba6a0', '#6963ba'];
export function createRunnerWorld() {
  const root = new THREE.Group();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries: THREE.BufferGeometry[] = [];
  const boxes = new Map<string, THREE.BoxGeometry>();
  function mat(color: string, metalness = 0, roughness = 0.8) {
    const key = `${color}/${metalness}/${roughness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness }));
    return materials.get(key)!;
  }
  function box(parent: THREE.Object3D, size: [number, number, number], at: [number, number, number], color: string, material?: THREE.Material) {
    const key = size.join('/');
    let g = boxes.get(key);
    if (!g) { g = new THREE.BoxGeometry(...size); boxes.set(key, g); geometries.push(g); }
    const m = new THREE.Mesh(g, material || mat(color)); m.position.set(...at); parent.add(m); return m;
  }
  function cylinder(parent: THREE.Object3D, radius: number, length: number, at: [number, number, number], color: string) {
    const g = new THREE.CylinderGeometry(radius, radius, length, 10); geometries.push(g);
    const m = new THREE.Mesh(g, mat(color)); m.position.set(...at); parent.add(m); return m;
  }
  function sphere(parent: THREE.Object3D, radius: number, at: [number, number, number], color: string) {
    const g = new THREE.SphereGeometry(radius, 12, 10); geometries.push(g);
    const m = new THREE.Mesh(g, mat(color)); m.position.set(...at); parent.add(m); return m;
  }
  const skyGeometry = new THREE.SphereGeometry(190, 20, 12); geometries.push(skyGeometry);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { zenith: { value: new THREE.Color('#78b2cf') }, horizon: { value: new THREE.Color('#e0e2c9') } },
    vertexShader: 'varying float height; void main(){height=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 zenith;uniform vec3 horizon;varying float height;void main(){float blend=smoothstep(-5.0,85.0,height);gl_FragColor=vec4(mix(horizon,zenith,blend),1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>}',
  });
  // Shader chunks require their own lines in both native GL and browser WebGL.
  skyMaterial.fragmentShader = skyMaterial.fragmentShader.replace(';#include', ';\n#include');
  const sky = new THREE.Mesh(skyGeometry, skyMaterial); sky.renderOrder = -100; root.add(sky);
  const sunGeometry = new THREE.SphereGeometry(5.5, 12, 8); geometries.push(sunGeometry);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: '#fff2c7', fog: false });
  const sunDisk = new THREE.Mesh(sunGeometry, sunMaterial); sunDisk.position.set(-32, 45, -145); root.add(sunDisk);
  root.add(new THREE.HemisphereLight('#f5edce', '#637e83', 2.5));
  const sun = new THREE.DirectionalLight('#fff0d1', 3.2); sun.position.set(-16, 28, 15); root.add(sun);
  const fill = new THREE.DirectionalLight('#b4e6fb', 0.7); fill.position.set(16, 10, -20); root.add(fill);

  box(root, [70, 0.25, 250], [0, -0.25, -90], '#c8b594');
  box(root, [10, 0.1, 230], [0, -0.06, -90], '#726c5b');
  for (const lane of [-1, 0, 1]) {
    for (const side of [-1, 1]) box(root, [0.09, 0.14, 230], [lane * RUN.laneWidth + side * 0.72, 0.11, -90], '#b4bec2', mat('#b4bec2', 0.7, 0.35));
  }
  for (const side of [-1, 1]) {
    box(root, [1.4, 0.35, 230], [side * 5.35, 0.1, -90], '#ddd3b6');
    box(root, [0.16, 0.42, 230], [side * 4.65, 0.13, -90], '#ecb941');
  }
  const dummy = new THREE.Object3D();
  function instances(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    geometries.push(geometry);
    const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.frustumCulled = false; root.add(mesh); return mesh;
  }
  const ties = instances(new THREE.BoxGeometry(1.9, 0.10, 0.26), mat('#4a443e'), 3 * 125);
  for (let lane = 0; lane < 3; lane++) for (let i = 0; i < 125; i++) {
    dummy.position.set((lane - 1) * RUN.laneWidth, 0.01, 15 - i * 1.6); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); ties.setMatrixAt(lane * 125 + i, dummy.matrix);
  }
  const ballast = instances(new THREE.BoxGeometry(1, 1, 1), mat('#8a826b'), 800);
  for (let i = 0; i < 800; i++) {
    dummy.position.set(Math.sin(i * 28.12) * 4.1, 0.016, 14 - (i * 7.37 % 205));
    dummy.rotation.set(0, i * 1.23, 0); dummy.scale.set(0.05 + i % 3 * 0.018, 0.035, 0.07); dummy.updateMatrix(); ballast.setMatrixAt(i, dummy.matrix);
  }
  dummy.rotation.set(0, 0, 0);
  const scenery = new THREE.Group(); root.add(scenery);
  const buildingGeometry = new THREE.BoxGeometry(1, 1, 1); geometries.push(buildingGeometry);
  const buildings = new THREE.InstancedMesh(buildingGeometry, mat('#ffffff'), 56); buildings.frustumCulled = false; scenery.add(buildings);
  const roof = new THREE.InstancedMesh(buildingGeometry, mat('#bf7052'), 56); roof.frustumCulled = false; scenery.add(roof);
  const windowGeometry = new THREE.BoxGeometry(0.55, 0.8, 0.09); geometries.push(windowGeometry);
  const windows = new THREE.InstancedMesh(windowGeometry, mat('#314b5a', 0.2, 0.4), 56 * 8); windows.frustumCulled = false; scenery.add(windows);
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 1.0, 0.06), mat('#ecdfbf'), 56 * 8); geometries.push(frames.geometry); frames.frustumCulled = false; scenery.add(frames);
  const doors = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1.8, 0.9), mat('#425c60'), 56); geometries.push(doors.geometry); doors.frustumCulled = false; scenery.add(doors);
  const houseColors = ['#dca77e', '#c0d0c0', '#d8c9ab', '#88b5b2', '#d8aa87', '#e0d6be'];
  for (let i = 0; i < 56; i++) {
    const side = i % 2 ? 1 : -1, index = Math.floor(i / 2), h = [6, 9, 7, 11, 5, 8][index % 6], x = side * (10 + (index % 3) * 0.8), z = 15 - index * 10;
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(x, h / 2, z); dummy.scale.set(5.5, h, 8); dummy.updateMatrix(); buildings.setMatrixAt(i, dummy.matrix); buildings.setColorAt(i, new THREE.Color(houseColors[(index + (side > 0 ? 2 : 0)) % houseColors.length]));
    dummy.position.set(x, h + 0.16, z); dummy.scale.set(5.8, 0.32, 8.3); dummy.updateMatrix(); roof.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x - side * 2.78, 0.92, z + 2.5); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); doors.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 8; j++) {
      dummy.position.set(x - side * 2.8, 1.4 + (j % 4) * Math.min(2.3, (h - 1.8) / 4), z - 2.1 + Math.floor(j / 4) * 3.8);
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
  decor(new THREE.BoxGeometry(0.18, 6.3, 0.18), '#536b69', 16, i => [side(i) * 5.8, 3.15, depth(i)]);
  decor(new THREE.BoxGeometry(0.5, 0.25, 0.7), '#f3d5a1', 16, i => [side(i) * 5.8, 6.1, depth(i)]);
  decor(new THREE.CylinderGeometry(0.16, 0.16, 3.3, 8), '#866748', 16, i => [side(i) * 7.2, 1.65, depth(i) - 9]);
  decor(new THREE.SphereGeometry(1.3, 10, 8), '#527d57', 16, i => [side(i) * 7.2, 3.6, depth(i) - 9], true);
  decor(new THREE.BoxGeometry(11.8, 0.18, 0.22), '#657a71', 8, i => [0, 6.4, 10 - i * 27]);
  decor(new THREE.BoxGeometry(0.025, 0.025, 27), '#647672', 16, i => [side(i) * 1.8, 6.55, depth(i) - 13.5]);

  // Articulated original runner: hoodie, backpack, limbs and sneakers.
  const runner = new THREE.Group(); runner.name = 'Runner'; root.add(runner);
  const body = new THREE.Group(); runner.add(body);
  const hoodie = mat('#ef6c35');
  box(body, [0.62, 0.66, 0.36], [0, 1.15, 0], '', hoodie);
  box(body, [0.31, 0.46, 0.19], [0, 1.18, 0.25], '#1b6b72');
  box(body, [0.37, 0.08, 0.04], [0, 1.05, 0.36], '#dfb55c');
  for (const side of [-1, 1]) box(body, [0.055, 0.48, 0.04], [side * 0.21, 1.2, 0.19], '#123c47');
  cylinder(body, 0.10, 0.18, [0, 1.56, 0], '#bd805f');
  const head = sphere(body, 0.235, [0, 1.77, -0.015], '#c68e69'); head.scale.set(0.85, 1.1, 0.9);
  const hair = sphere(body, 0.24, [0, 1.87, 0.035], '#272b31'); hair.scale.set(0.92, 0.63, 0.94);
  box(body, [0.3, 0.09, 0.19], [0, 1.94, -0.10], '#272b31');
  const legs: THREE.Group[] = [], knees: THREE.Group[] = [], arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.16, 0.86, 0); body.add(leg); legs.push(leg);
    cylinder(leg, 0.115, 0.40, [0, -0.20, 0], '#28394b');
    const knee = new THREE.Group(); knee.position.y = -0.4; leg.add(knee); knees.push(knee);
    cylinder(knee, 0.09, 0.35, [0, -0.175, 0], '#233245');
    box(knee, [0.22, 0.15, 0.40], [0, -0.40, -0.08], '#e9e6d7');
    box(knee, [0.23, 0.045, 0.42], [0, -0.48, -0.08], '#ef6c35');
    const arm = new THREE.Group(); arm.position.set(side * 0.38, 1.42, 0); body.add(arm); arms.push(arm);
    cylinder(arm, 0.1, 0.35, [0, -0.17, 0], '#ef6c35');
    const forearm = cylinder(arm, 0.075, 0.31, [0, -0.39, -0.12], '#c68e69'); forearm.rotation.x = -0.8;
  }
  const shadowGeometry = new THREE.CircleGeometry(0.65, 18); geometries.push(shadowGeometry);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#1f2e32', transparent: true, opacity: 0.24, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.08; root.add(shadow);
  const shieldGeometry = new THREE.TorusGeometry(0.78, 0.028, 6, 30); geometries.push(shieldGeometry);
  const shieldMaterial = new THREE.MeshBasicMaterial({ color: '#55e8e2' });
  const shieldRing = new THREE.Mesh(shieldGeometry, shieldMaterial); shieldRing.position.y = 1; runner.add(shieldRing);

  const slots: THREE.Group[] = [];
  const paint = ['#247b9d', '#d26444', '#42938b'];
  const trainWindowGeometry = new THREE.BoxGeometry(0.045, 0.78, 1.25); geometries.push(trainWindowGeometry);
  for (let i = 0; i < 28; i++) {
    const slot = new THREE.Group(); root.add(slot); slots.push(slot);
    const train = new THREE.Group(); train.name = 'train'; slot.add(train);
    box(train, [2.35, 0.025, 9.6], [0, 0.025, 0], '#55594b');
    box(train, [2.13, 2.8, 9.4], [0, 1.66, 0], paint[0]);
    box(train, [2.19, 0.27, 9.5], [0, 0.54, 0], '#293c47');
    box(train, [2.17, 0.22, 9.55], [0, 3.15, 0], '#e7d9bd');
    box(train, [1.75, 0.88, 0.06], [0, 2.12, 4.73], '#203b4b', mat('#203b4b', 0.25, 0.35));
    box(train, [1.1, 0.09, 0.07], [0, 0.99, 4.76], '#f5d994');
    const trainWindows = new THREE.InstancedMesh(trainWindowGeometry, mat('#203d4d'), 8); trainWindows.frustumCulled = false; train.add(trainWindows);
    for (let w = 0; w < 8; w++) {
      dummy.position.set((w < 4 ? -1 : 1) * 1.08, 2.16, -3.3 + (w % 4) * 2.1); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); trainWindows.setMatrixAt(w, dummy.matrix);
    }
    for (const side of [-1, 1]) {
      box(train, [0.21, 0.38, 6.9], [side * 0.78, 0.23, 0], '#243038');
    }
    const barrier = new THREE.Group(); barrier.name = 'barrier'; slot.add(barrier);
    for (const side of [-1, 1]) box(barrier, [0.16, 1.0, 0.22], [side * 0.91, 0.5, 0], '#d5d7c9');
    box(barrier, [2.15, 0.65, 0.42], [0, 0.68, 0], '#f3b938');
    for (const x of [-0.7, 0, 0.7]) { const stripe = box(barrier, [0.21, 0.64, 0.015], [x, 0.68, 0.22], '#493c30'); stripe.rotation.z = -0.35; }
    const arch = new THREE.Group(); arch.name = 'arch'; slot.add(arch);
    for (const side of [-1, 1]) box(arch, [0.18, 2.4, 0.24], [side * 1.0, 1.2, 0], '#576c69');
    box(arch, [2.22, 1.05, 0.62], [0, 1.85, 0], '#d85d42');
    box(arch, [1.7, 0.10, 0.025], [0, 1.4, 0.33], '#f8d9b1');
    slot.visible = false;
  }
  const coinGeometry = new THREE.CylinderGeometry(0.26, 0.26, 0.09, 12); coinGeometry.rotateX(Math.PI / 2);
  const coins = instances(coinGeometry, mat('#f9c84e', 0.65, 0.3), 100); coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pickups = instances(new THREE.OctahedronGeometry(0.45), mat('#41cfc9', 0.4, 0.25), 10); pickups.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  coins.count = 0; pickups.count = 0;
  let lastX = 0;
  return {
    root,
    configure(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
      scene.background = new THREE.Color('#9bc3cc'); scene.fog = new THREE.Fog('#d4dfcc', 42, 155);
      camera.fov = 65; camera.near = 0.1; camera.far = 220; camera.position.set(0, 5.2, 10.5); camera.lookAt(0, 1.1, -13); camera.updateProjectionMatrix();
    },
    setOutfit(index: number) { hoodie.color.set(PALETTE[index % PALETTE.length]); },
    update(s: Runner, delta: number, camera: THREE.PerspectiveCamera, preview = false) {
      const t = s.distance, stride = preview ? t * 2 : s.elapsed * (11.5 + s.speed * 0.18), grounded = s.jumpY < 0.02, sliding = s.slideTime > 0;
      ties.position.z = t % 1.6; ballast.position.z = t % 1.6; scenery.position.z = t % 60; structures.position.z = t % 27;
      runner.position.set(s.x, s.jumpY + (grounded && !sliding ? Math.abs(Math.sin(stride)) * 0.045 : 0), 0);
      runner.scale.y = sliding ? 0.44 : 1;
      runner.rotation.z = THREE.MathUtils.damp(runner.rotation.z, -(s.x - lastX) * 1.8, 10, delta); lastX = s.x;
      body.rotation.x = sliding ? -0.24 : -0.04;
      for (let i = 0; i < 2; i++) {
        const phase = Math.sin(stride + i * Math.PI);
        legs[i].rotation.x = sliding ? (i ? 1.0 : -0.65) : grounded ? phase * 0.78 : (i ? -0.5 : 0.7);
        knees[i].rotation.x = grounded ? Math.max(0, -phase) * 0.9 : 0.55;
        arms[i].rotation.x = sliding ? 0.9 : grounded ? -phase * 0.72 : -0.9;
      }
      shadow.position.x = s.x; shadow.scale.setScalar(Math.max(0.4, 1 - s.jumpY * 0.18)); shadowMaterial.opacity = 0.24 - s.jumpY * 0.045;
      shieldRing.visible = s.shield || s.grace > 0; shieldRing.rotation.y += delta * 1.6;
      runner.visible = s.grace <= 0 || Math.floor(s.elapsed * 12) % 2 === 0;
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
          for (const variant of slot.children) variant.visible = variant.name === e.kind;
        }
      }
      for (let i = obstacleCount; i < slots.length; i++) slots[i].visible = false;
      coins.count = coinCount; coins.instanceMatrix.needsUpdate = true; pickups.count = pickupCount; pickups.instanceMatrix.needsUpdate = true;
      const targetX = preview ? 0.6 : s.x * 0.24;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, (preview ? 4.4 : 5.2) + s.jumpY * 0.13, 5, delta);
      camera.lookAt(s.x * 0.16, 1.0 + s.jumpY * 0.12, -13);
    },
    dispose() {
      root.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      const disposed = new Set<THREE.BufferGeometry>();
      for (const geometry of geometries) if (!disposed.has(geometry)) { geometry.dispose(); disposed.add(geometry); }
      for (const material of materials.values()) material.dispose(); shadowMaterial.dispose(); shieldMaterial.dispose(); skyMaterial.dispose(); sunMaterial.dispose();
      // The React primitive owns scene attachment; disposed buffers can be recreated during Strict Mode.
    },
  };
}
export type RunnerWorld = ReturnType<typeof createRunnerWorld>;
