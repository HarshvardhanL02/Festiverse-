import { useEffect, useRef, useState } from 'react'
import { ACT, journey } from '../../experience/timeline'

/**
 * ?bench mode: records real frame times for every act of the journey and shows a summary
 * that can be copied (works on phones in production builds). Optional ?tier=high|medium|low
 * pins the quality tier so tiers can be compared.
 */
const ACTS: { name: string; from: number; to: number }[] = [
  { name: 'I First Light', from: 0, to: ACT.gateway },
  { name: 'II Gateway', from: ACT.gateway, to: ACT.city },
  { name: 'III City & River', from: ACT.city, to: ACT.courtyard },
  { name: 'IV Reveal', from: ACT.courtyard, to: ACT.finale },
  { name: 'V Finale', from: ACT.finale, to: ACT.ending },
  { name: 'VI Ending', from: ACT.ending, to: ACT.ending + 6 },
]
const END = ACT.ending + 6

export interface BenchRow {
  act: string
  frames: number
  avgFps: number
  p95ms: number
  worstMs: number
}

function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') as WebGL2RenderingContext | null
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    return (ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown').slice(0, 90)
  } catch {
    return 'unknown'
  }
}

export function summarise(frames: number[]): Omit<BenchRow, 'act'> {
  if (!frames.length) return { frames: 0, avgFps: 0, p95ms: 0, worstMs: 0 }
  const sorted = [...frames].sort((a, b) => a - b)
  const total = frames.reduce((a, b) => a + b, 0)
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
  return {
    frames: frames.length,
    avgFps: Math.round((frames.length / total) * 1000 * 10) / 10,
    p95ms: Math.round(p95 * 10) / 10,
    worstMs: Math.round(sorted[sorted.length - 1] * 10) / 10,
  }
}

export function BenchOverlay({ tier, mode }: { tier: string; mode: string }) {
  const samples = useRef<number[][]>(ACTS.map(() => []))
  const [rows, setRows] = useState<BenchRow[] | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      if (journey.started && last) {
        const dt = now - last
        const i = ACTS.findIndex((a) => journey.t >= a.from && journey.t < a.to)
        // Skip the first frames after start (shader warm-up is measured separately by load time).
        if (i >= 0 && journey.t > 0.3) samples.current[i].push(dt)
      }
      last = now
      if (journey.started && journey.t >= END) {
        const result = ACTS.map((a, i) => ({ act: a.name, ...summarise(samples.current[i]) }))
        setRows(result)
        const report = {
          tier,
          mode,
          dpr: window.devicePixelRatio,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          gpu: gpuName(),
          ua: navigator.userAgent,
          rows: result,
        }
        Object.assign(window, { __benchReport: report })
        console.info('[festiverse bench]', JSON.stringify(report))
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tier, mode])

  const text = rows
    ? [`Festiverse bench · tier=${tier} · mode=${mode} · dpr=${window.devicePixelRatio} · ${window.innerWidth}x${window.innerHeight}`, `GPU: ${gpuName()}`, ...rows.map((r) => `${r.act}: ${r.avgFps} fps avg, p95 ${r.p95ms} ms, worst ${r.worstMs} ms (${r.frames} frames)`)].join('\n')
    : ''

  return (
    <div data-ui className="fixed bottom-3 left-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-xl bg-black/80 p-3 font-mono text-[11px] leading-snug text-green-300">
      {!rows ? (
        <p>BENCH running… t={journey.t.toFixed(1)}s · tier={tier}</p>
      ) : (
        <>
          <pre className="whitespace-pre-wrap">{text}</pre>
          <button
            type="button"
            className="mt-2 rounded bg-green-700 px-2 py-1 text-white"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text)
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
          >
            {copied ? 'Copied' : 'Copy results'}
          </button>
        </>
      )}
    </div>
  )
}
