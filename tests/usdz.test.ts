import * as THREE from 'three';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js';
import { describe, expect, it } from 'vitest';
import { exportUsdz, toStandard } from '../src/index.js';

function scene() {
  const s = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshPhongMaterial({ name: 'Paint', color: 0x00ff00, shininess: 30 }));
  box.position.set(0, 0.1, 0);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshStandardMaterial({ name: 'Metal', metalness: 1, roughness: 0.2 }));
  ball.position.x = 0.5;
  s.add(box, ball);
  return s;
}

describe('USDZ', () => {
  it('writes a package with every mesh, its materials made physically based', async () => {
    const r = await exportUsdz(scene(), { name: 'toy' });
    expect(r.file.name).toBe('toy.usdz');
    expect(r.stats).toEqual({ meshes: 2, materials: 2, textures: 0 });
    const files = unzipSync(r.file.data);
    const usda = new TextDecoder().decode(files[Object.keys(files).find((n) => n.endsWith('.usda'))!]);
    expect(usda).toContain('UsdPreviewSurface');
    expect(usda).toContain('preliminary:anchoring:type = "plane"');
    expect(r.warnings.filter((w) => /MeshStandardMaterial/.test(w))).toEqual([]);
  });

  it('is read back by three.js in place', async () => {
    const r = await exportUsdz(scene());
    const group = new USDLoader().parse(r.file.data.buffer.slice(r.file.data.byteOffset, r.file.data.byteOffset + r.file.data.byteLength) as ArrayBuffer);
    let count = 0;
    group.traverse((o) => { if ((o as THREE.Mesh).isMesh) count++; });
    expect(count).toBe(2);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    expect(box.max.x).toBeCloseTo(0.6, 2);
    expect(box.min.y).toBeCloseTo(-0.1, 2);
  });

  it('converts Phong and basic materials, and leaves out textures it cannot read here', async () => {
    const phong = toStandard(new THREE.MeshPhongMaterial({ color: 0xff0000, shininess: 0 }));
    expect(phong.roughness).toBeCloseTo(1);
    expect(phong.color.r).toBeCloseTo(1);
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: new THREE.DataTexture(new Uint8Array(4), 1, 1) })));
    s.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))));
    const r = await exportUsdz(s);
    expect(r.warnings.join()).toContain('1 lines and point clouds');
    // Node has no canvas to draw the pixels on.
    expect(r.warnings.join()).toContain('could not be read');
  });
});
