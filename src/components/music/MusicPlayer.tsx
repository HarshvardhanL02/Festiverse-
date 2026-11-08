import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Music, Pause, Play, Plus, Volume2, VolumeX, X } from 'lucide-react'
import type { Strings } from '../../i18n/strings'
import { music, type ActiveMusic, type MusicSnapshot } from '../../lib/music'
import { isEmbedBlockedError, loadYouTubeApi, youtubeThumb, youtubeWatchUrl, type YTPlayer } from '../../lib/youtube'
import { journey } from '../../experience/timeline'
import { SongPicker } from './SongPicker'
import { AddSongModal } from './AddSongModal'

export function useMusic(): MusicSnapshot {
  return useSyncExternalStore(music.subscribe, music.get)
}

export function Equalizer({ playing, className = '' }: { playing: boolean; className?: string }) {
  return (
    <span className={`eq flex h-4 items-end gap-[2px] ${playing ? 'is-playing' : ''} ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

function titleOf(c: ActiveMusic, t: Strings) {
  if (c.kind === 'youtube') return c.title || `YouTube · ${c.id}`
  if (c.kind === 'local') return c.name
  if (c.kind === 'default') return t.musicDefault
  return t.musicNone
}

function statusText(s: MusicSnapshot, t: Strings) {
  switch (s.status) {
    case 'playing':
      return t.musicNowPlaying
    case 'paused':
      return t.musicPaused
    case 'loading':
      return t.musicLoading
    case 'ready':
      return t.musicReady
    case 'needs-tap':
      return s.choice.kind === 'youtube' ? t.musicNeedsTap : t.musicPaused
    case 'blocked':
      // YouTube reports both 'embedding disabled' and 'video unavailable' as 150.
      return t.musicBlocked
    case 'error':
      return t.musicError
    case 'unavailable':
      return t.musicDefaultMissing
    default:
      return ''
  }
}

/** Pick a song (from the panel or the modal); keep playing if the journey is already running. */
function choose(m: ActiveMusic) {
  const wasPlaying = music.get().status === 'playing' || journey.started
  music.select(m)
  if (wasPlaying && m.kind !== 'none') music.start()
}

/* ------------------------------------------------------------------ */
/* Top-bar button + panel (desktop floating panel / mobile bottom sheet) */
/* ------------------------------------------------------------------ */
export function MusicControl({ t }: { t: Strings }) {
  const s = useMusic()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const playing = s.status === 'playing'
  const canPlay = s.choice.kind !== 'none' && !['unavailable', 'blocked', 'error', 'loading', 'idle'].includes(s.status)
  const closeAdd = useCallback(() => setAdding(false), [])
  // On phones the sheet sits above the docked YouTube player so the official player stays visible.
  const docked = s.choice.kind === 'youtube'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !adding && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, adding])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t.musicOpen}
        title={t.musicTitle}
        className="glass inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-cream transition hover:bg-white/10"
      >
        {playing ? <Equalizer playing /> : <Music className="h-5 w-5 text-gold" />}
        <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:inline">{s.choice.kind === 'none' ? t.musicNone : t.musicTitle}</span>
      </button>

      {open &&
        createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-ink/40 sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <section
            data-ui
            role="dialog"
            aria-label={t.musicTitle}
            className={`fixed z-50 overflow-y-auto border-gold/20 bg-night/95 p-4 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:inset-x-auto sm:top-[4.25rem] sm:right-4 sm:bottom-auto sm:max-h-[calc(100vh-6rem)] sm:w-[380px] sm:rounded-3xl sm:border ${docked ? 'inset-x-3 bottom-[262px] max-h-[calc(100dvh-340px)] rounded-3xl border' : 'inset-x-0 bottom-0 max-h-[82vh] rounded-t-3xl border-t pb-[max(1rem,env(safe-area-inset-bottom))]'}`}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-cream">{t.musicTitle}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t.musicClose} className="rounded-full p-2 text-cream/70 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Now playing + transport */}
            <div className="mt-3 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent p-3">
              <div className="flex items-center gap-3">
                {s.choice.kind === 'youtube' ? (
                  <img src={youtubeThumb(s.choice.id)} alt="" className="h-11 w-[72px] shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gold/15">
                    <Equalizer playing={playing} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cream">{titleOf(s.choice, t)}</p>
                  <p className="truncate text-xs text-cream/55" aria-live="polite">
                    {statusText(s, t)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => music.togglePlay()}
                  disabled={!canPlay}
                  aria-label={playing ? t.musicPause : t.musicPlay}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-ink transition hover:brightness-110 disabled:opacity-35"
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
                </button>
                <button
                  type="button"
                  onClick={() => music.setMuted(!s.muted)}
                  disabled={s.choice.kind === 'none'}
                  aria-pressed={s.muted}
                  aria-label={s.muted ? t.musicUnmute : t.musicMute}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/15 disabled:opacity-35"
                >
                  {s.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <label className="flex flex-1 items-center gap-2">
                  <span className="sr-only">{t.musicVolume}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((s.muted ? 0 : s.volume) * 100)}
                    onChange={(e) => music.setVolume(Number(e.target.value) / 100)}
                    disabled={s.choice.kind === 'none'}
                    className="w-full accent-[#f3c46b] disabled:opacity-35"
                  />
                </label>
                {s.choice.kind === 'youtube' && (
                  <a href={youtubeWatchUrl(s.choice.id)} target="_blank" rel="noopener noreferrer" aria-label={t.musicOpenYoutube} title={t.musicOpenYoutube} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/15">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="mt-4">
              <SongPicker t={t} value={s.choice} onPick={choose} onAddOwn={() => setAdding(true)} defaultAvailable={s.defaultAvailable} />
            </div>
          </section>
        </>,
          document.body,
        )}
      {createPortal(<AddSongModal t={t} open={adding} onClose={closeAdd} onAdd={choose} />, document.body)}
    </>
  )
}

/** Compact "+ Add Your Own Song" button for places outside the panel. */
export function AddOwnSongButton({ t, className = '' }: { t: Strings; className?: string }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline ${className}`}>
        <Plus className="h-4 w-4" /> {t.musicAddOwn}
      </button>
      {createPortal(<AddSongModal t={t} open={open} onClose={close} onAdd={choose} />, document.body)}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Official YouTube player dock — always visible while a YouTube song is selected */
/* ------------------------------------------------------------------ */
export function YouTubeDock({ t }: { t: Strings }) {
  const s = useMusic()
  const host = useRef<HTMLDivElement>(null)
  const id = s.choice.kind === 'youtube' ? s.choice.id : null

  useEffect(() => {
    if (!id || !host.current) return
    let player: YTPlayer | null = null
    let cancelled = false
    const mount = document.createElement('div')
    host.current.appendChild(mount)
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return
        player = new YT.Player(mount, {
          videoId: id,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
          events: {
            onReady: (e) => !cancelled && music.registerYouTube(e.target),
            onStateChange: (e) => music.onYouTubeState(e.data),
            onError: (e) => music.onYouTubeError(e.data),
          },
        })
      })
      .catch(() => music.onYouTubeError(-1))
    return () => {
      cancelled = true
      music.registerYouTube(null)
      try {
        player?.destroy()
      } catch {
        /* already gone */
      }
      mount.remove()
    }
  }, [id])

  if (!id) return null
  const blocked = s.status === 'blocked' || (s.ytError !== undefined && isEmbedBlockedError(s.ytError))
  const failed = blocked || s.status === 'error'

  return (
    <aside
      data-ui
      aria-label="YouTube player"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-30 w-[min(356px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gold/25 bg-ink shadow-[0_18px_50px_-15px_rgba(0,0,0,0.9)]"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-cream/70">
        <Equalizer playing={s.status === 'playing'} className="h-3" />
        <span className="min-w-0 flex-1 truncate">{s.choice.kind === 'youtube' ? s.choice.title || 'YouTube' : ''}</span>
        <a href={youtubeWatchUrl(id)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gold hover:underline">
          {t.musicOpenYoutube}
        </a>
        <button type="button" onClick={() => music.select({ kind: 'none' })} aria-label={t.musicNone} title={t.musicNone} className="shrink-0 rounded p-0.5 hover:bg-white/10">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* 16:9 with a 200px minimum height, as the YouTube embed guidelines require. */}
      <div className="relative aspect-video min-h-[200px] w-full">
        <div ref={host} className={`absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full ${failed ? 'invisible' : ''}`} />
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/90 p-4 text-center">
            <img src={youtubeThumb(id)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
            <p className="relative text-sm text-cream">{blocked ? t.musicBlocked : t.musicError}</p>
            <a href={youtubeWatchUrl(id)} target="_blank" rel="noopener noreferrer" className="relative inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink">
              <ExternalLink className="h-4 w-4" /> {t.musicOpenYoutube}
            </a>
          </div>
        )}
      </div>
      {s.status === 'needs-tap' && <p className="bg-gold/15 px-3 py-1.5 text-center text-[11px] text-gold">{t.musicNeedsTap}</p>}
    </aside>
  )
}
