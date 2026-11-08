/**
 * Licensed-audio-only soundtrack player.
 *
 * Festiverse ships SILENT by default: no synthesized music. To add music, place your own
 * original or properly licensed files at the URLs below (or set VITE_SOUNDTRACK_URL /
 * VITE_AMBIENCE_URL) — see README "Soundtrack". If no file is present, the music control
 * stays visibly disabled.
 *
 * - Starts only after a user gesture.
 * - Smooth fade-in / fade-out via Web Audio gain ramps (works on iOS where element.volume is ignored).
 * - Music and ambience are balanced on separate gain nodes.
 */
const MUSIC_URL = (import.meta.env.VITE_SOUNDTRACK_URL as string | undefined) || '/audio/soundtrack.mp3'
const AMBIENCE_URL = (import.meta.env.VITE_AMBIENCE_URL as string | undefined) || '/audio/ambience.mp3'
const MUSIC_LEVEL = 0.75
const AMBIENCE_LEVEL = 0.28
const FADE = 1.6

type Status = 'unknown' | 'available' | 'unavailable'

async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const type = res.headers.get('content-type') ?? ''
    // SPA fallbacks return index.html with 200 — make sure it is really audio.
    return res.ok && /audio|octet-stream|mpeg|ogg|mp4|aac|webm/i.test(type)
  } catch {
    return false
  }
}

class Soundtrack {
  status: Status = 'unknown'
  private ambienceOk = false
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private music: HTMLAudioElement | null = null
  private ambience: HTMLAudioElement | null = null
  private _on = false
  private listeners = new Set<() => void>()
  private probe: Promise<void> | null = null

  get on() {
    return this._on
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  private emit() {
    this.listeners.forEach((l) => l())
  }

  /** Checks once whether licensed audio has been installed. */
  detect(): Promise<void> {
    if (!this.probe) {
      this.probe = Promise.all([exists(MUSIC_URL), exists(AMBIENCE_URL)]).then(([m, a]) => {
        this.status = m ? 'available' : 'unavailable'
        this.ambienceOk = a
        this.emit()
      })
    }
    return this.probe
  }

  private setup() {
    if (this.ctx) return
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(this.ctx.destination)
    const attach = (url: string, level: number) => {
      const el = new Audio(url)
      el.loop = true
      el.preload = 'auto'
      el.crossOrigin = 'anonymous'
      const g = this.ctx!.createGain()
      g.gain.value = level
      this.ctx!.createMediaElementSource(el).connect(g).connect(this.master!)
      return el
    }
    this.music = attach(MUSIC_URL, MUSIC_LEVEL)
    if (this.ambienceOk) this.ambience = attach(AMBIENCE_URL, AMBIENCE_LEVEL)
  }

  /** Must be called from a user gesture (click / tap). */
  async setOn(on: boolean) {
    if (this.status !== 'available') return
    this.setup()
    if (!this.ctx || !this.master) return
    this._on = on
    this.emit()
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    if (on) {
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => undefined)
      await Promise.all([this.music?.play(), this.ambience?.play()].map((p) => p?.catch(() => undefined)))
      this.master.gain.linearRampToValueAtTime(1, now + FADE)
    } else {
      this.master.gain.linearRampToValueAtTime(0, now + FADE * 0.6)
      window.setTimeout(() => {
        if (!this._on) {
          this.music?.pause()
          this.ambience?.pause()
        }
      }, FADE * 600 + 50)
    }
  }

  toggle() {
    return this.setOn(!this._on)
  }

  /** Restart from the top (Replay Experience). */
  restart() {
    if (this.music) this.music.currentTime = 0
  }
}

export const soundtrack = new Soundtrack()
