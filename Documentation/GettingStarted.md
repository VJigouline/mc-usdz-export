# Getting started

## Install

```sh
npm install three github:VJigouline/mc-usdz-export
```

## Write a file

`exportUsdz(root, options)` writes the scenes under `root`, usually a scene, as `.usdz`. It returns a promise of the result.

```ts
import { exportUsdz } from 'mc-usdz-export';

const result = await exportUsdz(scene, { name: 'model' });
for (const warning of result.warnings) console.warn(warning);
const file = result.file;

// In a browser, download it:
const link = document.createElement('a');
link.href = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
link.download = file.name;
link.click();

// In Node, write it:
// fs.writeFileSync(file.name, file.data);
```

## Units and orientation

USDZ is written in metres and Y up, like three.js.

## Options

- **`onlyVisible`** (default true): Leaves out hidden objects and those under hidden parents.
- **`filter`** (default —): A function that decides, for each object, whether it is exported, such as one leaving out an editor's helpers.
- **`quickLookCompatible`** (default true): Writes the package as AR Quick Look reads it best.
- **`anchoring`** (default 'plane'): `'plane'` or `'image'`.
- **`planeAlignment`** (default 'horizontal'): `'horizontal'`, `'vertical'` or `'any'`.
- **`maxTextureSize`** (default 2048): Largest texture side, in pixels.
- **`name`** (default 'scene'): The file's name, without extension.

See the [API](API.md) for the whole result.
