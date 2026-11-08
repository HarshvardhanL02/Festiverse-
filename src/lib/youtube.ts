import { YT_ID_RE } from './greeting'

/**
 * YouTube helpers. Festiverse only ever plays YouTube through the official embedded player
 * (IFrame API). It never downloads, extracts or proxies YouTube audio.
 */
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])

/** Extracts a video ID from watch, youtu.be, Shorts, embed and live URLs (or a bare 11-char ID). */
export function parseYouTubeId(input: string): string | null {
  const raw = (input ?? '').trim()
  if (!raw || raw.length > 500) return null
  if (YT_ID_RE.test(raw)) return raw
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol) || !HOSTS.has(url.hostname.toLowerCase())) return null
  const parts = url.pathname.split('/').filter(Boolean)
  let id: string | null = null
  if (url.hostname.toLowerCase().endsWith('youtu.be')) id = parts[0] ?? null
  else if (parts[0] === 'watch') id = url.searchParams.get('v')
  else if (['shorts', 'embed', 'live', 'v', 'e'].includes(parts[0] ?? '')) id = parts[1] ?? null
  return id && YT_ID_RE.test(id) ? id : null
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`

export type YouTubeMeta =
  | { status: 'ok'; title: string; author: string }
  | { status: 'blocked' } // owner disabled embedding
  | { status: 'not-found' } // removed, private or never existed
  | { status: 'unknown' } // network error: we could not check

/** Uses YouTube's public oEmbed endpoint (CORS-enabled, no API key) to read the real title/channel. */
export async function fetchYouTubeMeta(id: string, fetchImpl: typeof fetch = fetch): Promise<YouTubeMeta> {
  if (!YT_ID_RE.test(id)) return { status: 'not-found' }
  try {
    const res = await fetchImpl(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeWatchUrl(id))}`)
    if (res.status === 401 || res.status === 403) return { status: 'blocked' }
    if (res.status === 400 || res.status === 404) return { status: 'not-found' }
    if (!res.ok) return { status: 'unknown' }
    const data = (await res.json()) as { title?: unknown; author_name?: unknown }
    return {
      status: 'ok',
      title: typeof data.title === 'string' ? data.title : '',
      author: typeof data.author_name === 'string' ? data.author_name : '',
    }
  } catch {
    return { status: 'unknown' }
  }
}

/* ------------------------------------------------------------------ */
/* Official IFrame API loader                                          */
/* ------------------------------------------------------------------ */
export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  mute(): void
  unMute(): void
  setVolume(v: number): void
  getPlayerState(): number
  cueVideoById(id: string): void
  destroy(): void
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string
      host?: string
      width?: string | number
      height?: string | number
      playerVars?: Record<string, string | number>
      events?: Record<string, (e: { data: number; target: YTPlayer }) => void>
    },
  ) => YTPlayer
}

let apiPromise: Promise<YTNamespace> | null = null

export function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void }
  if (w.YT?.Player) return Promise.resolve(w.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      prev?.()
      if (w.YT) resolve(w.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => {
      apiPromise = null
      reject(new Error('YouTube player could not load'))
    }
    document.head.appendChild(s)
  })
  return apiPromise
}

/** YT.PlayerState values */
export const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const
/** Error codes 101/150 = embedding disabled by the owner; 100 = removed/private; 2/5 = bad id / HTML5 error. */
export const isEmbedBlockedError = (code: number) => code === 101 || code === 150
