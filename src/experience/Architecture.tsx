import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  amalaka,
  archedWall,
  boxUV,
  column,
  dome,
  kalash,
  lathe,
  merge,
  place,
  plinth,
  rathaPlan,
  ringSweep,
  rng,
  shikhara,
  steppedRoof,
  type Geo,
} from './kit'
import type { Materials } from './materials'
import { ACT, journey, smooth } from './timeline'

/** Ground level of city / courtyard; the river sits below it. */
export const GROUND = 0
export const RIVER_Y = -3.2
export const NEAR_BANK_Z = 20
export const FAR_BANK_Z = -20
export const STEP_COUNT = 8
export const STEP_RISE = 0.4
export const STEP_RUN = 1
export const TEMPLE_Z = -62
export const TEMPLE_SCALE = 0.85
export const MANDALA_Z = -36
export const GATE_Z = 40
export const DIYA_Z = 62

function Mesh({ geo, mat }: { geo: Geo; mat: THREE.Material }) {
  return <mesh geometry={geo} material={mat} castShadow={false} receiveShadow={false} />
}

/* ------------------------------------------------------------------ */
/* Flag with a cloth ripple done in the vertex shader                  */
/* ------------------------------------------------------------------ */
function Flag({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2.4, 1.3, 24, 8)
    g.translate(1.2, 0, 0)
    // Triangular pennant: pinch the free end.
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / 2.4
      p.setY(i, p.getY(i) * (1 - x * 0.85))
    }
    return g
  }, [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((s) => {
    if (mat.current) mat.current.uniforms.uTime.value = s.clock.elapsedTime
  })
  return (
    <mesh geometry={geo} position={position} scale={scale}>
      <shaderMaterial
        ref={mat}
        side={THREE.DoubleSide}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime; varying float vShade; varying vec2 vUv;
          void main(){
            vUv = uv;
            vec3 p = position;
            float w = p.x / 2.4;
            float wave = sin(p.x * 3.2 - uTime * 5.0) * 0.22 * w + sin(p.x * 6.0 - uTime * 7.3) * 0.06 * w;
            p.z += wave;
            p.y += sin(p.x * 2.0 - uTime * 3.0) * 0.08 * w;
            vShade = 0.75 + 0.35 * cos(p.x * 3.2 - uTime * 5.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`}
        fragmentShader={`
          varying float vShade; varying vec2 vUv;
          void main(){
            vec3 saffron = vec3(1.0, 0.42, 0.05);
            vec3 c = saffron * vShade * 0.9 + vec3(0.25, 0.08, 0.0) * smoothstep(0.85, 1.0, vUv.y);
            gl_FragColor = vec4(c, 1.0);
          }`}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Nagara temple                                                       */
/* ------------------------------------------------------------------ */
export function buildTemple(major = true) {
  const stone: Geo[] = []
  const dark: Geo[] = []
  const gold: Geo[] = []
  const jw = major ? 26 : 12
  const jd = major ? 34 : 14
  const jh = major ? 2.2 : 1.4

  // Jagati (raised platform) with moulded courses and front steps.
  dark.push(plinth(jw, jd, jh))
  for (let i = 0; i < 6; i++) {
    const b = new THREE.BoxGeometry(major ? 8 : 4, jh * (1 - i / 6), 0.6)
    b.translate(0, (jh * (1 - i / 6)) / 2, jd / 2 + 0.3 + i * 0.6)
    dark.push(b)
  }

  const bodyR = major ? 4.6 : 2.4
  const wallH = major ? 6.2 : 3.4
  const plan = rathaPlan()
  const cz = major ? -4 : 0
  // Garbhagriha walls with ratha projections and string courses.
  const wallRings: [number, number][] = []
  for (let i = 0; i <= 12; i++) {
    const y = (i / 12) * wallH
    const k = i % 4
    wallRings.push([bodyR * (k === 0 ? 1.05 : 1), y])
  }
  stone.push(place(ringSweep(plan, wallRings), [0, jh, cz]))
  stone.push(place(plinth(bodyR * 2.5, bodyR * 2.5, 1.0), [0, jh, cz]))

  // Main shikhara + urushringa clusters.
  const sh = major ? 18 : 9
  const shY = jh + wallH
  stone.push(place(shikhara(sh, bodyR * 1.04, major ? 10 : 7), [0, shY, cz]))
  const sideH = sh * 0.56
  for (let s = 0; s < 4; s++) {
    const a = (s * Math.PI) / 2
    const r = bodyR * 0.98
    stone.push(place(shikhara(sideH, bodyR * 0.46, 6), [Math.cos(a) * r, shY, cz + Math.sin(a) * r], -a))
    const a2 = a + Math.PI / 4
    const r2 = bodyR * 1.1
    stone.push(place(shikhara(sh * 0.34, bodyR * 0.3, 4), [Math.cos(a2) * r2, shY, cz + Math.sin(a2) * r2], -a2))
  }
  const topR = bodyR * 1.04 * 0.16 + 0.05
  stone.push(place(amalaka(topR * 1.9, topR * 1.1), [0, shY + sh - 0.1, cz]))
  gold.push(place(kalash(major ? 1.5 : 0.8), [0, shY + sh + topR * 1.0, cz]))

  // Mandapa: columns + stepped roof.
  if (major) {
    const mz = 8
    stone.push(place(plinth(13, 13, 0.9), [0, jh, mz]))
    const col = column(4.2, 0.3)
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        if ((i === 1 || i === 2) && (j === 1 || j === 2)) continue
        stone.push(place(col, [-4.8 + i * 3.2, jh + 0.9, mz - 4.8 + j * 3.2]))
      }
    stone.push(place(plinth(13.6, 13.6, 0.7), [0, jh + 0.9 + 4.2, mz]))
    stone.push(place(steppedRoof(12.4, 7, 0.62), [0, jh + 0.9 + 4.9, mz]))
    gold.push(place(kalash(0.9), [0, jh + 0.9 + 4.9 + 7 * 0.62 - 0.1, mz]))
    // Antarala (vestibule) joining mandapa and sanctum.
    stone.push(place(new THREE.BoxGeometry(5, 5.2, 4), [0, jh + 2.6, 2.6]))
  }

  return {
    stone: boxUV(merge(stone), 2.4),
    dark: boxUV(merge(dark), 2.4),
    gold: merge(gold),
    flagY: shY + sh + topR + (major ? 2.1 : 1.2),
    flagZ: cz,
    doorZ: major ? 14.6 : bodyR * 1.15,
    jh,
    jw,
    jd,
  }
}

export function Temple({ m, position, scale = 1, major = true }: { m: Materials; position: [number, number, number]; scale?: number; major?: boolean }) {
  const t = useMemo(() => buildTemple(major), [major])
  return (
    <group position={position} scale={scale}>
      <Mesh geo={t.stone} mat={m.sandstone} />
      <Mesh geo={t.dark} mat={m.sandstoneDark} />
      <Mesh geo={t.gold} mat={m.gold} />
      <mesh position={[0, t.flagY - 1.4, t.flagZ]} material={m.gold}>
        <cylinderGeometry args={[0.04, 0.05, 3.4, 6]} />
      </mesh>
      <Flag position={[0.05, t.flagY, t.flagZ]} scale={major ? 1 : 0.6} />
      {/* Sanctum glow through the doorway */}
      <mesh position={[0, t.jh + 2.4, t.doorZ - (major ? 9 : 0)]}>
        <planeGeometry args={[major ? 2.2 : 1.2, major ? 3.6 : 2]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Golden Gateway (Act 2)                                              */
/* ------------------------------------------------------------------ */
function buildGateway() {
  const stone: Geo[] = []
  const dark: Geo[] = []
  const gold: Geo[] = []
  const W = 20

  dark.push(plinth(W + 6, 5, 1.2))
  stone.push(
    place(
      archedWall(W, 14, 3.4, [
        { cx: 0, base: 0, w: 6.6, h: 10.8 },
        { cx: -6.6, base: 0, w: 2.4, h: 5.2 },
        { cx: 6.6, base: 0, w: 2.4, h: 5.2 },
      ]),
      [0, 1.2, 0],
    ),
  )
  // Pilasters framing the main arch.
  for (const x of [-4, 4]) stone.push(place(column(11, 0.42), [x, 1.2, 1.9]))

  // Jharokha gallery above the arch.
  stone.push(
    place(
      archedWall(W - 2, 4.4, 3.8, Array.from({ length: 7 }, (_, i) => ({ cx: -7.7 + i * 2.57, base: 0.6, w: 1.5, h: 3.2 }))),
      [0, 15.2, 0],
    ),
  )
  stone.push(place(plinth(W + 0.6, 4.6, 1.0), [0, 14.2, 0]))
  stone.push(place(plinth(W + 1.2, 5, 0.8), [0, 19.6, 0]))
  // Balcony brackets under the gallery.
  for (let i = 0; i < 9; i++) {
    const b = new THREE.BoxGeometry(0.5, 0.9, 1.4)
    stone.push(place(b, [-8 + i * 2, 13.8, 2.2]))
  }
  // Crown: row of cupolas with a central dome.
  const smallDome = dome(0.85)
  for (let i = 0; i < 7; i++) {
    const x = -8.4 + i * 2.8
    if (i === 3) continue
    stone.push(place(new THREE.CylinderGeometry(0.9, 0.95, 0.9, 12), [x, 20.85, 0]))
    gold.push(place(smallDome, [x, 21.3, 0]))
    gold.push(place(kalash(0.35), [x, 22.35, 0]))
  }
  stone.push(place(new THREE.CylinderGeometry(2.3, 2.4, 1.8, 20), [0, 21.3, 0]))
  gold.push(place(dome(2.4, 3.4), [0, 22.2, 0]))
  gold.push(place(kalash(0.9), [0, 25.5, 0]))

  // Flanking towers (pancharatha plan, moulded courses) with chhatris.
  const plan = rathaPlan([{ w: 0.5, d: 0.12 }])
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + 1.6)
    const rings: [number, number][] = []
    for (let i = 0; i <= 24; i++) {
      const y = (i / 24) * 22
      const k = i % 4
      rings.push([2.6 * (1 - (i / 24) * 0.12) * (k === 0 ? 1.06 : 1), y])
    }
    stone.push(place(ringSweep(plan, rings), [x, 1.2, 0]))
    // Chhatri
    for (const [cx, cz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]])
      stone.push(place(column(2.6, 0.14), [x + cx, 23.2, cz]))
    stone.push(place(new THREE.BoxGeometry(3.6, 0.35, 3.6), [x, 25.95, 0]))
    gold.push(place(dome(1.6, 2.2), [x, 26.1, 0]))
    gold.push(place(kalash(0.5), [x, 28.2, 0]))
  }

  return { stone: boxUV(merge(stone), 2.2), dark: boxUV(merge(dark), 2.2), gold: merge(gold) }
}

function DoorLeaf({ m, side }: { m: Materials; side: -1 | 1 }) {
  const pivot = useRef<THREE.Group>(null)
  const studs = useMemo(() => {
    const g = new THREE.SphereGeometry(0.075, 8, 6)
    const parts: Geo[] = []
    for (let i = 0; i < 5; i++) for (let j = 0; j < 11; j++) parts.push(place(g, [-side * (0.35 + i * 0.62), 0.6 + j * 0.92, 0.24]))
    const bands = [1.8, 5.2, 8.6].map((y) => place(new THREE.BoxGeometry(3.25, 0.16, 0.06), [-side * 1.62, y, 0.23]))
    return merge([...parts, ...bands])
  }, [side])
  useFrame(() => {
    if (!pivot.current) return
    const open = smooth(ACT.doorsOpen, ACT.doorsOpen + 2.6, journey.t)
    pivot.current.rotation.y = side * open * 1.75
  })
  return (
    <group ref={pivot} position={[side * 3.3, 1.2, -0.6]}>
      <mesh material={m.wood} position={[-side * 1.62, 5.1, 0]}>
        <boxGeometry args={[3.24, 10.2, 0.4]} />
      </mesh>
      <mesh geometry={studs} material={m.brass} />
    </group>
  )
}

export function Gateway({ m }: { m: Materials }) {
  const g = useMemo(buildGateway, [])
  return (
    <group position={[0, GROUND, GATE_Z]}>
      <Mesh geo={g.stone} mat={m.sandstone} />
      <Mesh geo={g.dark} mat={m.sandstoneDark} />
      <Mesh geo={g.gold} mat={m.gold} />
      <DoorLeaf m={m} side={-1} />
      <DoorLeaf m={m} side={1} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Ground, road, plaza, ghats                                          */
/* ------------------------------------------------------------------ */
export function Ground({ m }: { m: Materials }) {
  const geo = useMemo(() => {
    const parts: Geo[] = []
    // Approach road with low parapets.
    parts.push(place(new THREE.BoxGeometry(10, 0.4, 34), [0, -0.2, 72]))
    for (const x of [-5.4, 5.4]) parts.push(place(new THREE.BoxGeometry(0.8, 0.9, 30), [x, 0.25, 72]))
    // Hero diya pedestal.
    parts.push(
      place(
        lathe([[0.5, 0], [0.5, 0.12], [0.4, 0.18], [0.24, 0.28], [0.2, 0.72], [0.26, 0.8], [0.32, 0.9], [0.32, 0.98], [0, 0.98]], 32),
        [0, 0, DIYA_Z],
      ),
    )
    // Near-bank plaza (between gate and river) and city ground.
    parts.push(place(new THREE.BoxGeometry(260, 0.4, 60), [0, -0.2, NEAR_BANK_Z + 30]))
    // Far bank courtyard / city ground.
    parts.push(place(new THREE.BoxGeometry(260, 0.4, 120), [0, -0.2, FAR_BANK_Z - 8 - 60]))
    // Ghats down to the river on both banks: each step is a solid block down to the riverbed.
    const bed = RIVER_Y - 0.6
    for (let i = 0; i < STEP_COUNT; i++) {
      const top = GROUND - i * STEP_RISE
      const h = top - bed
      parts.push(place(new THREE.BoxGeometry(260, h, STEP_RUN), [0, bed + h / 2, NEAR_BANK_Z - i * STEP_RUN - 0.5]))
      parts.push(place(new THREE.BoxGeometry(260, h, STEP_RUN), [0, bed + h / 2, FAR_BANK_Z - 8 + i * STEP_RUN + 0.5]))
    }
    return boxUV(merge(parts), 3)
  }, [])
  return <Mesh geo={geo} mat={m.pavement} />
}

/** Arcaded colonnades lining the processional road (Act 1-2 framing). */
export function RoadArcades({ m }: { m: Materials }) {
  const { stone, dark, gold } = useMemo(() => {
    const s: Geo[] = []
    const d: Geo[] = []
    const g: Geo[] = []
    const len = 34
    const bays = 10
    const bay = len / bays
    for (const sx of [-1, 1]) {
      const x = sx * 9
      const wall = archedWall(
        len,
        6.4,
        1.1,
        Array.from({ length: bays }, (_, i) => ({ cx: -len / 2 + bay * (i + 0.5), base: 0, w: bay * 0.62, h: 4.6 })),
      )
      s.push(place(wall, [x, 0, GATE_Z + 6 + len / 2], (sx * Math.PI) / 2))
      d.push(place(plinth(2.4, len + 1, 0.8), [x, 6.4, GATE_Z + 6 + len / 2]))
      // Back wall closes the arcade so arches read as deep, shadowed bays.
      d.push(place(new THREE.BoxGeometry(0.6, 7, len), [x + sx * 3, 3.5, GATE_Z + 6 + len / 2]))
      d.push(place(new THREE.BoxGeometry(3.2, 0.4, len), [x + sx * 1.5, 6.6, GATE_Z + 6 + len / 2]))
      for (let i = 0; i <= bays; i++) {
        const z = GATE_Z + 6 + i * bay
        s.push(place(new THREE.BoxGeometry(1.4, 1.4, 1.4), [x, 7.9, z]))
        g.push(place(kalash(0.28), [x, 8.6, z]))
      }
    }
    return { stone: boxUV(merge(s), 2.2), dark: boxUV(merge(d), 2.2), gold: merge(g) }
  }, [])
  return (
    <group>
      <Mesh geo={stone} mat={m.sandstone} />
      <Mesh geo={dark} mat={m.sandstoneDark} />
      <Mesh geo={gold} mat={m.gold} />
    </group>
  )
}

/** Courtyard: marble floor + colonnaded cloisters either side. */
export function Courtyard({ m }: { m: Materials }) {
  const { marble, stone, gold } = useMemo(() => {
    const floor = boxUV(merge([place(new THREE.BoxGeometry(30, 0.2, 26), [0, 0.1, MANDALA_Z - 4])]), 3)
    const parts: Geo[] = []
    const g: Geo[] = []
    const col = column(5, 0.28)
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const z = MANDALA_Z + 10 - i * 3.4
        parts.push(place(col, [sx * 14, 0.2, z]))
        parts.push(place(col, [sx * 17.5, 0.2, z]))
      }
      parts.push(place(plinth(5.4, 24, 0.9), [sx * 15.75, 5.2, MANDALA_Z]))
      parts.push(place(steppedRoof(5, 3, 0.45), [sx * 15.75, 6.1, MANDALA_Z - 6]))
      parts.push(place(steppedRoof(5, 3, 0.45), [sx * 15.75, 6.1, MANDALA_Z + 6]))
      g.push(place(kalash(0.4), [sx * 15.75, 6.1 + 3 * 0.45, MANDALA_Z - 6]))
      g.push(place(kalash(0.4), [sx * 15.75, 6.1 + 3 * 0.45, MANDALA_Z + 6]))
    }
    return { marble: floor, stone: boxUV(merge(parts), 2.2), gold: merge(g) }
  }, [])
  return (
    <group>
      <Mesh geo={marble} mat={m.marble} />
      <Mesh geo={stone} mat={m.sandstone} />
      <Mesh geo={gold} mat={m.gold} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* City — instanced havelis with lit windows                           */
/* ------------------------------------------------------------------ */
export interface HouseSpot {
  x: number
  z: number
  w: number
  d: number
  h: number
  rot: number
}

export function cityLayout(count: number): HouseSpot[] {
  const r = rng(2024)
  const spots: HouseSpot[] = []
  let guard = 0
  while (spots.length < count && guard++ < count * 20) {
    const far = r() < 0.5
    const x = (r() < 0.5 ? -1 : 1) * (10 + r() * 110)
    const z = far ? FAR_BANK_Z - 12 - r() * 70 : NEAR_BANK_Z + 6 + r() * 50
    // Keep the gate road, temple compound and courtyard clear.
    if (!far && Math.abs(x) < 16 && z < GATE_Z + 6) continue
    if (!far && Math.abs(x) < 15) continue
    if (far && Math.abs(x) < 24 && z > TEMPLE_Z - 22) continue
    const w = 4 + r() * 5
    const d = 4 + r() * 5
    const h = 4 + r() * 7 + (far ? 2 : 0)
    if (spots.some((s) => Math.abs(s.x - x) < (s.w + w) / 2 + 0.6 && Math.abs(s.z - z) < (s.d + d) / 2 + 0.6)) continue
    spots.push({ x, z, w, d, h, rot: r() < 0.85 ? 0 : Math.PI / 2 })
  }
  return spots
}

export function City({ m, spots }: { m: Materials; spots: HouseSpot[] }) {
  const { body, parapet, windows, domes, winCount } = useMemo(() => {
    const o = new THREE.Object3D()
    const box = new THREE.BoxGeometry(1, 1, 1)
    // Box UVs scaled per instance are wrong for texturing — bake a "unit metre" mapping via shader-less approach:
    // we use box geometry and rely on the plaster texture's low frequency so stretching reads as weathering.
    const body = new THREE.InstancedMesh(box, m.plaster, spots.length)
    const parapet = new THREE.InstancedMesh(box, m.sandstoneDark, spots.length * 4)
    let pi = 0
    const winGeo = new THREE.PlaneGeometry(0.7, 1.1)
    const winList: THREE.Matrix4[] = []
    const r = rng(77)
    const domeGeo = dome(1, 1.4)
    const domeList: THREE.Matrix4[] = []
    spots.forEach((s, i) => {
      o.position.set(s.x, s.h / 2, s.z)
      o.rotation.set(0, s.rot, 0)
      o.scale.set(s.w, s.h, s.d)
      o.updateMatrix()
      body.setMatrixAt(i, o.matrix)
      o.rotation.set(0, 0, 0)
      // Roof parapet, mid-height chhajja (eave) and plinth course break up the box.
      for (const [y, hh, grow] of [[s.h + 0.3, 0.6, 0.4], [Math.min(3.1, s.h * 0.45), 0.22, 0.9], [0.3, 0.6, 0.3]] as const) {
        o.position.set(s.x, y, s.z)
        o.scale.set(s.w + grow, hh, s.d + grow)
        o.updateMatrix()
        parapet.setMatrixAt(pi++, o.matrix)
      }
      if (s.h > 7) {
        // Setback upper pavilion.
        o.position.set(s.x, s.h + 1.6, s.z)
        o.scale.set(s.w * 0.5, 2.6, s.d * 0.5)
        o.updateMatrix()
        parapet.setMatrixAt(pi++, o.matrix)
      }
      // Windows on the face toward the river / road.
      const faceZ = s.z > 0 ? -1 : 1
      const floors = Math.floor(s.h / 3)
      const cols = Math.floor(s.w / 1.8)
      for (let f = 0; f < floors; f++)
        for (let c = 0; c < cols; c++) {
          if (r() < 0.35) continue
          const wx = s.x - s.w / 2 + (c + 0.5) * (s.w / cols)
          const wy = 1.6 + f * 3
          const mtx = new THREE.Matrix4().compose(
            new THREE.Vector3(wx, wy, s.z + faceZ * (s.d / 2 + 0.02)),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, faceZ < 0 ? Math.PI : 0, 0)),
            new THREE.Vector3(1, 1, 1),
          )
          winList.push(mtx)
        }
      if (r() < 0.22) {
        domeList.push(new THREE.Matrix4().compose(new THREE.Vector3(s.x, s.h + 0.6, s.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(Math.min(s.w, s.d) * 0.28)))
      }
    })
    const windows = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color: '#ff9f43', toneMapped: false }), winList.length)
    winList.forEach((mx, i) => {
      windows.setMatrixAt(i, mx)
      const c = new THREE.Color().setHSL(0.07 + r() * 0.03, 1, 0.45 + r() * 0.2)
      windows.setColorAt(i, c)
    })
    const domes = new THREE.InstancedMesh(domeGeo, m.sandstone, domeList.length)
    domeList.forEach((mx, i) => domes.setMatrixAt(i, mx))
    parapet.count = pi
    for (const im of [body, parapet, windows, domes]) {
      im.instanceMatrix.needsUpdate = true
      im.frustumCulled = false
    }
    return { body, parapet, windows, domes, winCount: winList.length }
  }, [m, spots])

  // Windows light up with the diya wave.
  useFrame(() => {
    const k = smooth(ACT.diyaWave, ACT.diyaWave + 3.5, journey.t)
    const mat = windows.material as THREE.MeshBasicMaterial
    mat.color.setScalar(0.12 + 0.88 * k)
  })
  void winCount

  return (
    <group>
      <primitive object={body} />
      <primitive object={parapet} />
      <primitive object={windows} />
      <primitive object={domes} />
    </group>
  )
}
