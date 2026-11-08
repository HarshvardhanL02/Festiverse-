import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ACT, journey, smooth } from './timeline'
import { rng } from './kit'

/* ------------------------------------------------------------------ */
/* Sky lanterns (akash kandil) released from the ghats in Act 3         */
/* ------------------------------------------------------------------ */
export function SkyLanterns({ count, origin }: { count: number; origin: { x: [number, number]; z: [number, number]; y: number } }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const mesh = useMemo(() => {
    // Tapered paper lantern, open at the bottom.
    const g = new THREE.LatheGeometry(
      [[0.26, 0], [0.32, 0.12], [0.36, 0.42], [0.34, 0.66], [0.26, 0.82], [0.0, 0.86]].map(([r, y]) => new THREE.Vector2(r, y)),
      14,
    )
    const r = rng(31)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = origin.x[0] + r() * (origin.x[1] - origin.x[0])
      seeds[i * 4 + 1] = origin.z[0] + r() * (origin.z[1] - origin.z[0])
      seeds[i * 4 + 2] = r() * 4.5 // release delay
      seeds[i * 4 + 3] = r()
    }
    const ig = new THREE.InstancedBufferGeometry().copy(g as unknown as THREE.InstancedBufferGeometry)
    ig.instanceCount = count
    ig.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    return ig
  }, [count, origin])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uJourney: { value: 0 }, uStart: { value: ACT.lanterns }, uBaseY: { value: origin.y } }), [origin.y])
  useFrame((s) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = s.clock.elapsedTime
    mat.current.uniforms.uJourney.value = journey.t
  })
  return (
    <mesh geometry={mesh} frustumCulled={false} renderOrder={6}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        vertexShader={`
          uniform float uTime; uniform float uJourney; uniform float uStart; uniform float uBaseY;
          attribute vec4 aSeed; varying float vY; varying float vAlive; varying float vFlick;
          void main(){
            float t = uJourney - uStart - aSeed.z;
            float alive = step(0.0, t);
            t = max(t, 0.0);
            // Accelerating rise with lazy drift.
            float rise = t * (1.4 + aSeed.w * 0.9) + t * t * 0.08;
            vec3 base = vec3(aSeed.x + sin(t * 0.4 + aSeed.w * 9.0) * 1.6 + t * 0.35, uBaseY + rise, aSeed.y - t * 0.6);
            float s = 0.9 + aSeed.w * 0.6;
            vec3 p = position * s;
            float sway = sin(uTime * 0.8 + aSeed.w * 20.0) * 0.08;
            p.x += p.y * sway;
            vY = position.y / 0.86;
            vAlive = alive * smoothstep(0.0, 0.6, t);
            vFlick = 0.85 + 0.15 * sin(uTime * 9.0 + aSeed.w * 50.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(base + p, 1.0);
          }`}
        fragmentShader={`
          varying float vY; varying float vAlive; varying float vFlick;
          void main(){
            // Paper glows brightest near the flame at the open bottom.
            vec3 hot = vec3(1.0, 0.62, 0.26);
            vec3 paper = vec3(0.9, 0.3, 0.06);
            vec3 c = mix(hot * 1.3, paper * 0.6, smoothstep(0.0, 0.9, vY)) * vFlick;
            float a = vAlive * mix(0.95, 0.75, vY);
            if (a < 0.01) discard;
            gl_FragColor = vec4(c, a);
          }`}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Courtyard mandala + golden particles that gather into it (Act 4)    */
/* ------------------------------------------------------------------ */
export function Mandala({ position, radius }: { position: [number, number, number]; radius: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uP: { value: 0 } }), [])
  useFrame((s) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = s.clock.elapsedTime
    mat.current.uniforms.uP.value = smooth(ACT.mandala, ACT.reveal, journey.t)
  })
  return (
    <mesh position={position} rotation-x={-Math.PI / 2} renderOrder={4}>
      <circleGeometry args={[radius, 128]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`
          uniform float uTime; uniform float uP; varying vec2 vUv;
          float line(float d, float w){ return smoothstep(w, 0.0, abs(d)); }
          void main(){
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            float a = atan(p.y, p.x);
            // Reveal ring sweeps outward with progress.
            float reveal = smoothstep(uP * 1.15, uP * 1.15 - 0.12, r);
            float g = 0.0;
            g += line(r - 0.08, 0.006) + line(r - 0.16, 0.004);
            float petal8 = 0.16 + 0.16 * pow(abs(cos(a * 4.0)), 0.6);
            g += line(r - petal8, 0.006) * step(r, 0.34);
            g += line(r - 0.34, 0.004) + line(r - 0.36, 0.003);
            float petal16 = 0.36 + 0.12 * pow(abs(cos(a * 8.0)), 0.8);
            g += line(r - petal16, 0.005) * step(0.35, r);
            g += line(r - 0.5, 0.004);
            float dots = smoothstep(0.012, 0.0, length(vec2(fract(a / 6.2831 * 48.0) - 0.5, (r - 0.55) * 30.0)) - 0.25);
            g += dots;
            float petal24 = 0.6 + 0.14 * pow(abs(sin(a * 12.0)), 1.4);
            g += line(r - petal24, 0.004) * step(0.58, r);
            g += line(r - 0.78, 0.004) + line(r - 0.8, 0.002);
            float rays = line(sin(a * 32.0) * r, 0.006) * step(0.8, r) * step(r, 0.95);
            g += rays * 0.6;
            g += line(r - 0.96, 0.006);
            float shimmer = 0.75 + 0.25 * sin(uTime * 2.0 - r * 18.0 + a * 2.0);
            vec3 gold = vec3(1.0, 0.72, 0.28);
            float fill = smoothstep(0.5, 0.0, r) * 0.05;
            float alpha = clamp(g, 0.0, 1.0) * reveal;
            gl_FragColor = vec4(gold * (alpha * 2.4 * shimmer + fill * reveal), 1.0);
          }`}
      />
    </mesh>
  )
}

export function GatherParticles({ center, radius, count }: { center: [number, number, number]; radius: number; count: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(() => {
    const r = rng(5)
    const start = new Float32Array(count * 3)
    const end = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const rings = [0.16, 0.34, 0.5, 0.62, 0.8, 0.96]
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2
      const d = 6 + r() * 26
      start[i * 3] = center[0] + Math.cos(a) * d
      start[i * 3 + 1] = center[1] + 1 + r() * 14
      start[i * 3 + 2] = center[2] + Math.sin(a) * d
      const ring = rings[i % rings.length] * radius
      const b = r() * Math.PI * 2
      end[i * 3] = center[0] + Math.cos(b) * ring
      end[i * 3 + 1] = center[1] + 0.12
      end[i * 3 + 2] = center[2] + Math.sin(b) * ring
      seed[i] = r()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(start, 3))
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [center, radius, count])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uP: { value: 0 }, uRise: { value: 0 }, uFade: { value: 0 }, uPixelRatio: { value: 1 } }), [])
  useFrame((s) => {
    const u = mat.current?.uniforms
    if (!u) return
    u.uTime.value = s.clock.elapsedTime
    u.uP.value = smooth(ACT.gather, ACT.reveal - 0.4, journey.t)
    u.uRise.value = smooth(ACT.reveal - 0.4, ACT.reveal + 1.6, journey.t)
    u.uFade.value = smooth(ACT.gather - 0.6, ACT.gather + 0.4, journey.t) * (1 - smooth(ACT.reveal + 0.2, ACT.reveal + 1.6, journey.t))
    u.uPixelRatio.value = s.gl.getPixelRatio()
  })
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={7}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          uniform float uTime; uniform float uP; uniform float uRise; uniform float uPixelRatio;
          attribute vec3 aEnd; attribute float aSeed; varying float vTw;
          void main(){
            float p = clamp(uP * 1.25 - aSeed * 0.25, 0.0, 1.0);
            p = p * p * (3.0 - 2.0 * p);
            vec3 swirl = vec3(sin(uTime * 1.3 + aSeed * 30.0), cos(uTime * 1.1 + aSeed * 20.0) * 0.6, cos(uTime * 1.3 + aSeed * 30.0)) * (1.0 - p) * 1.4;
            vec3 pos = mix(position, aEnd, p) + swirl;
            // On reveal, the gathered light lifts upward toward the greeting.
            pos.y += uRise * (2.0 + aSeed * 9.0);
            pos.xz = mix(pos.xz, pos.xz * 0.6 + aEnd.xz * 0.4, uRise);
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            vTw = 0.6 + 0.4 * sin(uTime * 6.0 + aSeed * 80.0);
            gl_PointSize = (0.8 + aSeed * 1.3) * uPixelRatio * (60.0 / max(-mv.z, 0.5));
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform float uFade; varying float vTw;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = exp(-d * d * 28.0) * uFade * vTw;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vec3(1.0, 0.78, 0.38) * 2.2, a);
          }`}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/* Fireworks: rocket ascent + layered bursts with trailing sparks       */
/* ------------------------------------------------------------------ */
export interface FireworksHandle {
  launch: (target?: THREE.Vector3) => void
}

const RISE = 1.25
const LIFE = 3.4
const TRAIL = 6

const fwVertex = /* glsl */ `
  uniform float uTime; uniform float uPixelRatio; uniform float uScale;
  attribute vec3 aLaunch; attribute vec3 aBurst; attribute vec3 aVel; attribute vec3 aColor;
  attribute float aStart; attribute float aTrail; attribute float aSeed; attribute float aType;
  varying vec3 vColor; varying float vAlpha;
  void main(){
    float age = uTime - aStart - aTrail * 0.028;
    float trailFade = 1.0 - aTrail / ${TRAIL.toFixed(1)};
    vec3 pos; float size; float alpha;
    if (age < 0.0) { gl_Position = vec4(2.0); gl_PointSize = 0.0; vAlpha = 0.0; return; }
    if (age < ${RISE.toFixed(2)}) {
      // Ascent: only the lead particles of each burst form the rocket and its sparks.
      if (aSeed > 0.04) { gl_Position = vec4(2.0); gl_PointSize = 0.0; vAlpha = 0.0; return; }
      float k = age / ${RISE.toFixed(2)};
      float e = 1.0 - pow(1.0 - k, 2.2);
      pos = mix(aLaunch, aBurst, e);
      pos.x += sin(age * 14.0 + aSeed * 90.0) * 0.06 * aTrail;
      size = 2.4 * trailFade;
      alpha = trailFade * 0.9;
      vColor = vec3(1.0, 0.72, 0.4);
    } else {
      float b = age - ${RISE.toFixed(2)};
      if (b > ${LIFE.toFixed(1)}) { gl_Position = vec4(2.0); gl_PointSize = 0.0; vAlpha = 0.0; return; }
      float life = 1.0 - b / ${LIFE.toFixed(1)};
      // Type 0 peony, 1 willow (slow, droops, gold), 2 crackle (twinkles).
      float drag = aType > 0.5 && aType < 1.5 ? 0.9 : 1.9;
      float grav = aType > 0.5 && aType < 1.5 ? 1.25 : 0.7;
      vec3 disp = aVel * uScale * (1.0 - exp(-drag * b)) / drag;
      disp.y -= grav * uScale * b * b * 0.5;
      pos = aBurst + disp;
      float tw = aType > 1.5 ? step(0.45, fract(sin(aSeed * 91.7 + floor(uTime * 22.0)) * 43758.5)) : 1.0;
      tw = life < 0.55 ? tw : 1.0;
      size = (1.2 + 2.6 * life) * trailFade;
      alpha = pow(life, 1.3) * trailFade * tw;
      // White-hot ignition -> base colour -> ember red.
      vec3 c = mix(vec3(1.0, 0.95, 0.82), aColor, smoothstep(0.0, 0.25, b));
      vColor = mix(vec3(1.0, 0.3, 0.08), c, smoothstep(0.0, 0.4, life));
    }
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * uScale * uPixelRatio * (34.0 / max(-mv.z, 0.5));
    gl_Position = projectionMatrix * mv;
  }
`
const fwFragment = /* glsl */ `
  varying vec3 vColor; varying float vAlpha;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float core = exp(-d * d * 60.0);
    float glow = exp(-d * d * 12.0) * 0.45;
    float a = (core + glow) * vAlpha;
    if (a < 0.005) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0, 0.97, 0.9), core * 0.5) * 2.0, a);
  }
`

interface FireworksProps {
  bursts: number
  particles: number
  palette: string[]
  launchArea: { x: [number, number]; y: number; z: [number, number] }
  burstHeight: [number, number]
  /** Seconds between automatic launches once `activeFrom` is reached. */
  interval: number
  activeFrom: number
  scale?: number
}

export const Fireworks = forwardRef<FireworksHandle, FireworksProps>(function Fireworks(
  { bursts, particles, palette, launchArea, burstHeight, interval, activeFrom, scale = 1 },
  ref,
) {
  const total = bursts * particles * TRAIL
  const mat = useRef<THREE.ShaderMaterial>(null)
  const state = useRef({ slot: 0, timer: 0, now: 0 })
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const attr = (n: number, size: number, fill = 0) => new THREE.BufferAttribute(new Float32Array(n * size).fill(fill), size)
    g.setAttribute('position', attr(total, 3))
    g.setAttribute('aLaunch', attr(total, 3))
    g.setAttribute('aBurst', attr(total, 3))
    g.setAttribute('aVel', attr(total, 3))
    g.setAttribute('aColor', attr(total, 3))
    g.setAttribute('aStart', attr(total, 1, -1000))
    g.setAttribute('aType', attr(total, 1))
    const trail = new Float32Array(total)
    const seed = new Float32Array(total)
    for (let i = 0; i < total; i++) {
      trail[i] = i % TRAIL
      seed[i] = Math.floor(i / TRAIL) % particles === 0 ? 0 : Math.random()
    }
    // The first particle of each burst is always a rocket lead.
    g.setAttribute('aTrail', new THREE.BufferAttribute(trail, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [total, particles])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uScale: { value: scale } }), [scale])
  const tmp = useMemo(() => new THREE.Color(), [])

  const launch = (target?: THREE.Vector3) => {
    const s = state.current
    const slot = s.slot
    s.slot = (s.slot + 1) % bursts
    const lx = launchArea.x[0] + Math.random() * (launchArea.x[1] - launchArea.x[0])
    const lz = launchArea.z[0] + Math.random() * (launchArea.z[1] - launchArea.z[0])
    const burst = target ?? new THREE.Vector3(lx + (Math.random() - 0.5) * 6, burstHeight[0] + Math.random() * (burstHeight[1] - burstHeight[0]), lz + (Math.random() - 0.5) * 4)
    const launchP = target ? new THREE.Vector3(target.x * 0.8, launchArea.y, target.z + 4) : new THREE.Vector3(lx, launchArea.y, lz)
    const type = Math.random() < 0.35 ? 1 : Math.random() < 0.5 ? 2 : 0
    const c1 = type === 1 ? '#ffc86b' : palette[Math.floor(Math.random() * palette.length)]
    const c2 = palette[Math.floor(Math.random() * palette.length)]
    const speed = type === 1 ? 3.2 : 4.4
    const a = geo.attributes
    for (let i = 0; i < particles; i++) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const rr = Math.sqrt(1 - u * u)
      const sp = speed * (0.82 + Math.random() * 0.18)
      const vx = rr * Math.cos(th) * sp, vy = u * sp, vz = rr * Math.sin(th) * sp
      tmp.set(i % 3 === 0 ? c2 : c1)
      for (let k = 0; k < TRAIL; k++) {
        const idx = (slot * particles + i) * TRAIL + k
        ;(a.aLaunch as THREE.BufferAttribute).setXYZ(idx, launchP.x, launchP.y, launchP.z)
        ;(a.aBurst as THREE.BufferAttribute).setXYZ(idx, burst.x, burst.y, burst.z)
        ;(a.aVel as THREE.BufferAttribute).setXYZ(idx, vx, vy, vz)
        ;(a.aColor as THREE.BufferAttribute).setXYZ(idx, tmp.r, tmp.g, tmp.b)
        ;(a.aStart as THREE.BufferAttribute).setX(idx, s.now)
        ;(a.aType as THREE.BufferAttribute).setX(idx, type)
      }
    }
    for (const n of ['aLaunch', 'aBurst', 'aVel', 'aColor', 'aStart', 'aType']) (a[n] as THREE.BufferAttribute).needsUpdate = true
  }

  useImperativeHandle(ref, () => ({ launch }))

  useFrame((st, delta) => {
    const s = state.current
    s.now = st.clock.elapsedTime
    const u = mat.current?.uniforms
    if (u) {
      u.uTime.value = s.now
      u.uPixelRatio.value = st.gl.getPixelRatio()
    }
    if (journey.started && journey.t >= activeFrom) {
      s.timer -= delta
      if (s.timer <= 0) {
        s.timer = interval * (journey.t < ACT.finale ? 2.6 : 1) * (0.55 + Math.random() * 0.9)
        launch()
      }
    }
  })

  return (
    <points geometry={geo} frustumCulled={false} renderOrder={10}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={fwVertex}
        fragmentShader={fwFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
})

/* ------------------------------------------------------------------ */
/* Falling marigold & rose petals for the finale                        */
/* ------------------------------------------------------------------ */
export function Petals({ count, center, spread }: { count: number; center: [number, number, number]; spread: [number, number] }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(() => {
    // Curved petal.
    const g = new THREE.PlaneGeometry(0.12, 0.18, 2, 3)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i)
      p.setZ(i, x * x * 6 + y * y * 1.5)
      p.setX(i, x * (1 - Math.abs(y) * 2.5))
    }
    g.computeVertexNormals()
    const ig = new THREE.InstancedBufferGeometry().copy(g as unknown as THREE.InstancedBufferGeometry)
    ig.instanceCount = count
    const r = rng(11)
    const seeds = new Float32Array(count * 4)
    const colors = new Float32Array(count * 3)
    const palette = [new THREE.Color('#ff8a00'), new THREE.Color('#ffb300'), new THREE.Color('#d81b3c'), new THREE.Color('#ff5a1f')]
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = center[0] + (r() - 0.5) * spread[0]
      seeds[i * 4 + 1] = center[2] + (r() - 0.5) * spread[1]
      seeds[i * 4 + 2] = r() * 9
      seeds[i * 4 + 3] = r()
      const c = palette[i % palette.length]
      colors.set([c.r, c.g, c.b], i * 3)
    }
    ig.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    ig.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3))
    return ig
  }, [count, center, spread])
  const uniforms = useMemo(() => ({ uJourney: { value: 0 }, uStart: { value: ACT.finale }, uTop: { value: center[1] } }), [center])
  useFrame(() => {
    if (mat.current) mat.current.uniforms.uJourney.value = journey.t
  })
  return (
    <mesh geometry={geo} frustumCulled={false} renderOrder={11}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        vertexShader={`
          uniform float uJourney; uniform float uStart; uniform float uTop;
          attribute vec4 aSeed; attribute vec3 aColor; varying vec3 vColor; varying float vShade; varying float vA;
          mat3 rot(vec3 a){
            float cx=cos(a.x), sx=sin(a.x), cy=cos(a.y), sy=sin(a.y), cz=cos(a.z), sz=sin(a.z);
            return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy);
          }
          void main(){
            float t = uJourney - uStart - aSeed.z * 0.6;
            vA = step(0.0, t);
            float fall = mod(max(t, 0.0) * (0.9 + aSeed.w * 0.6) + aSeed.z, 14.0);
            vec3 base = vec3(aSeed.x + sin(t * 0.9 + aSeed.w * 30.0) * 0.8, uTop - fall, aSeed.y + cos(t * 0.7 + aSeed.w * 20.0) * 0.6);
            mat3 R = rot(vec3(t * (1.5 + aSeed.w * 2.0), t * 1.1 + aSeed.w * 6.0, t * 0.7));
            vec3 n = R * normal;
            vShade = 0.55 + 0.45 * abs(n.y);
            vColor = aColor;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(base + R * position, 1.0);
          }`}
        fragmentShader={`
          varying vec3 vColor; varying float vShade; varying float vA;
          void main(){ if (vA < 0.5) discard; gl_FragColor = vec4(vColor * vShade * 0.9, 1.0); }`}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Golden dust motes (replaces drei Sparkles, whose negative alpha      */
/* produced square halos in the HDR bloom buffer)                       */
/* ------------------------------------------------------------------ */
export function Dust({ count, center, size, scale = 1 }: { count: number; center: [number, number, number]; size: [number, number, number]; scale?: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(() => {
    const r = rng(count * 7 + 3)
    const p = new Float32Array(count * 3)
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      p[i * 3] = center[0] + (r() - 0.5) * size[0]
      p[i * 3 + 1] = center[1] + (r() - 0.5) * size[1]
      p[i * 3 + 2] = center[2] + (r() - 0.5) * size[2]
      s[i] = r()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1))
    return g
  }, [count, center, size])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uScale: { value: scale } }), [scale])
  useFrame((s) => {
    const u = mat.current?.uniforms
    if (!u) return
    u.uTime.value = s.clock.elapsedTime
    u.uPixelRatio.value = s.gl.getPixelRatio()
  })
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={9}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          uniform float uTime; uniform float uPixelRatio; uniform float uScale; attribute float aSeed; varying float vA;
          void main(){
            vec3 p = position;
            p.x += sin(uTime * 0.21 + aSeed * 40.0) * 0.35 * uScale;
            p.y += sin(uTime * 0.17 + aSeed * 23.0) * 0.25 * uScale + mod(uTime * 0.04 * (0.5 + aSeed), 1.0) * 0.4 * uScale;
            p.z += cos(uTime * 0.19 + aSeed * 31.0) * 0.35 * uScale;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 60.0));
            gl_PointSize = (0.6 + aSeed * 1.4) * uScale * uPixelRatio * (40.0 / max(-mv.z, 0.2));
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = exp(-d * d * 30.0) * vA;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vec3(1.0, 0.8, 0.45) * 1.6, a);
          }`}
      />
    </points>
  )
}
