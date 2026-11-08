// Downloads the CC0 assets used by the Ayodhya scene from Poly Haven and converts them
// into web-ready files under public/. Every asset here is CC0 (https://polyhaven.com/license):
// free to use, modify and redistribute, no attribution required (we credit anyway in ASSETS.md).
//
// Run: node scripts/fetch-assets.mjs        (needs network; outputs are committed so normal builds don't)
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const CACHE = path.join(ROOT, '.asset-cache')
const TEX_OUT = path.join(ROOT, 'public', 'textures')
const MODEL_OUT = path.join(ROOT, 'public', 'models')

const TEXTURES = {
  sandstone: 'red_sandstone_wall',
  pavement: 'red_sandstone_pavement',
  marble: 'marble_01',
  plaster: 'clay_plaster',
}
const MAPS = { diff: 'Diffuse', nor: 'nor_gl', arm: 'arm' }
const MODELS = { lantern: 'brass_diya_lantern' }

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'festiverse-asset-fetch' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function cached(url) {
  const file = path.join(CACHE, url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_'))
  if (existsSync(file)) return readFile(file)
  const buf = await get(url)
  await writeFile(file, buf)
  return buf
}

await mkdir(CACHE, { recursive: true })
await mkdir(TEX_OUT, { recursive: true })
await mkdir(MODEL_OUT, { recursive: true })

for (const [alias, id] of Object.entries(TEXTURES)) {
  const files = JSON.parse((await get(`https://api.polyhaven.com/files/${id}`)).toString())
  for (const [short, key] of Object.entries(MAPS)) {
    const url = files[key]['1k'].jpg.url
    const buf = await cached(url)
    const out = path.join(TEX_OUT, `${alias}_${short}.webp`)
    // Normal / ARM maps need higher quality to avoid banding artefacts.
    await sharp(buf).webp({ quality: short === 'diff' ? 82 : 90 }).toFile(out)
    console.log('texture', out)
  }
}

for (const [alias, id] of Object.entries(MODELS)) {
  const files = JSON.parse((await get(`https://api.polyhaven.com/files/${id}`)).toString())
  const gltf = files.gltf['1k'].gltf
  const dir = path.join(CACHE, id)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, path.basename(gltf.url)), await cached(gltf.url))
  for (const [rel, inc] of Object.entries(gltf.include)) {
    await mkdir(path.join(dir, path.dirname(rel)), { recursive: true })
    await writeFile(path.join(dir, rel), await cached(inc.url))
  }
  const out = path.join(MODEL_OUT, `${alias}.glb`)
  await rm(out, { force: true })
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['gltf-transform', 'optimize', path.join(dir, path.basename(gltf.url)), out, '--texture-compress', 'webp', '--texture-size', '1024', '--compress', 'meshopt'],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  )
  console.log('model', out)
}
