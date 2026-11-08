import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { BUDGET, type PerfTier } from '../../lib/performance'
import DivineReturn from '../../experience/DivineReturn'
import type { FireworksHandle } from '../../experience/Effects'
import { journey } from '../../experience/timeline'

export interface GreetingCanvasProps {
  tier: PerfTier
  /** Called when WebGL fails or the device is clearly too slow — parent switches to the 2.5D film. */
  onFallback: () => void
  /** Called once textures/models are loaded and the first frame has rendered. */
  onReady?: () => void
  /** Dev-only: keep the drawing buffer so stills can be captured. */
  capture?: boolean
  /** Benchmark mode: no automatic tier downgrades, so each run measures one tier. */
  bench?: boolean
}

/** Launches a firework wherever the viewer taps (after the reveal). */
function TapLauncher({ fireworks }: { fireworks: React.RefObject<FireworksHandle | null> }) {
  const { camera, gl } = useThree()
  useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const onDown = (e: PointerEvent) => {
      if (!journey.started || journey.t < 20) return
      if (e.target instanceof Element && e.target.closest('button, a, select, input, textarea, label, [data-ui]')) return
      const rect = el.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const point = ray.ray.at(55, new THREE.Vector3())
      point.y = Math.max(point.y, 18)
      fireworks.current?.launch(point)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [camera, gl, fireworks])
  return null
}

function ReadySignal({ onReady, onLost }: { onReady?: () => void; onLost: () => void }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    // Rendered inside <Suspense>, so this only mounts once assets are ready.
    const id = requestAnimationFrame(() => onReady?.())
    const el = gl.domElement
    const lost = (e: Event) => {
      e.preventDefault()
      onLost()
    }
    el.addEventListener('webglcontextlost', lost)
    return () => {
      cancelAnimationFrame(id)
      el.removeEventListener('webglcontextlost', lost)
    }
  }, [gl, onReady, onLost])
  return null
}

function Grade({ tier }: { tier: PerfTier }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={tier === 'high' ? 1.05 : 0.85} luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.78} />
      {/* Tone-map first: grading HDR values pushed saturated channels negative -> black artefacts. */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.1} />
      <BrightnessContrast brightness={0.0} contrast={0.08} />
      <Vignette offset={0.28} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={tier === 'high' ? 0.12 : 0} />
    </EffectComposer>
  )
}

export default function GreetingCanvas({ tier: initialTier, onFallback, onReady, capture = false, bench = false }: GreetingCanvasProps) {
  const [tier, setTier] = useState<PerfTier>(initialTier)
  const captureDpr = capture ? Number(new URLSearchParams(window.location.search).get('dpr')) || 1.5 : 0
  const [dpr, setDpr] = useState(captureDpr || BUDGET[initialTier].dpr[1])
  const fireworks = useRef<FireworksHandle | null>(null)

  return (
    <Canvas
      className="!fixed inset-0"
      dpr={dpr}
      flat
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, preserveDrawingBuffer: capture }}
      camera={{ fov: 52, near: 0.03, far: 900, position: [0.4, 1.3, 63.2] }}
      onCreated={({ gl, scene, camera }) => {
        gl.toneMapping = THREE.NoToneMapping
        if (import.meta.env.DEV) Object.assign(window, { __fv: { gl, scene, camera, THREE, journey } })
      }}
    >
      <color attach="background" args={['#05030a']} />
      {!capture && !bench && (
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            setDpr((d) => Math.max(0.75, d - 0.25))
            setTier((t) => (t === 'high' ? 'medium' : 'low'))
          }}
          onFallback={onFallback}
        />
      )}
      <Suspense fallback={null}>
        <DivineReturn tier={tier} fireworks={fireworks} />
        <ReadySignal onReady={onReady} onLost={onFallback} />
      </Suspense>
      <TapLauncher fireworks={fireworks} />
      {!(import.meta.env.DEV && new URLSearchParams(window.location.search).has('nofx')) && <Grade tier={tier} />}
    </Canvas>
  )
}
