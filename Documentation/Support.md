# Format and limits

## What is written

- Every visible mesh, in world coordinates.
- Materials as UsdPreviewSurface: Phong, Lambert and basic materials are turned into physically based ones first.
- Colour, normal, roughness, metalness, emissive, occlusion and alpha maps.
- AR Quick Look anchoring: on horizontal or vertical planes, or on images.

## Units and orientation

USDZ is written in metres and Y up, like three.js.

## Limits

Lines and points are left out, with a warning. Textures are drawn on a canvas; where there is none, as in Node, they are left out with a warning.
