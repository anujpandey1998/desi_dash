import * as THREE from 'three';

/** Non-colliding scenery, batched by material for mobile GPUs. */
export function createCityDetails() {
  const root = new THREE.Group(); root.name = 'CityDetails';
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const dummy = new THREE.Object3D();
  function batch(geometry: THREE.BufferGeometry, color: string, count: number, place: (i: number, object: THREE.Object3D) => void, metalness = 0) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.6 : 0.94, metalness });
    geometries.push(geometry); materials.push(material);
    const mesh = new THREE.InstancedMesh(geometry, material, count); root.add(mesh);
    for (let i = 0; i < count; i++) { dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); place(i, dummy); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
    return mesh;
  }
  const location = (i: number) => {
    const side = i % 2 ? 1 : -1, index = Math.floor(i / 2), h = [6, 9, 7, 11, 5, 8][index % 6];
    return { side, x: side * (10 + index % 3 * 0.8), y: h - 6, z: 15 - index * 10 };
  };
  const box = () => new THREE.BoxGeometry(1, 1, 1);
  batch(box(), '#BFAE95', 56, (i, o) => { const p = location(i); o.position.set(p.x, p.y + 0.65, p.z - 1.8); o.scale.set(2.1, 1.4, 2.5); });
  batch(box(), '#746D61', 56, (i, o) => { const p = location(i); o.position.set(p.x, p.y + 1.4, p.z - 1.8); o.scale.set(2.3, 0.16, 2.7); });
  batch(box(), '#40504D', 28, (i, o) => { const p = location(i * 2 + i % 2); o.position.set(p.x, p.y + 0.85, p.z + 2); o.scale.set(1.25, 1.5, 1.25); });
  batch(new THREE.CylinderGeometry(0.56, 0.56, 1.4, 12), '#343E42', 28, (i, o) => { const p = location(i * 2); o.position.set(p.x + 1.7, p.y + 0.9, p.z + 1.7); });
  // Balcony slabs, rails and wall-mounted air conditioning on the inward facades.
  batch(box(), '#C8BCAB', 56, (i, o) => { const p = location(i); o.position.set(p.x - p.side * 3.12, p.y - 2.2, p.z + 1.8); o.scale.set(1.0, 0.16, 2.3); });
  batch(box(), '#4C5858', 56, (i, o) => { const p = location(i); o.position.set(p.x - p.side * 3.58, p.y - 1.72, p.z + 1.8); o.scale.set(0.045, 0.045, 2.3); }, 0.4);
  batch(box(), '#596364', 168, (i, o) => { const p = location(Math.floor(i / 3)); o.position.set(p.x - p.side * 3.58, p.y - 1.95, p.z + 0.76 + i % 3 * 1.04); o.scale.set(0.045, 0.48, 0.045); }, 0.4);
  batch(box(), '#B7B6AA', 56, (i, o) => { const p = location(i); o.position.set(p.x - p.side * 2.95, p.y - 1.1, p.z - 1.2); o.scale.set(0.45, 0.62, 0.85); });
  batch(new THREE.CylinderGeometry(0.22, 0.22, 0.025, 12), '#566467', 56, (i, o) => { const p = location(i); o.position.set(p.x - p.side * 3.19, p.y - 1.1, p.z - 1.2); o.rotation.z = Math.PI / 2; }, 0.3);
  batch(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), '#7B817C', 56, (i, o) => { const p = location(i); o.position.set(p.x - p.side * 2.83, p.y / 2 - 3, p.z - 3.3); o.scale.y = p.y + 6; }, 0.3);
  batch(box(), '#AFA28C', 112, (i, o) => { const p = location(Math.floor(i / 2)); o.position.set(p.x - p.side * 2.82, p.y - 2.4 - i % 2 * 2.1, p.z); o.scale.set(0.16, 0.12, 7.8); });
  // Parapets and inset stairwell doors make the roof silhouettes read as homes.
  batch(box(), '#C3B6A1', 112, (i, o) => { const p = location(Math.floor(i / 2)); o.position.set(p.x + (i % 2 ? 2.65 : -2.65), p.y + 0.45, p.z); o.scale.set(0.18, 0.65, 7.8); });
  batch(box(), '#506163', 56, (i, o) => { const p = location(i); o.position.set(p.x, p.y + 0.55, p.z - 0.53); o.scale.set(0.65, 1.1, 0.045); });
  batch(box(), '#535D58', 56, (i, o) => { const p = location(i); o.position.set(p.x + 1.5, p.y + 0.85, p.z - 2.2); o.scale.set(0.045, 1.5, 0.045); }, 0.3);
  batch(new THREE.SphereGeometry(0.36, 10, 6), '#B9B6AA', 56, (i, o) => { const p = location(i); o.position.set(p.x + 1.5, p.y + 1.5, p.z - 2.2); o.scale.set(1, 0.22, 1); o.rotation.z = 0.5; }, 0.2);
  // A second layer gives the neighborhood actual depth, beyond the roof corridor.
  batch(box(), '#939C9F', 64, (i, o) => {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), h = 8 + row * 7 % 18;
    o.position.set(side * (23 + row % 4 * 7), h / 2 - 10, 18 - row * 9); o.scale.set(5 + row % 3 * 2, h, 7);
  });
  return {
    root,
    setQuality(low: boolean) { root.visible = !low; },
    dispose() { root.traverse(o => { if (o instanceof THREE.InstancedMesh) o.dispose(); }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
