// Shared by the mc-*-export packages: what a scene holds to export, in world coordinates, and
// the file an export produces.

import * as THREE from 'three';

/** A file an exporter wrote. */
export interface ExportFile {
  name: string;
  data: Uint8Array;
  /** The media type, for a download. */
  mimeType: string;
}

export interface CollectOptions {
  /** Leaves out hidden objects and those under hidden parents. Default true. */
  onlyVisible?: boolean;
  /** Decides, for each object, whether it is exported. */
  filter?: (object: THREE.Object3D) => boolean;
}

/** A drawable object of the scene, with its geometry in world coordinates. */
export interface WorldObject {
  object: THREE.Mesh | THREE.Line | THREE.Points;
  kind: 'mesh' | 'line' | 'points';
  /** A copy of the geometry with the object's world transform applied. */
  geometry: THREE.BufferGeometry;
  /** The object's materials, one per geometry group, or one for the whole geometry. */
  materials: THREE.Material[];
  /** A name for the object, unique among those collected. */
  name: string;
}

const visible = (o: THREE.Object3D) => {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
};

/** The meshes, lines and points under `root`, with their geometry moved into world coordinates. */
export function collectWorld(root: THREE.Object3D, options: CollectOptions = {}): WorldObject[] {
  root.updateWorldMatrix(true, true);
  const out: WorldObject[] = [];
  const names = new Map<string, number>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const kind = (m as THREE.Mesh).isMesh ? 'mesh' : (o as THREE.Line).isLine ? 'line' : (o as THREE.Points).isPoints ? 'points' : undefined;
    if (!kind || !m.geometry?.getAttribute('position')) return;
    if (options.onlyVisible !== false && !visible(o)) return;
    if (options.filter && !options.filter(o)) return;
    const geometry = m.geometry.clone();
    // Instanced and skinned meshes are exported in their rest pose, once.
    geometry.applyMatrix4(o.matrixWorld);
    // A mirroring transform turns faces inside out; their winding is put back.
    if (kind === 'mesh' && o.matrixWorld.determinant() < 0) flipWinding(geometry);
    const materials = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    const base = (o.name || m.geometry.name || kind).replace(/\s+/g, '_');
    const n = names.get(base) ?? 0;
    names.set(base, n + 1);
    out.push({ object: m, kind, geometry, materials, name: n ? `${base}_${n}` : base });
  });
  return out;
}

/** Reverses the winding of every triangle. */
export function flipWinding(g: THREE.BufferGeometry): void {
  if (g.index) {
    const a = g.index.array;
    for (let i = 0; i + 2 < a.length; i += 3) {
      const t = a[i + 1]!;
      a[i + 1] = a[i + 2]!;
      a[i + 2] = t;
    }
    g.index.needsUpdate = true;
    return;
  }
  for (const attribute of Object.values(g.attributes)) {
    const s = attribute.itemSize;
    const a = attribute.array;
    for (let v = 0; v + 2 < attribute.count; v += 3) {
      for (let k = 0; k < s; k++) {
        const t = a[(v + 1) * s + k]!;
        a[(v + 1) * s + k] = a[(v + 2) * s + k]!;
        a[(v + 2) * s + k] = t;
      }
    }
    attribute.needsUpdate = true;
  }
}

/** The triangles of a mesh geometry, as vertex index triples, for each geometry group. */
export function triangles(g: THREE.BufferGeometry): { group: number; a: number; b: number; c: number }[] {
  const count = g.index ? g.index.count : g.getAttribute('position').count;
  const index = (i: number) => (g.index ? g.index.getX(i) : i);
  const groups = g.groups.length ? g.groups : [{ start: 0, count, materialIndex: 0 }];
  const out: { group: number; a: number; b: number; c: number }[] = [];
  for (const group of groups) {
    const end = Math.min(count, group.start + group.count);
    for (let i = group.start; i + 2 < end; i += 3) out.push({ group: group.materialIndex ?? 0, a: index(i), b: index(i + 1), c: index(i + 2) });
  }
  return out;
}

/** Turns three.js's Y-up metres into Z-up units, as CAD and 3D printers expect. */
export function toZUp(scale: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeScale(scale, scale, scale));
}

/** Metres per unit of the units files are written in. */
export const UNITS = { micron: 1e-6, millimeter: 0.001, centimeter: 0.01, meter: 1, inch: 0.0254, foot: 0.3048 } as const;
export type Unit = keyof typeof UNITS;

/** A file name: the base, cleaned of characters file systems refuse, and the extension. */
export function fileName(base: string | undefined, extension: string): string {
  const clean = (base ?? '').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').trim();
  return `${clean || 'scene'}.${extension}`;
}

/** The colour of a material, in sRGB 0 to 1, or white. */
export function materialColor(m: THREE.Material | undefined): THREE.Color {
  const c = (m as THREE.MeshStandardMaterial | undefined)?.color;
  return c ? c.clone() : new THREE.Color(1, 1, 1);
}
