import { describe, expect, it } from 'vitest'
import { summarise } from './BenchOverlay'

describe('bench summarise', () => {
  it('computes average fps, p95 and worst frame time', () => {
    const frames = [...Array(95).fill(16), ...Array(5).fill(50)]
    const s = summarise(frames)
    expect(s.frames).toBe(100)
    expect(s.avgFps).toBeCloseTo(1000 / 17.7, 0)
    expect(s.p95ms).toBe(50)
    expect(s.worstMs).toBe(50)
  })
  it('handles no samples', () => {
    expect(summarise([])).toEqual({ frames: 0, avgFps: 0, p95ms: 0, worstMs: 0 })
  })
})
