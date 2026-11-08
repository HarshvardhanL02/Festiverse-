/**
 * Procedural architecture kit for the Ayodhya scene.
 *
 * No redistributable (CC0/CC-BY downloadable) Indian temple models exist that we can ship,
 * so the architecture is generated from real Nagara-style construction rules:
 * stepped "ratha" plans, curvilinear shikharas with bhumi-amalaka banding, ribbed amalakas,
 * kalash finials, multi-foil arches and moulded column profiles. Everything is merged into
 * a handful of draw calls and box-projected UVs so the CC0 sandstone textures keep a
 * consistent real-world texel density.
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type Geo = THREE.BufferGeometry

/** Clone + transform a geometry. */
export function place(
  geo: Geo,
  pos: [number, number, number] = [0, 0, 0],
  rotY = 0,
  scale: number | [number, number, number] = 1,
  rotX = 0,
): Geo {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, 0)),
    typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale),
  )
  g.applyMatrix4(m)
  return g
}

/** Replace NaN / zero normals (from degenerate triangles) — NaNs turn black and bloom smears them. */
export function fixNormals(g: Geo): Geo {
  const n = g.attributes.normal
  if (!n) return g
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i), y = n.getY(i), z = n.getZ(i)
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || x * x + y * y + z * z < 1e-8) n.setXYZ(i, 0, 1, 0)
  }
  n.needsUpdate = true
  return g
}

/** Merge many geometries (indexed or not) into one, keeping position/normal/uv. */
export function merge(geos: Geo[]): Geo {
  const clean = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g
    for (const name of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name)
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2))
    if (!n.attributes.normal) n.computeVertexNormals()
    return n
  })
  const out = mergeGeometries(clean, false)
  if (!out) throw new Error('merge failed')
  return fixNormals(out)
}

/** Box-projected UVs in world metres (call after merging; geometry must be non-indexed). */
export function boxUV(geo: Geo, metresPerTile = 2): Geo {
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i += 3) {
    // Per-face dominant axis so a triangle never straddles two projections.
    let nx = 0, ny = 0, nz = 0
    for (let k = 0; k < 3; k++) {
      nx += Math.abs(nor.getX(i + k))
      ny += Math.abs(nor.getY(i + k))
      nz += Math.abs(nor.getZ(i + k))
    }
    for (let k = 0; k < 3; k++) {
      const j = i + k
      const x = pos.getX(j), y = pos.getY(j), z = pos.getZ(j)
      let u: number, v: number
      if (ny >= nx && ny >= nz) { u = x; v = z }
      else if (nx >= nz) { u = z; v = y }
      else { u = x; v = y }
      uv[j * 2] = u / metresPerTile
      uv[j * 2 + 1] = v / metresPerTile
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}

/** Lathe from [radius, y] pairs. */
export function lathe(profile: [number, number][], segments = 24): Geo {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), segments)
}

/**
 * Stepped "pancharatha" plan: a square with projecting offsets on every face.
 * Returns outline points (unit size) going counter-clockwise.
 */
export function rathaPlan(steps: { w: number; d: number }[] = [{ w: 0.62, d: 0.09 }, { w: 0.28, d: 0.18 }]): [number, number][] {
  // One side (+x face), sampled from y=-1 to y=1.
  const side: [number, number][] = []
  const edges = [-1, ...steps.map((s) => -s.w), ...[...steps].reverse().map((s) => s.w), 1]
  const depthAt = (y: number) => {
    let d = 0
    for (const s of steps) if (Math.abs(y) < s.w - 1e-6) d = s.d
    return d
  }
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i], b = edges[i + 1]
    const d = depthAt((a + b) / 2)
    side.push([1 + d, a], [1 + d, b])
  }
  const out: [number, number][] = []
  for (let s = 0; s < 4; s++) {
    const ang = (s * Math.PI) / 2
    const c = Math.cos(ang), sn = Math.sin(ang)
    for (const [x, y] of side) {
      const p: [number, number] = [x * c - y * sn, x * sn + y * c]
      const prev = out[out.length - 1]
      if (prev && Math.hypot(prev[0] - p[0], prev[1] - p[1]) < 1e-6) continue
      out.push(p)
    }
  }
  const first = out[0], last = out[out.length - 1]
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6) out.pop()
  return out
}

/** Sweep a plan outline through rings of (radiusScale, y). Produces a closed, capped spire body. */
export function ringSweep(plan: [number, number][], rings: [number, number][]): Geo {
  const n = plan.length
  const positions: number[] = []
  const uvs: number[] = []
  const perim: number[] = [0]
  for (let i = 1; i <= n; i++) {
    const [ax, ay] = plan[i - 1], [bx, by] = plan[i % n]
    perim.push(perim[i - 1] + Math.hypot(bx - ax, by - ay))
  }
  const P = perim[n]
  const vert = (ri: number, pi: number) => {
    const [s, y] = rings[ri]
    const [x, z] = plan[pi % n]
    return [x * s, y, z * s]
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let p = 0; p < n; p++) {
      const a = vert(r, p), b = vert(r, p + 1), c = vert(r + 1, p + 1), d = vert(r + 1, p)
      positions.push(...a, ...b, ...c, ...a, ...c, ...d)
      const u0 = perim[p] / P, u1 = perim[p + 1] / P, v0 = rings[r][1], v1 = rings[r + 1][1]
      uvs.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1)
    }
  }
  // Top cap
  const top = rings[rings.length - 1]
  for (let p = 0; p < n; p++) {
    const a = vert(rings.length - 1, p), b = vert(rings.length - 1, p + 1)
    positions.push(0, top[1], 0, ...b, ...a)
    uvs.push(0, 0, 0, 0, 0, 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.computeVertexNormals()
  return fixNormals(g)
}

/** Curvilinear Nagara shikhara with bhumi-amalaka bands every tier. */
export function shikhara(height: number, base: number, tiers = 9): Geo {
  const plan = rathaPlan()
  const rings: [number, number][] = []
  const perTier = 4
  for (let i = 0; i <= tiers * perTier; i++) {
    const t = i / (tiers * perTier)
    // Curvilinear taper that rounds over near the top.
    let s = base * (1 - Math.pow(t, 1.45)) * (0.82 + 0.18 * Math.cos(t * Math.PI * 0.5)) + base * 0.16
    const k = i % perTier
    if (k === 0) s *= 1.06 // amalaka band (ridge)
    if (k === 1) s *= 0.985
    rings.push([s, t * height])
  }
  return ringSweep(plan, rings)
}

/** Ribbed amalaka disc crowning a shikhara. */
export function amalaka(r: number, h: number, ribs = 28): Geo {
  const plan: [number, number][] = []
  const N = ribs * 4
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const m = 1 + 0.07 * Math.abs(Math.cos((a * ribs) / 2))
    plan.push([Math.cos(a) * m, Math.sin(a) * m])
  }
  const rings: [number, number][] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    rings.push([r * (0.55 + 0.45 * Math.sin(t * Math.PI)), t * h])
  }
  return ringSweep(plan, rings)
}

/** Kalash finial (pot + coconut-leaf crown). */
export function kalash(s = 1): Geo {
  return lathe(
    [
      [0.0, 0], [0.32, 0], [0.34, 0.06], [0.22, 0.1], [0.3, 0.2], [0.42, 0.36], [0.4, 0.52], [0.24, 0.66],
      [0.16, 0.7], [0.2, 0.76], [0.12, 0.8], [0.16, 0.92], [0.06, 1.12], [0.0, 1.22],
    ].map(([r, y]) => [r * s, y * s] as [number, number]),
    20,
  )
}

/** Moulded column: base, octagonal shaft with bands, bracket capital. */
export function column(h: number, r = 0.32): Geo {
  const shaft = lathe(
    [
      [r * 1.55, 0], [r * 1.55, h * 0.06], [r * 1.3, h * 0.08], [r * 1.35, h * 0.12], [r * 1.05, h * 0.15],
      [r, h * 0.16], [r, h * 0.42], [r * 1.12, h * 0.44], [r * 1.12, h * 0.47], [r, h * 0.49], [r * 0.95, h * 0.78],
      [r * 1.15, h * 0.8], [r * 1.3, h * 0.86], [r * 1.05, h * 0.9], [r * 1.45, h * 0.94], [r * 1.6, h], [0, h],
    ],
    8,
  )
  const bracket = new THREE.BoxGeometry(r * 4.2, h * 0.05, r * 1.6)
  bracket.translate(0, h - h * 0.025, 0)
  const bracket2 = new THREE.BoxGeometry(r * 1.6, h * 0.05, r * 4.2)
  bracket2.translate(0, h - h * 0.025, 0)
  return merge([shaft, bracket, bracket2])
}

/** Moulded plinth (adhisthana) — a stack of projecting courses. */
export function plinth(w: number, d: number, h: number): Geo {
  const courses: [number, number][] = [
    [1.0, 0.18], [0.96, 0.12], [0.985, 0.14], [0.94, 0.1], [0.97, 0.16], [0.93, 0.12], [0.95, 0.18],
  ]
  const total = courses.reduce((a, [, t]) => a + t, 0)
  const geos: Geo[] = []
  let y = 0
  for (const [s, t] of courses) {
    const hh = (t / total) * h
    const b = new THREE.BoxGeometry(w * s, hh, d * s)
    b.translate(0, y + hh / 2, 0)
    geos.push(b)
    y += hh
  }
  return merge(geos)
}

/** Onion/cupola dome. */
export function dome(r: number, h = r * 1.3): Geo {
  const pts: [number, number][] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const bulge = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.35 + (1 - t) * 0.72
    pts.push([r * bulge * (t > 0.96 ? 0.15 : 1), t * h])
  }
  return lathe(pts, 18)
}

/** Multi-foil (cusped) arch as a THREE.Path hole for ExtrudeGeometry. */
export function foilArchPath(cx: number, base: number, w: number, h: number, foils = 7): THREE.Path {
  const p = new THREE.Path()
  const r = w / 2
  const spring = base + h - r * 1.15
  p.moveTo(cx - r, base)
  p.lineTo(cx + r, base)
  p.lineTo(cx + r, spring)
  const N = 64
  for (let i = 0; i <= N; i++) {
    const t = i / N // 0 = right spring, 1 = left spring
    const a = t * Math.PI
    // Slightly pointed arch.
    const ax = Math.cos(a) * r
    const ay = Math.sin(a) * r * 1.15
    const cusp = Math.abs(Math.sin(t * Math.PI * foils)) * r * 0.075
    const nx = Math.cos(a), ny = Math.sin(a)
    p.lineTo(cx + ax - nx * cusp, spring + ay - ny * cusp)
  }
  p.lineTo(cx - r, base)
  return p
}

/** Wall slab with any number of foil-arch openings. */
export function archedWall(w: number, h: number, depth: number, arches: { cx: number; base: number; w: number; h: number }[]): Geo {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.lineTo(w / 2, 0)
  s.lineTo(w / 2, h)
  s.lineTo(-w / 2, h)
  s.lineTo(-w / 2, 0)
  for (const a of arches) s.holes.push(foilArchPath(a.cx, a.base, a.w, a.h))
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 })
  g.translate(0, 0, -depth / 2)
  return g
}

/** Stepped pyramidal roof (phamsana / samvarana) for mandapas. */
export function steppedRoof(w: number, layers: number, layerH: number): Geo {
  const geos: Geo[] = []
  for (let i = 0; i < layers; i++) {
    const s = w * (1 - i / (layers + 1.2))
    const b = new THREE.BoxGeometry(s, layerH * 0.7, s)
    b.translate(0, i * layerH + layerH * 0.35, 0)
    const lip = new THREE.BoxGeometry(s * 1.04, layerH * 0.18, s * 1.04)
    lip.translate(0, i * layerH + layerH * 0.79, 0)
    geos.push(b, lip)
  }
  return merge(geos)
}

/** Deterministic RNG. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 1000000) / 1000000
  }
}
