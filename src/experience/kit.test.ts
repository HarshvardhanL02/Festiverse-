import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { amalaka, archedWall, boxUV, column, kalash, merge, place, rathaPlan, shikhara } from './kit'
import { ACT, CAMERA_KEYS } from './timeline'

function allFinite(g: THREE.BufferGeometry) {
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.attributes[name]
    if (!a) continue
    for (let i = 0; i < a.array.length; i++) if (!Number.isFinite(a.array[i])) return false
  }
  return true
}

describe('architecture kit', () => {
  it('ratha plan has no duplicate consecutive points (they produced NaN normals)', () => {
    const plan = rathaPlan()
    for (let i = 0; i < plan.length; i++) {
      const a = plan[i]
      const b = plan[(i + 1) % plan.length]
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(1e-6)
    }
  })

  it('generated geometry has finite positions, normals and UVs', () => {
    for (const g of [shikhara(18, 4.8, 10), amalaka(1, 0.6), kalash(1), column(4, 0.3), archedWall(20, 14, 3, [{ cx: 0, base: 0, w: 6, h: 10 }])]) {
      expect(allFinite(g)).toBe(true)
    }
  })

  it('merge + boxUV keeps everything finite and non-indexed', () => {
    const g = boxUV(merge([place(shikhara(10, 2, 6), [1, 2, 3], 0.4), place(column(3), [5, 0, 0]), new THREE.BoxGeometry(1, 1, 1)]), 2)
    expect(g.index).toBeNull()
    expect(allFinite(g)).toBe(true)
    // Normals are unit length after sanitising.
    const n = g.attributes.normal
    for (let i = 0; i < n.count; i += 97) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 3)
  })
})

describe('journey timeline', () => {
  it('acts are in order and the reveal precedes the ending', () => {
    expect(ACT.gateway).toBeLessThan(ACT.city)
    expect(ACT.city).toBeLessThan(ACT.courtyard)
    expect(ACT.courtyard).toBeLessThan(ACT.reveal)
    expect(ACT.reveal).toBeLessThan(ACT.ending)
  })
  it('camera keyframes are strictly increasing in time', () => {
    for (let i = 1; i < CAMERA_KEYS.length; i++) expect(CAMERA_KEYS[i].t).toBeGreaterThan(CAMERA_KEYS[i - 1].t)
  })
})
