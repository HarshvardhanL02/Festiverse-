# Asset sources & licences

Every asset in this repository may be redistributed. Nothing here is copyrighted film, devotional, or stock material.

## Third-party assets (CC0, from Poly Haven)

All of these come from [Poly Haven](https://polyhaven.com) under **CC0 1.0** (public domain dedication, see https://polyhaven.com/license). They may be used, modified and redistributed commercially or otherwise, and no attribution is required. We credit the authors anyway.

| File(s) in `public/` | Poly Haven asset | Used for |
| --- | --- | --- |
| `models/lantern.glb` | [Brass Diya Lantern](https://polyhaven.com/a/brass_diya_lantern) by Bhargav Kubal | Hanging lanterns at the gateway and courtyard |
| `textures/sandstone_*.webp` | [Red Sandstone Wall](https://polyhaven.com/a/red_sandstone_wall) | Temples, gateway, arcades, colonnades |
| `textures/pavement_*.webp` | [Red Sandstone Pavement](https://polyhaven.com/a/red_sandstone_pavement) | Road, plaza, ghats, diya pedestal |
| `textures/marble_*.webp` | [Marble 01](https://polyhaven.com/a/marble_01) | Courtyard floor |
| `textures/plaster_*.webp` | [Clay Plaster](https://polyhaven.com/a/clay_plaster) | City houses; terracotta diyas (tinted) |

`node scripts/fetch-assets.mjs` re-downloads these at 1K resolution and converts them into what we ship:
- textures become WebP (`*_diff` colour, `*_nor` OpenGL normal, `*_arm` AO/roughness/metal);
- the lantern becomes an optimised GLB (meshopt geometry and WebP textures, 2.5 MB down to 295 KB).

## Original assets (created for this project, MIT like the code)

- **All architecture**: temples, shikharas, gateway, arcades, colonnades and houses. Generated in code by `src/experience/kit.ts` and `Architecture.tsx`.
- **Hero clay diya, marigolds, flames, fireworks, sky lanterns, petals, mandala, sky, fog and light shafts**: generated in code and shaders.
- **`public/stills/*.webp` and `public/og-image.jpg`**: rendered from this project's own 3D scene (see `scripts/capture-stills.md`).
- **`public/favicon.svg`**: hand-written SVG.

## Fonts

Rozha One, Mukta and Cormorant Garamond come from Google Fonts under the SIL Open Font License 1.1.

## Audio

**None is shipped.** The experience is silent by default and the music button stays disabled until you add a file you own or have licensed. See the README section "Soundtrack". Do not add film songs or devotional recordings without written permission from the rights holders.

## Why there are no third-party temple models

We looked for downloadable, redistributable 3D models of Indian temple architecture. Poly Haven has none. Other marketplaces either need an account and API token to download, or use licences that don't clearly allow redistribution inside an open-source repo. So the architecture is procedural, built from Nagara-style rules, with real CC0 PBR stone textures. If you have rights to a better GLB, it can replace `Temple` / `Gateway` in `src/experience/Architecture.tsx`.
