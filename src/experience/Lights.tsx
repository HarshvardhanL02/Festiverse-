import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { journey } from './timeline'
import type { Materials } from './materials'
import { fixNormals, lathe } from './kit'

/* ------------------------------------------------------------------ */
/* Diya field: instanced clay lamps + GPU flames with ignition times    */
/* ------------------------------------------------------------------ */
export interface DiyaField {
  positions: Float32Array
  /** Journey time (s) when each lamp ignites; negative = lit from the start. */
  ignite: Float32Array
}

const flameVertex = /* glsl */ `
  uniform float uTime;
  uniform float uJourney;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uReflect;
  attribute float aSeed;
  attribute float aIgnite;
  varying float vFlicker;
  varying float vLit;
  void main() {
    float lit = smoothstep(aIgnite, aIgnite + 0.45, uJourney);
    // Ignition "pop": slight overshoot as each wick catches.
    float pop = 1.0 + 0.6 * exp(-8.0 * max(uJourney - aIgnite, 0.0)) * step(aIgnite, uJourney) * step(0.0, aIgnite);
    vLit = lit;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float f = 0.85 + 0.15 * sin(uTime * (8.0 + aSeed * 6.0) + aSeed * 40.0) * sin(uTime * 2.7 + aSeed * 17.0);
    vFlicker = f;
    // Floor keeps distant lamps readable as glowing points instead of vanishing sub-pixel.
    gl_PointSize = max(uSize * f * pop * uPixelRatio * (70.0 / max(-mv.z, 0.4)), 3.2 * uPixelRatio) * lit;
    gl_Position = projectionMatrix * mv;
  }
`

const flameFragment = /* glsl */ `
  uniform float uReflect;
  varying float vFlicker;
  varying float vLit;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    p.y = -p.y;
    float a; vec3 col;
    if (uReflect > 0.5) {
      float streak = exp(-abs(p.x) * 26.0) * smoothstep(0.5, 0.05, abs(p.y));
      a = streak * 0.5;
      col = vec3(1.0, 0.55, 0.18);
    } else {
      // Teardrop: narrow at top, round at bottom.
      vec2 q = p + vec2(0.0, 0.08);
      float w = mix(0.13, 0.04, clamp((q.y + 0.15) / 0.4, 0.0, 1.0));
      float core = smoothstep(w, w * 0.25, abs(q.x)) * smoothstep(0.26, 0.0, q.y) * smoothstep(-0.2, -0.06, q.y);
      float halo = exp(-length(p * vec2(1.0, 0.8)) * 7.5) * 0.6;
      a = clamp(core + halo, 0.0, 1.0);
      vec3 hot = vec3(1.0, 0.95, 0.8);
      vec3 warm = vec3(1.0, 0.55, 0.15);
      col = mix(warm, hot, core);
    }
    a *= vLit;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col * 2.2 * vFlicker, a);
  }
`

function useFlameGeometry(field: DiyaField, mirrorY?: number) {
  return useMemo(() => {
    const g = new THREE.BufferGeometry()
    let pos = field.positions
    if (mirrorY !== undefined) {
      pos = new Float32Array(field.positions.length)
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] = field.positions[i]
        pos[i + 1] = 2 * mirrorY - field.positions[i + 1] - 0.18
        pos[i + 2] = field.positions[i + 2]
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aIgnite', new THREE.BufferAttribute(field.ignite, 1))
    const seeds = new Float32Array(field.ignite.length)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return g
  }, [field, mirrorY])
}

export function Flames({ field, size = 1, mirrorY }: { field: DiyaField; size?: number; mirrorY?: number }) {
  const geo = useFlameGeometry(field, mirrorY)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uJourney: { value: 0 },
      uSize: { value: size * (mirrorY !== undefined ? 2 : 1) },
      uPixelRatio: { value: 1 },
      uReflect: { value: mirrorY !== undefined ? 1 : 0 },
    }),
    [size, mirrorY],
  )
  useFrame((s) => {
    const u = mat.current?.uniforms
    if (!u) return
    u.uTime.value = s.clock.elapsedTime
    u.uJourney.value = journey.t
    u.uPixelRatio.value = s.gl.getPixelRatio()
  })
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={mirrorY !== undefined ? 1 : 5}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={flameVertex}
        fragmentShader={flameFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

const bowlGeo = lathe(
  [[0, -0.05], [0.07, -0.055], [0.12, -0.03], [0.155, 0.02], [0.165, 0.05], [0.15, 0.055], [0.11, 0.03], [0, 0.02]],
  10,
)

export function DiyaBowls({ field, m }: { field: DiyaField; m: Materials }) {
  const mesh = useMemo(() => {
    const n = field.positions.length / 3
    const im = new THREE.InstancedMesh(bowlGeo, m.terracotta, n)
    const o = new THREE.Object3D()
    for (let i = 0; i < n; i++) {
      o.position.set(field.positions[i * 3], field.positions[i * 3 + 1] - 0.07, field.positions[i * 3 + 2])
      o.rotation.y = (i * 2.399) % (Math.PI * 2)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
    }
    im.instanceMatrix.needsUpdate = true
    im.frustumCulled = false
    return im
  }, [field, m])
  return <primitive object={mesh} />
}

export function Diyas({ field, m, reflectY, size = 1 }: { field: DiyaField; m: Materials; reflectY?: number; size?: number }) {
  return (
    <group>
      <DiyaBowls field={field} m={m} />
      <Flames field={field} size={size} />
      {reflectY !== undefined && <Flames field={field} size={size} mirrorY={reflectY} />}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Hero diya (Act 1): detailed clay lamp with a volumetric-looking flame */
/* ------------------------------------------------------------------ */
function heroDiyaGeometry() {
  // Lathe body, then pull one side out into a pinched spout.
  const g = new THREE.LatheGeometry(
    [
      [0.001, 0], [0.05, 0], [0.07, 0.006], [0.082, 0.02], [0.098, 0.034], [0.112, 0.052], [0.118, 0.062],
      [0.114, 0.068], [0.104, 0.066], [0.09, 0.05], [0.06, 0.036], [0.001, 0.032],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    96,
  )
  const p = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const ang = Math.atan2(v.z, v.x)
    const r = Math.hypot(v.x, v.z)
    const spout = Math.exp(-ang * ang * 9) // toward +x
    const lip = THREE.MathUtils.smoothstep(v.y, 0.03, 0.066)
    const k = 1 + spout * lip * 0.55
    const pinch = 1 - spout * lip * 0.35 * Math.abs(Math.sin(ang)) * 6
    const nr = r * k
    p.setXYZ(i, Math.cos(ang) * nr, v.y + spout * lip * 0.012, Math.sin(ang) * nr * Math.max(pinch, 0.4))
  }
  g.computeVertexNormals()
  return fixNormals(g)
}

const heroFlameVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Cylindrical billboard: always face the camera around Y.
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 world = center + camRight * position.x + up * position.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`
const heroFlameFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    vec2 uv = vUv;
    float y = uv.y;
    // Turbulent sway increasing with height.
    float sway = (fbm(vec2(y * 3.0 - uTime * 2.2, uTime * 0.7)) - 0.5) * 0.28 * y;
    float x = (uv.x - 0.5 - sway) * 2.0;
    // Teardrop profile.
    float width = mix(0.55, 0.02, pow(y, 0.85)) * smoothstep(0.0, 0.16, y);
    float n = fbm(vec2(x * 2.0, y * 4.0 - uTime * 3.5));
    float body = smoothstep(width, width * 0.2, abs(x)) * smoothstep(1.0, 0.55, y + n * 0.22);
    float core = smoothstep(width * 0.5, 0.0, abs(x)) * smoothstep(0.55, 0.15, y) * smoothstep(0.02, 0.12, y);
    float blue = smoothstep(0.18, 0.0, y) * smoothstep(width * 1.1, width * 0.3, abs(x)) * 0.6;
    vec3 col = vec3(1.0, 0.42, 0.08) * body;
    col = mix(col, vec3(1.0, 0.86, 0.55), body * smoothstep(0.7, 0.2, y));
    col += vec3(1.0, 0.9, 0.7) * core * 0.9;
    col += vec3(0.25, 0.4, 1.0) * blue;
    float a = clamp(body + core + blue * 0.5, 0.0, 1.0);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col * 2.0, a);
  }
`

export function HeroDiya({ m, position }: { m: Materials; position: [number, number, number] }) {
  const flameMat = useRef<THREE.ShaderMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const body = useMemo(heroDiyaGeometry, [])
  const rimDots = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const s = new THREE.SphereGeometry(0.0055, 6, 4)
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.45) continue
      const g = s.clone()
      g.translate(Math.cos(a) * 0.113, 0.0645, Math.sin(a) * 0.113)
      parts.push(g)
    }
    const band = new THREE.TorusGeometry(0.1, 0.004, 6, 64)
    band.rotateX(Math.PI / 2)
    band.translate(0, 0.045, 0)
    parts.push(band)
    return parts
  }, [])
  const wick = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.036, 0),
      new THREE.Vector3(0.1, 0.06, 0),
      new THREE.Vector3(0.155, 0.085, 0),
    ])
    return new THREE.TubeGeometry(curve, 12, 0.0045, 6)
  }, [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (flameMat.current) flameMat.current.uniforms.uTime.value = t
    if (light.current) light.current.intensity = 0.9 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.1
  })
  const dotMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f6e7c8', roughness: 0.6 }), [])
  const paintMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9a03a', roughness: 0.5, metalness: 0.3 }), [])
  return (
    <group position={position}>
      <mesh geometry={body} material={m.terracotta} />
      {rimDots.slice(0, -1).map((g, i) => (
        <mesh key={i} geometry={g} material={dotMat} />
      ))}
      <mesh geometry={rimDots[rimDots.length - 1]} material={paintMat} />
      {/* Ghee surface */}
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.088, 48]} />
        <meshStandardMaterial color="#8a5414" roughness={0.42} metalness={0} emissive="#ff8a1a" emissiveIntensity={0.25} />
      </mesh>
      <mesh geometry={wick}>
        <meshStandardMaterial color="#e8dcc2" roughness={0.9} emissive="#3a1200" />
      </mesh>
      <mesh position={[0.16, 0.084, 0]}>
        <planeGeometry args={[0.07, 0.17]} />
        <shaderMaterial
          ref={flameMat}
          uniforms={uniforms}
          vertexShader={heroFlameVertex.replace('position.y', '(position.y + 0.085)')}
          fragmentShader={heroFlameFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight ref={light} position={[0.1, 0.3, 0.05]} color="#ff9a3c" intensity={0.9} distance={6} decay={2} />
      <pointLight position={[0.22, 0.16, 0.55]} color="#ffb070" intensity={0.22} distance={2.5} decay={2} />
      <pointLight position={[-0.5, 0.3, -0.45]} color="#ff7a2a" intensity={0.25} distance={2} decay={2} />
      {/* Marigold ring around the pedestal top */}
      <Marigolds radius={0.29} count={26} y={-0.0} />
    </group>
  )
}

function Marigolds({ radius, count, y }: { radius: number; count: number; y: number }) {
  const mesh = useMemo(() => {
    // Layered-petal marigold head: a flattened sphere with gentle radial ruffles.
    const g = new THREE.SphereGeometry(0.028, 24, 12)
    const p = g.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const a = Math.atan2(v.z, v.x)
      const ruffle = 1 + 0.07 * Math.sin(a * 14) * Math.sin(v.y * 160)
      v.x *= ruffle
      v.z *= ruffle
      v.y *= 0.62
      p.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    fixNormals(g)
    const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.8, emissive: '#ff6a00', emissiveIntensity: 0.04 }), count)
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      o.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius)
      o.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4)
      o.scale.setScalar(0.85 + Math.random() * 0.3)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
      im.setColorAt(i, c.set(i % 3 === 0 ? '#e0420f' : i % 3 === 1 ? '#ff9800' : '#ffb300'))
    }
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    return im
  }, [radius, count, y])
  return <primitive object={mesh} />
}

/* ------------------------------------------------------------------ */
/* CC0 brass diya lanterns (Poly Haven) hung at the gate & courtyard    */
/* ------------------------------------------------------------------ */
export function BrassLanterns({ spots, height = 0.9 }: { spots: [number, number, number][]; height?: number }) {
  const { scene } = useGLTF('/models/lantern.glb')
  const items = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const s = height / size.y
    return spots.map((p) => {
      const c = scene.clone(true)
      c.scale.setScalar(s)
      c.position.set(p[0], p[1] - box.max.y * s, p[2])
      c.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
          if (mat.transparent || /glass/i.test(mat.name)) {
            mat.emissive = new THREE.Color('#ff8a2a')
            mat.emissiveIntensity = 0.6
          }
          mat.envMapIntensity = 1.4
          mesh.material = mat
        }
      })
      return c
    })
  }, [scene, spots, height])
  return (
    <group>
      {items.map((o, i) => (
        <group key={i}>
          <primitive object={o} />
          <pointLight position={[spots[i][0], spots[i][1] - height * 0.55, spots[i][2]]} color="#ffa045" intensity={6} distance={7} decay={2} />
          <mesh position={[spots[i][0], spots[i][1] - height * 0.58, spots[i][2]]}>
            <sphereGeometry args={[height * 0.07, 8, 6]} />
            <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
useGLTF.preload('/models/lantern.glb')
