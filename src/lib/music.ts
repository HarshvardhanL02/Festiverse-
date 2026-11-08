import type { SharedMusic } from './greeting'
import { YT_STATE, type YTPlayer } from './youtube'

/**
 * Festiverse music engine.
 *
 * Sources
 * - 'default'  : the site's licensed soundtrack file (public/audio/soundtrack.mp3) if installed.
 * - 'local'    : a file the visitor picked from their device. Played from a browser object URL,
 *                never uploaded, never stored; the URL is revoked when replaced or on page hide.
 * - 'youtube'  : the official YouTube embedded player (IFrame API). We only call its public
 *                controls (play/pause/mute/volume); we never hide it or touch its audio stream.
 * - 'none'
 *
 * Nothing ever autoplays: playback starts from a user gesture (Begin the Journey / Play).
 * File sources follow the cinematic envelope (fade in → lift at the reveal → fade out at the
 * finale). YouTube is not synchronised: we cannot and do not promise timing there.
 */
export type ActiveMusic = SharedMusic | { kind: 'local'; name: string; url: string }
export type MusicStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'needs-tap' | 'blocked' | 'error' | 'unavailable'

export interface MusicSnapshot {
  choice: ActiveMusic
  status: MusicStatus
  muted: boolean
  volume: number
  /** null while still checking whether the site soundtrack exists. */
  defaultAvailable: boolean | null
  /** YouTube error code (101/150 = embedding disabled, 100 = unavailable). */
  ytError?: number
}

export const SOUNDTRACK_URL = (import.meta.env.VITE_SOUNDTRACK_URL as string | undefined) || '/audio/soundtrack.mp3'
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const BASE_LEVEL = 0.78
const REVEAL_LEVEL = 1
const FADE_IN = 2.2
const FADE_OUT = 6

/* ------------------------------------------------------------------ */
/* Upload validation                                                   */
/* ------------------------------------------------------------------ */
const EXT_MIME: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg' }

export type UploadCheck = { ok: true; mime: string } | { ok: false; reason: 'type' | 'size' | 'empty' }

export function validateAudioFile(
  file: { name: string; size: number; type: string },
  canPlay: (mime: string) => boolean = (mime) => typeof Audio !== 'undefined' && new Audio().canPlayType(mime) !== '',
): UploadCheck {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  const mime = EXT_MIME[ext]
  if (!mime) return { ok: false, reason: 'type' }
  if (file.type && !file.type.startsWith('audio/') && file.type !== 'video/mp4' && file.type !== 'application/ogg') return { ok: false, reason: 'type' }
  if (file.size <= 0) return { ok: false, reason: 'empty' }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: 'size' }
  // Ask the browser whether it can actually decode this container (e.g. Safari cannot play OGG).
  const candidates = [file.type, mime].filter(Boolean)
  if (!candidates.some((m) => canPlay(m))) return { ok: false, reason: 'type' }
  return { ok: true, mime }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
class MusicEngine {
  private snap: MusicSnapshot = { choice: { kind: 'default' }, status: 'idle', muted: false, volume: 0.8, defaultAvailable: null }
  private listeners = new Set<() => void>()
  private ctx: AudioContext | null = null
  private envelope: GainNode | null = null
  private userGain: GainNode | null = null
  private audio: HTMLAudioElement | null = null
  private yt: YTPlayer | null = null
  private ytReady = false
  private tapTimer = 0
  private fadeTimer = 0
  private probe: Promise<void> | null = null
  /** Play as soon as the (new) YouTube player is ready — set when a song is picked mid-journey. */
  private pendingPlay = false

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  get = () => this.snap
  private set(patch: Partial<MusicSnapshot>) {
    this.snap = { ...this.snap, ...patch }
    this.listeners.forEach((l) => l())
  }

  /** Checks once whether a licensed soundtrack file is installed (SPA fallbacks return HTML, not audio). */
  detectDefault(): Promise<void> {
    if (!this.probe) {
      this.probe = fetch(SOUNDTRACK_URL, { method: 'HEAD' })
        .then((r) => r.ok && /audio|octet-stream|mpeg|mp4|ogg|aac|webm/i.test(r.headers.get('content-type') ?? ''))
        .catch(() => false)
        .then((ok) => {
          this.set({ defaultAvailable: ok })
          if (this.snap.choice.kind === 'default') this.prepare(this.snap.choice)
        })
    }
    return this.probe
  }

  /** Same source as now? (avoids restarting when re-selecting) */
  isCurrent(c: ActiveMusic) {
    const a = this.snap.choice
    if (a.kind !== c.kind) return false
    if (a.kind === 'youtube' && c.kind === 'youtube') return a.id === c.id
    if (a.kind === 'local' && c.kind === 'local') return a.url === c.url
    return true
  }

  select(choice: ActiveMusic) {
    if (this.isCurrent(choice) && this.snap.status !== 'idle') return
    this.teardownFile()
    if (this.snap.choice.kind === 'youtube' && choice.kind !== 'youtube') this.yt?.pauseVideo()
    const prev = this.snap.choice
    if (prev.kind === 'local' && !(choice.kind === 'local' && choice.url === prev.url)) URL.revokeObjectURL(prev.url)
    this.ytReady = false
    this.pendingPlay = false
    this.set({ choice, ytError: undefined, status: choice.kind === 'none' ? 'idle' : 'loading' })
    this.prepare(choice)
  }

  private prepare(choice: ActiveMusic) {
    if (choice.kind === 'default') {
      if (this.snap.defaultAvailable === false) return this.set({ status: 'unavailable' })
      if (this.snap.defaultAvailable === null) return // wait for detectDefault()
      this.loadFile(SOUNDTRACK_URL)
    } else if (choice.kind === 'local') {
      this.loadFile(choice.url)
    }
    // YouTube waits for the dock to register its player.
  }

  private ensureGraph() {
    if (this.ctx) return
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.envelope = this.ctx.createGain()
    this.envelope.gain.value = 0
    this.userGain = this.ctx.createGain()
    this.userGain.gain.value = this.snap.muted ? 0 : this.snap.volume
    this.envelope.connect(this.userGain).connect(this.ctx.destination)
  }

  private loadFile(url: string) {
    this.teardownFile()
    const el = new Audio()
    el.src = url
    el.preload = 'auto'
    el.loop = true
    el.addEventListener('canplay', () => {
      if (this.audio === el && this.snap.status === 'loading') this.set({ status: 'ready' })
    })
    el.addEventListener('error', () => {
      if (this.audio === el) this.set({ status: this.snap.choice.kind === 'default' ? 'unavailable' : 'error' })
    })
    el.addEventListener('pause', () => {
      if (this.audio === el && this.snap.status === 'playing') this.set({ status: 'paused' })
    })
    el.addEventListener('playing', () => {
      if (this.audio === el) this.set({ status: 'playing' })
    })
    this.audio = el
  }

  private connectFile() {
    if (!this.audio || !this.ctx || !this.envelope) return
    const el = this.audio as HTMLAudioElement & { __wired?: boolean }
    if (!el.__wired) {
      this.ctx.createMediaElementSource(el).connect(this.envelope)
      el.__wired = true
    }
  }

  private teardownFile() {
    window.clearTimeout(this.fadeTimer)
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
  }

  private ramp(to: number, seconds: number) {
    if (!this.ctx || !this.envelope) return
    const g = this.envelope.gain
    const now = this.ctx.currentTime
    g.cancelScheduledValues(now)
    g.setValueAtTime(g.value, now)
    g.linearRampToValueAtTime(to, now + seconds)
  }

  /* ---------------- YouTube dock wiring ---------------- */
  registerYouTube(player: YTPlayer | null) {
    this.yt = player
    this.ytReady = !!player
    if (player) {
      player.setVolume(Math.round(this.snap.volume * 100))
      if (this.snap.muted) player.mute()
      if (this.snap.status === 'loading') this.set({ status: 'ready' })
      if (this.pendingPlay) {
        this.pendingPlay = false
        this.playYouTube()
      }
    }
  }
  onYouTubeState(state: number) {
    window.clearTimeout(this.tapTimer)
    if (state === YT_STATE.PLAYING) this.set({ status: 'playing' })
    else if (state === YT_STATE.PAUSED || state === YT_STATE.ENDED) this.set({ status: 'paused' })
  }
  onYouTubeError(code: number) {
    this.set({ status: code === 101 || code === 150 ? 'blocked' : 'error', ytError: code })
  }

  /* ---------------- Transport (call from user gestures) ---------------- */
  /** "Begin the Journey": starts the selected music from the top. */
  start() {
    const c = this.snap.choice
    if (c.kind === 'none') return
    if (c.kind === 'youtube') return this.playYouTube()
    if (!this.audio) return
    this.ensureGraph()
    this.connectFile()
    void this.ctx?.resume()
    this.audio.currentTime = 0
    if (this.envelope) this.envelope.gain.value = 0
    void this.audio.play().then(
      () => this.ramp(BASE_LEVEL, FADE_IN),
      () => this.set({ status: 'needs-tap' }),
    )
  }

  private playYouTube() {
    if (!this.yt || !this.ytReady) {
      this.pendingPlay = true
      return
    }
    this.yt.playVideo()
    // Some mobile browsers only allow a tap on the player itself; tell the visitor if so.
    window.clearTimeout(this.tapTimer)
    this.tapTimer = window.setTimeout(() => {
      if (this.snap.status !== 'playing' && this.snap.choice.kind === 'youtube' && this.snap.status !== 'blocked') this.set({ status: 'needs-tap' })
    }, 2500)
  }

  togglePlay() {
    const s = this.snap
    if (s.choice.kind === 'none') return
    if (s.choice.kind === 'youtube') {
      if (s.status === 'playing') this.yt?.pauseVideo()
      else this.playYouTube()
      return
    }
    if (!this.audio) return
    if (s.status === 'playing') {
      this.ramp(0, 0.4)
      const el = this.audio
      window.setTimeout(() => el.pause(), 420)
    } else {
      this.ensureGraph()
      this.connectFile()
      void this.ctx?.resume()
      void this.audio.play().then(
        () => this.ramp(BASE_LEVEL, 0.8),
        () => this.set({ status: 'needs-tap' }),
      )
    }
  }

  setMuted(muted: boolean) {
    this.set({ muted })
    if (this.userGain && this.ctx) this.userGain.gain.setTargetAtTime(muted ? 0 : this.snap.volume, this.ctx.currentTime, 0.05)
    if (this.yt) {
      if (muted) this.yt.mute()
      else this.yt.unMute()
    }
  }

  setVolume(volume: number) {
    const v = Math.min(1, Math.max(0, volume))
    this.set({ volume: v, muted: v === 0 ? true : this.snap.muted && v === 0 })
    if (this.userGain && this.ctx && !this.snap.muted) this.userGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
    this.yt?.setVolume(Math.round(v * 100))
    if (v > 0) this.yt?.unMute()
  }

  /** Cinematic cues. Only file sources follow them; YouTube keeps playing as the viewer controls it. */
  cue(event: 'reveal' | 'ending' | 'replay') {
    const c = this.snap.choice
    if (c.kind === 'youtube' || c.kind === 'none' || !this.audio) return
    if (event === 'replay') return this.start()
    if (this.snap.status !== 'playing') return
    if (event === 'reveal') this.ramp(REVEAL_LEVEL, 2)
    if (event === 'ending') {
      this.ramp(0, FADE_OUT)
      const el = this.audio
      this.fadeTimer = window.setTimeout(() => el.pause(), FADE_OUT * 1000 + 100)
    }
  }

  /** Release the object URL of an uploaded file when the page goes away. */
  dispose() {
    this.teardownFile()
    const c = this.snap.choice
    if (c.kind === 'local') URL.revokeObjectURL(c.url)
  }
}

export const music = new MusicEngine()

if (typeof window !== 'undefined') window.addEventListener('pagehide', () => music.dispose())
