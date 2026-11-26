# mc-usdz-export

A USDZ exporter for [three.js](https://threejs.org/), written in TypeScript. It writes three.js scenes as USDZ packages for Apple's AR Quick Look with three.js's USDZExporter: every visible mesh in world coordinates, its materials made physically based, with textures. It was made for [SceneEditor](https://github.com/VJigouline/SceneEditor), and works in any three.js application.

```ts
import { exportUsdz } from 'mc-usdz-export';

const { file } = await exportUsdz(scene);
// file.data is a Uint8Array: download it, or write it to disk.
const url = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
```

## What it writes

- Every visible mesh, in world coordinates.
- Materials as UsdPreviewSurface: Phong, Lambert and basic materials are turned into physically based ones first.
- Colour, normal, roughness, metalness, emissive, occlusion and alpha maps.
- AR Quick Look anchoring: on horizontal or vertical planes, or on images.

Lines and points are left out, with a warning. Textures are drawn on a canvas; where there is none, as in Node, they are left out with a warning. See [Format and limits](Documentation/Support.md) for the details.

## Install

The package is not on the npm registry. Install it from GitHub:

```sh
npm install github:VJigouline/mc-usdz-export
```

`three` (r160 or later) is a peer dependency. The package builds itself on install.

## Documentation

- [Getting started](Documentation/GettingStarted.md)
- [API](Documentation/API.md)
- [Format and limits](Documentation/Support.md)
- [Using it in SceneEditor](Documentation/SceneEditor.md)

## Development

```sh
npm install
npm test           # unit tests, with Vitest
npm run typecheck
npm run build      # dist/
```

The tests write files and read them back with three.js's loaders. It needs Node.js 22 or later.

## Licence

[MIT](LICENSE)
