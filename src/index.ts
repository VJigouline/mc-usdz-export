// Writes three.js scenes as USDZ packages for Apple's AR Quick Look with three.js's USDZExporter:
// every visible mesh in world coordinates, its materials made physically based, and textures
// that the exporter could not read made readable or left out with a warning.

import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { collectWorld, fileName, type CollectOptions, type ExportFile } from './common.js';

export { collectWorld, type CollectOptions, type ExportFile } from './common.js';

export interface UsdzOptions extends CollectOptions {
  /** Writes the package as AR Quick Look reads it best. Default true. */
  quickLookCompatible?: boolean;
  /** How AR Quick Look places the model: on a plane (the default) or an image. */
  anchoring?: 'plane' | 'image';
  /** For plane anchoring: on horizontal (the default) or vertical surfaces. */
  planeAlignment?: 'horizontal' | 'vertical' | 'any';
  /** Largest texture side, in pixels. Default 2048. */
  maxTextureSize?: number;
  /** The file's name, without extension. Default 'scene'. */
  name?: string;
}

export interface UsdzExportResult {
  file: ExportFile;
  warnings: string[];
  stats: { meshes: number; materials: number; textures: number };
}

const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap'] as const;

/** A physically based copy of a material, as USDZ holds; others are approximated. */
export function toStandard(m: THREE.Material): THREE.MeshStandardMaterial {
  if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) return m as THREE.MeshStandardMaterial;
  const any = m as THREE.MeshPhongMaterial & THREE.MeshBasicMaterial;
  const standard = new THREE.MeshStandardMaterial({
    name: m.name,
    color: any.color ?? new THREE.Color(1, 1, 1),
    map: any.map ?? null,
    alphaMap: any.alphaMap ?? null,
    aoMap: any.aoMap ?? null,
    opacity: m.opacity,
    transparent: m.transparent,
    side: m.side,
    vertexColors: (m as THREE.MeshBasicMaterial).vertexColors,
    metalness: 0,
    roughness: m instanceof THREE.MeshPhongMaterial ? Math.min(1, Math.sqrt(2 / (m.shininess + 2))) : 1,
  });
  if (any.emissive) standard.emissive.copy(any.emissive);
  if (any.emissiveMap) standard.emissiveMap = any.emissiveMap;
  if (any.normalMap) standard.normalMap = any.normalMap;
  // An unlit material glows with its own colour.
  if (m instanceof THREE.MeshBasicMaterial) {
    standard.emissive.copy(m.color);
    standard.emissiveMap = m.map;
  }
  return standard;
}

/** A texture whose image the exporter can draw, or undefined if there is no canvas to make one. */
function readable(texture: THREE.Texture): THREE.Texture | undefined {
  const image = texture.image as { data?: ArrayLike<number>; width?: number; height?: number } | undefined;
  const drawable = (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) || (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) || (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) || (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas);
  if (drawable) return texture;
  // Raw 8-bit pixels, as in a DataTexture, are drawn onto a canvas.
  if (typeof document === 'undefined' || !image?.data || !image.width || !image.height || !(image.data instanceof Uint8Array || image.data instanceof Uint8ClampedArray) || image.data.length !== image.width * image.height * 4) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const pixels = context.createImageData(image.width, image.height);
  const stride = image.width * 4;
  // DataTexture rows run from the bottom; canvas rows from the top.
  for (let y = 0; y < image.height; y++) pixels.data.set((image.data as Uint8Array).subarray(y * stride, (y + 1) * stride), (image.height - 1 - y) * stride);
  context.putImageData(pixels, 0, 0);
  const copy = texture.clone();
  copy.image = canvas;
  copy.flipY = false;
  return copy;
}

/** Writes the meshes under `root` as a USDZ package. Lines and points are left out. */
export async function exportUsdz(root: THREE.Object3D, options: UsdzOptions = {}): Promise<UsdzExportResult> {
  const objects = collectWorld(root, options);
  const warnings: string[] = [];
  const meshes = objects.filter((o) => o.kind === 'mesh');
  if (meshes.length < objects.length) warnings.push(`${objects.length - meshes.length} lines and point clouds were left out: USDZ for AR Quick Look holds meshes`);
  const scene = new THREE.Scene();
  const converted = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  const textures = new Set<THREE.Texture>();
  const dropped = new Set<string>();
  const convert = (m: THREE.Material) => {
    let s = converted.get(m);
    if (s) return s;
    s = toStandard(m).clone();
    for (const key of MAPS) {
      const texture = s[key] as THREE.Texture | null;
      if (!texture) continue;
      const ok = readable(texture);
      if (ok) {
        (s[key] as THREE.Texture | null) = ok;
        textures.add(ok);
      } else {
        (s[key] as THREE.Texture | null) = null;
        dropped.add(`${m.name || 'material'} ${key}`);
      }
    }
    converted.set(m, s);
    return s;
  };
  for (const o of meshes) {
    if (!o.geometry.getAttribute('normal')) o.geometry.computeVertexNormals();
    const material = o.materials.length > 1 ? o.materials.map(convert) : convert(o.materials[0] ?? new THREE.MeshStandardMaterial());
    const mesh = new THREE.Mesh(o.geometry, material);
    mesh.name = o.name;
    scene.add(mesh);
  }
  if (dropped.size) warnings.push(`Textures that could not be read were left out: ${[...dropped].join(', ')}`);
  if (!meshes.length) warnings.push('There are no meshes to write');
  const exporter = new USDZExporter();
  const warn = console.warn;
  let data: Uint8Array;
  try {
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]).replace(/^THREE\.USDZExporter:\s*/, ''));
    data = await exporter.parseAsync(scene, {
      quickLookCompatible: options.quickLookCompatible !== false,
      maxTextureSize: options.maxTextureSize ?? 2048,
      includeAnchoringProperties: true,
      ar: { anchoring: { type: options.anchoring ?? 'plane' }, planeAnchoring: { alignment: options.planeAlignment ?? 'horizontal' } },
    } as Parameters<USDZExporter['parseAsync']>[1]);
  } finally {
    console.warn = warn;
    for (const o of objects) o.geometry.dispose();
  }
  return { file: { name: fileName(options.name, 'usdz'), data, mimeType: 'model/vnd.usdz+zip' }, warnings, stats: { meshes: meshes.length, materials: converted.size, textures: textures.size } };
}
