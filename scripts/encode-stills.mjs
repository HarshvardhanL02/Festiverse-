// Encodes stills rendered from the live 3D scene (.stills-raw/*.png, see scripts/capture-stills.md)
// into public/stills/*.webp, and builds the 1200x630 WhatsApp/OG preview from the Act 3 render.
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const raw = path.join(root, '.stills-raw')
for (const f of await readdir(raw)) {
  if (!f.endsWith('.png')) continue
  const out = path.join(root, 'public', 'stills', f.replace('.png', '.webp'))
  await sharp(path.join(raw, f)).webp({ quality: 80 }).toFile(out)
  console.log(out)
}
await sharp(path.join(raw, 'act3.png')).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(root, 'public', 'og-image.jpg'))
console.log('og-image.jpg')
