import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { PerfTier } from '../lib/performance'
import { useMaterials } from './materials'
import {
  City,
  Courtyard,
  DIYA_Z,
  FAR_BANK_Z,
  GATE_Z,
  Gateway,
  Ground,
  RoadArcades,
  MANDALA_Z,
  NEAR_BANK_Z,
  RIVER_Y,
  STEP_COUNT,
  STEP_RISE,
  STEP_RUN,
  TEMPLE_SCALE,
  TEMPLE_Z,
  Temple,
  cityLayout,
} from './Architecture'
import { BrassLanterns, Diyas, HeroDiya, type DiyaField } from './Lights'
import { FogSheets, LightShaft, River, Sky } from './Atmosphere'
import { Dust, Fireworks, GatherParticles, Mandala, Petals, SkyLanterns, type FireworksHandle } from './Effects'
import { ACT, CAMERA_KEYS, journey, smooth } from './timeline'
import { rng } from './kit'

export const TIER_BUDGET: Record<PerfTier, { diyaScale: number; houses: number; lanterns: number; petals: number; gather: number; bursts: number; fwParticles: number; reflect: boolean; lights: number }> = {
  high: { diyaScale: 1, houses: 260, lanterns: 140, petals: 700, gather: 2400, bursts: 7, fwParticles: 150, reflect: true, lights: 8 },
  medium: { diyaScale: 0.55, houses: 150, lanterns: 70, petals: 320, gather: 1200, bursts: 5, fwParticles: 100, reflect: false, lights: 4 },
  low: { diyaScale: 0.3, houses: 80, lanterns: 36, petals: 160, gather: 600, bursts: 3, fwParticles: 70, reflect: false, lights: 2 },
}

/* ------------------------------------------------------------------ */
/* Diya placement + ignition schedule                                  */
/* ------------------------------------------------------------------ */
function buildFields(scale: number, houses: ReturnType<typeof cityLayout>) {
  const road: number[] = [], roadIg: number[] = []
  // Light spreads outward from the first diya once the journey begins.
  for (let z = 44; z <= 86; z += 0.7) {
    for (const x of [-5.4, 5.4]) {
      road.push(x, 0.76, z)
      roadIg.push(0.7 + Math.abs(z - DIYA_Z) * 0.07)
    }
  }
  // Gate plinth row
  for (let x = -12; x <= 12; x += 0.55) {
    if (Math.abs(x) < 3.6) continue
    road.push(x, 1.27, GATE_Z + 2.6)
    roadIg.push(2.2 + Math.abs(x) * 0.05)
  }
  // Arcade tops
  for (let z = GATE_Z + 6; z <= GATE_Z + 40; z += 0.8) {
    for (const x of [-9, 9]) {
      road.push(x, 7.27, z)
      roadIg.push(1.6 + Math.abs(z - DIYA_Z) * 0.06)
    }
  }

  const ghat: number[] = [], ghatIg: number[] = []
  const spacing = 0.42 / Math.max(scale, 0.25)
  for (let i = 0; i < STEP_COUNT; i++) {
    const y = -i * STEP_RISE + 0.07
    for (let x = -120; x <= 120; x += spacing) {
      const jitter = ((x * 13.7 + i * 3.1) % 1) * 0.06
      ghat.push(x + jitter, y, NEAR_BANK_Z - i * STEP_RUN - 0.85)
      ghatIg.push(ACT.diyaWave + (Math.abs(x) / 120) * 3.4 + (STEP_COUNT - i) * 0.05)
      ghat.push(x - jitter, y, FAR_BANK_Z - 8 + i * STEP_RUN + 0.85)
      ghatIg.push(ACT.diyaWave + 0.7 + (Math.abs(x) / 120) * 3.4 + (STEP_COUNT - i) * 0.05)
    }
  }

  const river: number[] = [], riverIg: number[] = []
  const r = rng(99)
  const nRiver = Math.floor(500 * scale)
  for (let i = 0; i < nRiver; i++) {
    const x = (r() - 0.5) * 140
    river.push(x, RIVER_Y + 0.06, NEAR_BANK_Z - 9 - r() * 22)
    riverIg.push(ACT.diyaWave + 0.4 + (Math.abs(x) / 70) * 3 + r() * 0.6)
  }

  const city: number[] = [], cityIg: number[] = []
  houses.forEach((h) => {
    const n = Math.max(2, Math.floor((h.w / 0.6) * scale))
    const faceZ = h.z > 0 ? -1 : 1
    for (let k = 0; k < n; k++) {
      const x = h.x - h.w / 2 + ((k + 0.5) / n) * h.w
      city.push(x, h.h + 0.68, h.z + faceZ * (h.d / 2 + 0.15))
      cityIg.push(ACT.diyaWave + 0.8 + (Math.abs(x) / 120) * 3.4 + Math.abs(h.z) * 0.01)
    }
  })

  const temple: number[] = [], templeIg: number[] = []
  const tz = TEMPLE_Z
  const jw = 26 * TEMPLE_SCALE, jd = 34 * TEMPLE_SCALE, jh = 2.2 * TEMPLE_SCALE
  const tStep = 0.5 / Math.max(scale, 0.3)
  for (let x = -jw / 2; x <= jw / 2; x += tStep) {
    temple.push(x, jh + 0.05, tz + jd / 2 - 0.2)
    templeIg.push(ACT.courtyard - 1 + Math.abs(x) * 0.05)
  }
  for (let z = tz - jd / 2; z <= tz + jd / 2; z += tStep) {
    for (const x of [-jw / 2 + 0.2, jw / 2 - 0.2]) {
      temple.push(x, jh + 0.05, z)
      templeIg.push(ACT.courtyard - 0.5 + (tz + jd / 2 - z) * 0.04)
    }
  }
  // Courtyard: rings around the mandala.
  for (const [rad, n] of [[7.4, 72], [8.4, 84]] as const) {
    for (let i = 0; i < n * Math.max(scale, 0.5); i++) {
      const a = (i / (n * Math.max(scale, 0.5))) * Math.PI * 2
      temple.push(Math.cos(a) * rad, 0.34, MANDALA_Z + Math.sin(a) * rad)
      templeIg.push(ACT.mandala + 0.6 + (a / (Math.PI * 2)) * 1.4)
    }
  }

  const f = (p: number[], ig: number[]): DiyaField => ({ positions: new Float32Array(p), ignite: new Float32Array(ig) })
  return { road: f(road, roadIg), ghat: f(ghat, ghatIg), river: f(river, riverIg), city: f(city, cityIg), temple: f(temple, templeIg) }
}

/* ------------------------------------------------------------------ */
/* Camera director                                                     */
/* ------------------------------------------------------------------ */
const KEYS = [
  CAMERA_KEYS[0],
  { t: 1.1, pos: [0.24, 1.12, 62.44] as [number, number, number], target: [0.08, 1.07, 62] as [number, number, number] },
  ...CAMERA_KEYS.slice(1),
]

/** Act 1 darkness: world lights rise from near-black as the first light spreads. */
function Dimmer({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const k = journey.started ? smooth(0.6, 3.4, journey.t) : 0
    group.current?.traverse((o) => {
      const l = o as THREE.Light
      if (!l.isLight) return
      if (l.userData.base === undefined) l.userData.base = l.intensity
      l.intensity = l.userData.base * (0.06 + 0.94 * k)
    })
  })
  return <group ref={group}>{children}</group>
}

function CameraDirector() {
  const camera = useThree((s) => s.camera)
  const curves = useMemo(
    () => ({
      pos: new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal', 0.5),
      target: new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.target)), false, 'centripetal', 0.5),
    }),
    [],
  )
  const p = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const par = useRef(new THREE.Vector2())

  useFrame((s, delta) => {
    const t = journey.started ? journey.t : 0
    let i = 0
    while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++
    const a = KEYS[i], b = KEYS[i + 1]
    let local = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1)
    // Ease in on the first move and ease out on arrival.
    if (i === 0) local = local * local * (3 - 2 * local)
    if (i === KEYS.length - 2) local = 1 - Math.pow(1 - local, 2.2)
    const u = (i + local) / (KEYS.length - 1)
    curves.pos.getPoint(u, p)
    curves.target.getPoint(u, look)
    const time = s.clock.elapsedTime
    if (!journey.started) {
      // Act 1 idle: slow breathing orbit around the flame.
      p.x += Math.sin(time * 0.35) * 0.06
      p.y += Math.sin(time * 0.5) * 0.015
    }
    const settle = smooth(ACT.reveal - 1, ACT.reveal + 1, t)
    par.current.lerp(s.pointer, 1 - Math.exp(-delta * 1.5))
    p.x += (Math.sin(time * 0.2) * 0.3 + par.current.x * 0.9) * settle
    p.y += (Math.sin(time * 0.27) * 0.12 + par.current.y * 0.35) * settle
    camera.position.copy(p)
    camera.lookAt(look)
  })
  return null
}

// Stable references (props feed useMemo deps).
const DUST_DIYA: [number, number, number] = [0, 1.4, DIYA_Z]
const DUST_DIYA_SIZE: [number, number, number] = [2.4, 1.4, 2.4]
const DUST_COURT: [number, number, number] = [0, 6, MANDALA_Z - 6]
const DUST_COURT_SIZE: [number, number, number] = [50, 14, 50]
const FOG_AREA = { center: [0, RIVER_Y + 1.6, 0] as [number, number, number], size: [120, 30] as [number, number] }

/* ------------------------------------------------------------------ */
/* Scene root                                                          */
/* ------------------------------------------------------------------ */
export interface DivineReturnProps {
  tier: PerfTier
  fireworks: React.RefObject<FireworksHandle | null>
}

export default function DivineReturn({ tier, fireworks }: DivineReturnProps) {
  const m = useMaterials()
  const b = TIER_BUDGET[tier]
  const houses = useMemo(() => cityLayout(b.houses), [b.houses])
  const fields = useMemo(() => buildFields(b.diyaScale, houses), [b.diyaScale, houses])
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#1a0d1c', 0.0105)
    return () => {
      scene.fog = null
    }
  }, [scene])

  const lanternSpots = useMemo<[number, number, number][]>(
    () => [
      [-4.6, 9.2, GATE_Z + 2.4],
      [4.6, 9.2, GATE_Z + 2.4],
      [-14, 4.9, MANDALA_Z + 6],
      [14, 4.9, MANDALA_Z + 6],
      [-14, 4.9, MANDALA_Z - 4],
      [14, 4.9, MANDALA_Z - 4],
    ],
    [],
  )

  return (
    <>
      <Sky />
      <Stars radius={260} depth={60} count={tier === 'low' ? 1500 : 4000} factor={6} saturation={0.15} fade speed={0.3} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ff9a3c" position={[0, -2, 6]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffcf8a" position={[-6, 4, -4]} scale={[6, 6, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#6a7bd6" position={[4, 8, -6]} scale={4} />
      </Environment>

      <Dimmer>
      <ambientLight intensity={0.12} color="#4a4a8a" />
      <hemisphereLight args={['#3c4378', '#3a1a0c', 0.55]} />
      <directionalLight position={[-60, 60, -110]} intensity={0.55} color="#aab8ff" />
      {/* Warm key lights placed where lamps cluster. */}
      <pointLight position={[0, 6, GATE_Z + 5]} intensity={70} distance={26} decay={1.6} color="#ff9a3c" />
      <pointLight position={[0, 3, NEAR_BANK_Z - 3]} intensity={90} distance={40} decay={1.4} color="#ff8a2a" />
      {b.lights >= 4 && <pointLight position={[0, 3, FAR_BANK_Z - 4]} intensity={90} distance={40} decay={1.4} color="#ff8a2a" />}
      {b.lights >= 4 && <pointLight position={[0, 6, MANDALA_Z]} intensity={80} distance={30} decay={1.5} color="#ffb04a" />}
      {b.lights >= 2 && <pointLight position={[0, 9, TEMPLE_Z + 18]} intensity={120} distance={38} decay={1.4} color="#ffa040" />}
      {b.lights >= 8 && (
        <>
          <pointLight position={[-40, 3, NEAR_BANK_Z - 3]} intensity={60} distance={34} decay={1.5} color="#ff8a2a" />
          <pointLight position={[40, 3, NEAR_BANK_Z - 3]} intensity={60} distance={34} decay={1.5} color="#ff8a2a" />
          <pointLight position={[0, 1.5, 66]} intensity={10} distance={14} decay={1.6} color="#ff9a3c" />
        </>
      )}

      <BrassLanterns spots={tier === 'low' ? lanternSpots.slice(0, 2) : lanternSpots} height={1.1} />
      </Dimmer>

      <CameraDirector />

      <Ground m={m} />
      <Gateway m={m} />
      <RoadArcades m={m} />
      <City m={m} spots={houses} />
      <Courtyard m={m} />
      <Temple m={m} position={[0, 0, TEMPLE_Z]} scale={TEMPLE_SCALE} />
      <Temple m={m} position={[-24, 0, TEMPLE_Z + 4]} scale={0.95} major={false} />
      <Temple m={m} position={[24, 0, TEMPLE_Z + 4]} scale={0.95} major={false} />

      <HeroDiya m={m} position={[0, 0.98, DIYA_Z]} />
      <Diyas field={fields.road} m={m} size={1.1} />
      <Diyas field={fields.ghat} m={m} size={1.6} reflectY={b.reflect ? undefined : RIVER_Y} />
      <Diyas field={fields.river} m={m} size={1.7} reflectY={b.reflect ? undefined : RIVER_Y} />
      <Diyas field={fields.city} m={m} size={1.3} />
      <Diyas field={fields.temple} m={m} size={2} />

      <River y={RIVER_Y} z0={NEAR_BANK_Z - 8} z1={FAR_BANK_Z} reflect={b.reflect} />

      <Mandala position={[0, 0.22, MANDALA_Z]} radius={6.8} />
      <GatherParticles center={[0, 0.2, MANDALA_Z]} radius={6.8} count={b.gather} />
      <SkyLanterns count={b.lanterns} origin={{ x: [-60, 60], z: [FAR_BANK_Z - 6, NEAR_BANK_Z - 4], y: RIVER_Y + 1.2 }} />

      {tier !== 'low' && <FogSheets count={tier === 'high' ? 12 : 6} area={FOG_AREA} />}
      <LightShaft position={[0, 6.6, GATE_Z - 6]} rotation={[Math.PI / 2.15, 0, 0]} radius={4.2} length={16} intensity={0.28} activeFrom={ACT.doorsOpen + 0.6} />
      <LightShaft position={[0, 16, MANDALA_Z]} radius={7.5} length={30} intensity={0.16} activeFrom={ACT.mandala} />

      <Dust count={tier === 'low' ? 50 : 160} center={DUST_DIYA} size={DUST_DIYA_SIZE} scale={0.25} />
      <Dust count={tier === 'low' ? 80 : 260} center={DUST_COURT} size={DUST_COURT_SIZE} scale={1.6} />

      <Fireworks
        ref={fireworks}
        bursts={b.bursts}
        particles={b.fwParticles}
        palette={['#ffb347', '#ff6f91', '#ffe3a3', '#7fd1ff', '#c58bff', '#ff4d4d']}
        launchArea={{ x: [-45, 45], y: 0, z: [-72, -95] }}
        burstHeight={[24, 38]}
        interval={0.85}
        activeFrom={ACT.lanterns + 1.5}
        scale={2.6}
      />
      <Petals count={b.petals} center={[0, 18, -24]} spread={[22, 16]} />
    </>
  )
}
