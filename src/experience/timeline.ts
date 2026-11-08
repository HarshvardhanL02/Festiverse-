/**
 * Single source of truth for the Divine Return journey.
 * Everything (camera, diya wave, doors, lanterns, mandala, fireworks, UI captions)
 * reads the shared clock `journey.t` (seconds since "Begin the Journey").
 */
export type Vec3 = [number, number, number]

export const ACT = {
  /** Act 1 — push-in on the hero diya, then pull back to reveal the road. */
  firstLight: 0,
  /** Act 2 — approach the Golden Gateway; doors open. */
  gateway: 2.6,
  doorsOpen: 4.6,
  throughGate: 8.2,
  /** Act 3 — City of a Thousand Lights. */
  city: 8.2,
  diyaWave: 8.8,
  lanterns: 9.8,
  /** Act 4 — Divine Reveal in the courtyard. */
  courtyard: 15.8,
  mandala: 16.6,
  gather: 17.2,
  reveal: 20.4,
  /** Act 5 — Grand finale. */
  finale: 21.2,
  /** Act 6 — viral ending panel. */
  ending: 28,
} as const

export const JOURNEY_END = ACT.ending

/** Camera keyframes: time (s), position, look-at target. */
export const CAMERA_KEYS: { t: number; pos: Vec3; target: Vec3 }[] = [
  { t: 0, pos: [0.3, 1.22, 62.62], target: [0.07, 1.08, 62] },
  { t: 2.6, pos: [0.2, 2.1, 66.5], target: [0, 4.2, 40] },
  { t: 5.4, pos: [0, 4.4, 52], target: [0, 6.2, 38] },
  { t: 8.2, pos: [0, 5.2, 37], target: [0, 5, 18] },
  { t: 10.8, pos: [12, 6.5, 24], target: [-4, -1, -14] },
  { t: 13.6, pos: [-9, 4.2, 6], target: [2, 1.5, -34] },
  { t: 17.4, pos: [0, 8.5, -22], target: [0, 5, -42] },
  { t: 21, pos: [0, 7, -17.5], target: [0, 7.6, -50] },
]

/** Mutable shared clock (no React re-renders per frame). */
export const journey = {
  t: 0,
  /** False until "Begin the Journey" is pressed: Act 1 idles on the diya. */
  started: false,
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
