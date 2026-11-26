# API

## `exportUsdz(root, options?)`

Writes `.usdz` and returns a promise of a `UsdzExportResult`.

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `onlyVisible` | true | Leaves out hidden objects and those under hidden parents. |
| `filter` | — | A function that decides, for each object, whether it is exported, such as one leaving out an editor's helpers. |
| `quickLookCompatible` | true | Writes the package as AR Quick Look reads it best. |
| `anchoring` | 'plane' | `'plane'` or `'image'`. |
| `planeAlignment` | 'horizontal' | `'horizontal'`, `'vertical'` or `'any'`. |
| `maxTextureSize` | 2048 | Largest texture side, in pixels. |
| `name` | 'scene' | The file's name, without extension. |

### `UsdzExportResult`

| Field | Type | Meaning |
| --- | --- | --- |
| `file` | `ExportFile` | The USDZ package. |
| `stats` | object | Meshes, materials and textures. |
| `warnings` | `string[]` | What was left out, and why. |

`ExportFile` is `{ name, data, mimeType }`, with `data` a `Uint8Array`.

See the package's `index.d.ts` for every exported type and helper.
