import { ACT } from '../../experience/timeline'
import { AmbientEmbers } from './common'

/**
 * Hybrid 2.5D fallback for phones that can't run the full 3D world, for reduced motion,
 * and when WebGL fails. It plays pre-rendered stills of the same Ayodhya scene (rendered
 * from our own 3D engine — see scripts/capture-stills.md) with slow camera moves and
 * crossfades timed to the same act clock.
 */
const SHOTS = [
  { id: 'act1', from: -1, to: ACT.gateway, zoom: [1.18, 1.0], pan: [0, 0] },
  { id: 'act2', from: ACT.gateway, to: ACT.city, zoom: [1.0, 1.16], pan: [0, -2] },
  { id: 'act3', from: ACT.city, to: ACT.courtyard, zoom: [1.12, 1.0], pan: [-3, 1] },
  { id: 'act4', from: ACT.courtyard, to: Infinity, zoom: [1.1, 1.0], pan: [0, 2] },
] as const

export function CinematicFilm({ jt, started, reduced }: { jt: number; started: boolean; reduced: boolean }) {
  const t = started ? jt : -0.5
  return (
    <div className="fixed inset-0 overflow-hidden bg-ink" aria-hidden="true">
      {SHOTS.map((s) => {
        const active = t >= s.from && t < s.to
        const span = Number.isFinite(s.to) ? s.to - Math.max(s.from, 0) : 8
        const k = reduced ? 1 : Math.min(1, Math.max(0, (t - Math.max(s.from, 0)) / span))
        const z = s.zoom[0] + (s.zoom[1] - s.zoom[0]) * k
        const px = s.pan[0] * k
        const py = s.pan[1] * k
        return (
          <picture key={s.id}>
            <source media="(orientation: portrait)" srcSet={`/stills/${s.id}-portrait.webp`} />
            <img
              src={`/stills/${s.id}.webp`}
              alt=""
              decoding="async"
              loading={s.id === 'act1' ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-in-out"
              style={{ opacity: active ? 1 : 0, transform: `translate3d(${px}%, ${py}%, 0) scale(${z})`, transition: 'opacity 1.4s ease, transform 0.12s linear' }}
            />
          </picture>
        )
      })}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,3,10,0.7)_100%)]" />
      {!reduced && <AmbientEmbers count={26} />}
    </div>
  )
}
