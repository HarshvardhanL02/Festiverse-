# Rendering the 2.5D film stills

The phone / reduced-motion fallback and the landing page use stills rendered from the real 3D scene.

1. `npm run dev`
2. Open any greeting with `?t=<seconds>&dpr=<scale>` to freeze the journey at that time, for example
   `/w/<payload>?t=12.6&dpr=1.2`. This is dev-only: the UI is hidden and the canvas keeps its drawing buffer.
3. In the browser console, POST the canvas to the dev-only capture endpoint (it writes `.stills-raw/<name>.png`):

   ```js
   const c = document.querySelector('canvas')
   await fetch('/__capture?name=act3', { method: 'POST', body: c.toDataURL('image/png') })
   ```

   Times we use: act1 `t=0`, act2 `t=6.6`, act3 `t=12.6`, act4 `t=25`.
   - Landscape: 1600×900 viewport at `dpr=1.2` (1920×1080).
   - Portrait (`-portrait` suffix): 540×960 viewport at `dpr=2` (1080×1920).
4. `node scripts/encode-stills.mjs` converts them to `public/stills/*.webp` and rebuilds `public/og-image.jpg` from act3.
