import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { journey, smooth, ACT } from './timeline'

const NOISE = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.02 + 7.1; a *= 0.5; } return v; }
`

/** Night sky: deep gradient, drifting clouds lit warm from the city below, moon with halo. */
export function Sky() {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCity: { value: 0 },
      uMoonDir: { value: new THREE.Vector3(-0.42, 0.42, -0.8).normalize() },
    }),
    [],
  )
  useFrame((s) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = s.clock.elapsedTime
    mat.current.uniforms.uCity.value = 0.35 + 0.65 * smooth(ACT.diyaWave, ACT.diyaWave + 4, journey.t)
  })
  return (
    <mesh scale={400} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 24]} />
      <shaderMaterial
        ref={mat}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`}
        fragmentShader={`
          uniform float uTime; uniform float uCity; uniform vec3 uMoonDir; varying vec3 vDir;
          ${NOISE}
          void main(){
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 zenith = vec3(0.012, 0.014, 0.05);
            vec3 mid = vec3(0.05, 0.03, 0.11);
            vec3 horizon = vec3(0.32, 0.12, 0.10);
            vec3 col = mix(mid, zenith, smoothstep(0.05, 0.75, h));
            col = mix(horizon, col, smoothstep(-0.02, 0.22, h));
            // City glow bleeding into the low sky.
            col += vec3(0.55, 0.22, 0.06) * exp(-max(h, 0.0) * 9.0) * uCity * 0.55;
            // Clouds
            vec2 uv = d.xz / max(h + 0.18, 0.05);
            float c = fbm(uv * 0.9 + vec2(uTime * 0.012, 0.0));
            c = smoothstep(0.48, 0.85, c) * smoothstep(-0.02, 0.25, h) * (1.0 - smoothstep(0.55, 0.95, h));
            vec3 cloudLit = mix(vec3(0.09, 0.07, 0.14), vec3(0.6, 0.27, 0.1) * (0.4 + uCity), exp(-max(h, 0.0) * 4.0));
            float moon = max(dot(d, uMoonDir), 0.0);
            cloudLit += vec3(0.5, 0.55, 0.7) * pow(moon, 18.0) * 0.6;
            col = mix(col, cloudLit, c * 0.85);
            // Moon disc + halo
            col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9996, moon) * (1.0 - c * 0.7) * 2.5;
            col += vec3(0.7, 0.65, 0.6) * pow(moon, 220.0) * 0.6 + vec3(0.25, 0.25, 0.35) * pow(moon, 12.0) * 0.18;
            if (h < 0.0) col = mix(horizon * 0.6, vec3(0.02, 0.01, 0.03), smoothstep(0.0, 0.2, -h));
            gl_FragColor = vec4(col, 1.0);
          }`}
      />
    </mesh>
  )
}

/** Soft fog sheets drifting low over the river and courtyard — reads as volumetric haze. */
export function FogSheets({ count = 10, area }: { count?: number; area: { center: [number, number, number]; size: [number, number] } }) {
  const group = useRef<THREE.Group>(null)
  const mats = useRef<THREE.ShaderMaterial[]>([])
  const sheets = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: area.center[0] + (Math.sin(i * 12.9) * 0.5) * area.size[0],
        y: area.center[1] + (i % 3) * 0.9,
        z: area.center[2] + (Math.cos(i * 7.3) * 0.5) * area.size[1],
        s: 26 + (i % 4) * 8,
        seed: i * 3.7,
      })),
    [count, area],
  )
  useFrame((s) => {
    mats.current.forEach((m) => m && (m.uniforms.uTime.value = s.clock.elapsedTime))
    // Sheets always face the camera (cheap billboards).
    group.current?.children.forEach((c) => c.quaternion.copy(s.camera.quaternion))
  })
  return (
    <group ref={group}>
      {sheets.map((sh, i) => (
        <mesh key={i} position={[sh.x, sh.y, sh.z]} renderOrder={8}>
          <planeGeometry args={[sh.s, sh.s * 0.45]} />
          <shaderMaterial
            ref={(m) => {
              if (m) mats.current[i] = m
            }}
            transparent
            depthWrite={false}
            fog={false}
            uniforms={{ uTime: { value: 0 }, uSeed: { value: sh.seed } }}
            vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
            fragmentShader={`
              uniform float uTime; uniform float uSeed; varying vec2 vUv;
              ${NOISE}
              void main(){
                vec2 p = vUv * vec2(3.0, 1.4) + vec2(uTime * 0.03 + uSeed, uSeed);
                float n = fbm(p);
                float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
                float a = smoothstep(0.35, 0.8, n) * edge * 0.11;
                gl_FragColor = vec4(vec3(0.62, 0.36, 0.24), a);
              }`}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Additive cone of light with soft falloff and drifting dust — fake volumetric shaft. */
export function LightShaft({
  position,
  rotation = [0, 0, 0],
  radius = 3,
  length = 12,
  color = '#ffb35a',
  intensity = 0.35,
  activeFrom,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  radius?: number
  length?: number
  color?: string
  intensity?: number
  activeFrom?: number
}) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uI: { value: intensity } }), [color, intensity])
  useFrame((s) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = s.clock.elapsedTime
    mat.current.uniforms.uI.value = intensity * (activeFrom === undefined ? 1 : smooth(activeFrom, activeFrom + 2, journey.t))
  })
  return (
    <mesh position={position} rotation={rotation} renderOrder={9}>
      <cylinderGeometry args={[radius * 0.2, radius, length, 32, 1, true]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        fog={false}
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
        fragmentShader={`
          uniform float uTime; uniform vec3 uColor; uniform float uI; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          ${NOISE}
          void main(){
            float facing = pow(abs(dot(vN, vV)), 1.6);
            float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
            float dust = 0.65 + 0.35 * fbm(vec2(vUv.x * 12.0, vUv.y * 4.0 - uTime * 0.15));
            gl_FragColor = vec4(uColor * facing * along * dust * uI, 1.0);
          }`}
      />
    </mesh>
  )
}

/** River surface. High tier: real planar reflections; otherwise a stylised shader (flames are mirrored separately). */
export function River({ y, z0, z1, reflect }: { y: number; z0: number; z1: number; reflect: boolean }) {
  const depth = z0 - z1
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uGlow: { value: 0 } }), [])
  useFrame((s) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = s.clock.elapsedTime
    mat.current.uniforms.uGlow.value = smooth(ACT.diyaWave, ACT.diyaWave + 4, journey.t)
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, y, (z0 + z1) / 2]} renderOrder={reflect ? 0 : 2}>
      <planeGeometry args={[400, depth + 40]} />
      {reflect ? (
        <MeshReflectorMaterial
          resolution={1024}
          mirror={0.92}
          mixBlur={6}
          mixStrength={6}
          blur={[400, 120]}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.2}
          depthScale={0.6}
          roughness={0.45}
          metalness={0.4}
          color="#0d0a18"
          distortion={0.25}
        />
      ) : (
        <shaderMaterial
          ref={mat}
          transparent
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`}
          fragmentShader={`
            uniform float uTime; uniform float uGlow; varying vec3 vW;
            ${NOISE}
            void main(){
              float n = fbm(vW.xz * 0.35 + vec2(uTime * 0.05, uTime * 0.03));
              float ripple = smoothstep(0.55, 0.8, n);
              vec3 c = vec3(0.02, 0.018, 0.045) + vec3(0.9, 0.42, 0.12) * ripple * 0.12 * (0.3 + uGlow);
              float fres = smoothstep(80.0, 6.0, length(vW.xz - cameraPosition.xz));
              gl_FragColor = vec4(c, mix(0.96, 0.8, fres));
            }`}
        />
      )}
    </mesh>
  )
}
