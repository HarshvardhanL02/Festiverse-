export type PerfTier = 'high' | 'medium' | 'low'

export interface DeviceProfile {
  tier: PerfTier
  webgl: boolean
  reducedMotion: boolean
  mobile: boolean
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Heuristic tiering. Runtime FPS monitoring (see GreetingCanvas) can still downgrade later. */
export function detectDevice(): DeviceProfile {
  const webgl = hasWebGL()
  const reducedMotion = prefersReducedMotion()
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) || window.innerWidth < 768
  const mem = nav.deviceMemory ?? 4
  const cores = nav.hardwareConcurrency ?? 4
  const saveData = nav.connection?.saveData === true

  let tier: PerfTier = 'high'
  if (!webgl || saveData || mem <= 2 || cores <= 2) tier = 'low'
  else if (mobile || mem <= 4 || cores <= 4) tier = 'medium'

  return { tier, webgl, reducedMotion, mobile }
}

/** Particle / instance budgets per tier. */
export const BUDGET: Record<PerfTier, { diyas: number; stars: number; galaxy: number; sparkles: number; bursts: number; dpr: [number, number] }> = {
  high: { diyas: 900, stars: 4000, galaxy: 40000, sparkles: 260, bursts: 8, dpr: [1, 2] },
  medium: { diyas: 450, stars: 2000, galaxy: 16000, sparkles: 120, bursts: 5, dpr: [1, 1.5] },
  low: { diyas: 200, stars: 900, galaxy: 6000, sparkles: 50, bursts: 3, dpr: [0.75, 1] },
}
