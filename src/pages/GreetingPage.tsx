import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clapperboard, Box, Globe, Music, Music2, Pencil, RotateCcw, SkipForward, Sparkles, User, Users } from 'lucide-react'
import { decodeGreeting, greetingPath, greetingUrl, LANGS, NAME_MAX, normalizeGreeting, sanitizeText, type Greeting, type Lang, type SenderKind } from '../lib/greeting'
import { detectDevice } from '../lib/performance'
import { soundtrack } from '../lib/soundtrack'
import { safeStorage } from '../lib/storage'
import { STRINGS, type Strings } from '../i18n/strings'
import { useI18n } from '../i18n/I18nProvider'
import { ErrorScreen } from './NotFoundPage'
import { CinematicFilm } from '../components/ui/CinematicFilm'
import { NameReveal } from '../components/ui/NameReveal'
import { SharePanel } from '../components/ui/SharePanel'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { btnIcon, btnPrimary } from '../components/ui/common'
import { ACT, journey } from '../experience/timeline'

const loadCanvas = () => import('../components/three/GreetingCanvas')
const GreetingCanvas = lazy(loadCanvas)

type Phase = 'intro' | 'journey' | 'reveal' | 'ending'
type Mode = '3d' | 'film'
const MODE_KEY = 'festiverse.mode'

/** Caption windows (journey seconds) for acts 2–4. */
const CAPTIONS: [number, number][] = [
  [3.0, 7.6],
  [9.4, 14.6],
  [16.2, 19.8],
]

function phaseAt(t: number, started: boolean): Phase {
  if (!started) return 'intro'
  if (t >= ACT.ending) return 'ending'
  if (t >= ACT.reveal) return 'reveal'
  return 'journey'
}

export default function GreetingPage() {
  const { payload } = useParams()
  const greeting = useMemo(() => decodeGreeting(payload), [payload])
  const { t: uiT, setLang } = useI18n()
  if (!greeting) return <ErrorScreen title={uiT.invalidTitle} body={uiT.invalidSub} />
  return <Experience key={payload} greeting={greeting} onLang={setLang} />
}

function useSoundtrack() {
  const subscribe = useCallback((fn: () => void) => soundtrack.subscribe(fn), [])
  const on = useSyncExternalStore(subscribe, () => soundtrack.on)
  const status = useSyncExternalStore(subscribe, () => soundtrack.status)
  return { on, available: status === 'available' }
}

function Experience({ greeting, onLang }: { greeting: Greeting; onLang: (l: Lang) => void }) {
  const device = useMemo(() => detectDevice(), [])
  const capture = import.meta.env.DEV && new URLSearchParams(window.location.search).has('t')
  const [lang, setLang] = useState<Lang>(greeting.lang)
  const t = STRINGS[lang]
  const [mode, setMode] = useState<Mode>(() => {
    if (capture) return '3d'
    if (!device.webgl) return 'film'
    const stored = safeStorage.get(MODE_KEY)
    if (stored === '3d' || stored === 'film') return stored
    return device.reducedMotion || device.tier === 'low' ? 'film' : '3d'
  })
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<Phase>('intro')
  const [jt, setJt] = useState(0)
  const music = useSoundtrack()
  const displayName = t.displayName(greeting.name, greeting.kind)

  useEffect(() => {
    void soundtrack.detect()
    document.title = `${t.festivalTitle} · ${t.fromLine(greeting.name, greeting.kind)}`
    document.documentElement.lang = lang
  }, [t, greeting, lang])

  // Reset the shared clock for this greeting.
  useEffect(() => {
    journey.t = 0
    journey.started = false
    // Dev still-capture mode: /w/<payload>?t=12 freezes the journey at t.
    if (capture) {
      const tt = Number(new URLSearchParams(window.location.search).get('t'))
      journey.started = tt > 0
      journey.t = tt
      setPhase(phaseAt(tt, tt > 0))
    }
    return () => {
      journey.t = 0
      journey.started = false
    }
  }, [capture])

  // Master clock: advances journey.t in real time once started.
  useEffect(() => {
    if (capture) return
    let raf = 0
    let last = performance.now()
    let lastPhase: Phase = 'intro'
    let lastBucket = -1
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (journey.started) journey.t += dt
      const p = phaseAt(journey.t, journey.started)
      if (p !== lastPhase) {
        lastPhase = p
        setPhase(p)
      }
      const bucket = Math.floor(journey.t * 10)
      if (bucket !== lastBucket) {
        lastBucket = bucket
        setJt(journey.t)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [capture])

  const begin = () => {
    if (music.available) void soundtrack.setOn(true)
    journey.t = device.reducedMotion ? ACT.reveal : 0
    journey.started = true
  }
  const skip = () => {
    journey.t = Math.max(journey.t, ACT.reveal - 0.2)
  }
  const replay = () => {
    soundtrack.restart()
    journey.t = 0
    journey.started = true
  }
  const switchMode = () => {
    const next: Mode = mode === '3d' ? 'film' : '3d'
    safeStorage.set(MODE_KEY, next)
    setMode(next)
  }
  const fallback = useCallback(() => setMode('film'), [])
  const onReady = useCallback(() => setReady(true), [])
  useEffect(() => {
    if (mode === '3d') void loadCanvas()
  }, [mode])

  const canBegin = mode === 'film' || ready
  const revealed = phase === 'reveal' || phase === 'ending'

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink text-cream" lang={lang}>
      {mode === '3d' ? (
        <ErrorBoundary onError={fallback} fallback={<CinematicFilm jt={jt} started={phase !== 'intro'} reduced={device.reducedMotion} />}>
          <Suspense fallback={null}>
            <GreetingCanvas tier={capture ? 'high' : device.tier} onFallback={fallback} onReady={onReady} capture={capture} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <CinematicFilm jt={jt} started={phase !== 'intro'} reduced={device.reducedMotion} />
      )}

      {!capture && (
        <>
          <TopBar t={t} lang={lang} onLang={(l) => (setLang(l), onLang(l))} mode={mode} onMode={device.webgl ? switchMode : undefined} music={music} />

          {phase === 'intro' && (
            <div className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-between px-6 pt-[max(5.5rem,11vh)] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center">
              <div className="max-w-2xl animate-[fadeUp_1.6s_var(--ease-cine)_both]">
                <p className={`text-gold/90 ${lang === 'en' ? 'font-serif-display text-lg italic sm:text-xl' : 'text-base font-semibold'}`}>{t.introFrom(greeting.name, greeting.kind)}</p>
                <h1 className="glow-text mt-3 font-display text-[2.4rem] leading-[1.05] text-cream sm:text-6xl">{t.introTitle}</h1>
              </div>
              <button
                type="button"
                onClick={begin}
                disabled={!canBegin}
                className={`${btnPrimary} pointer-events-auto animate-[fadeUp_2.2s_var(--ease-cine)_both] px-8 text-lg`}
                autoFocus
              >
                <Sparkles className="h-5 w-5" />
                {canBegin ? t.begin : t.loadingWorld}
              </button>
            </div>
          )}

          {phase === 'journey' && (
            <>
              <div className="pointer-events-none fixed inset-x-0 bottom-[18vh] z-10 grid place-items-center px-6 text-center">
                {t.actCaptions.map((line, i) => {
                  const [a, b] = CAPTIONS[i]
                  const vis = jt >= a && jt <= b
                  return (
                    <p
                      key={i}
                      className={`glow-text col-start-1 row-start-1 font-display text-2xl transition-all duration-[1200ms] ease-cine sm:text-4xl ${vis ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-3 opacity-0 blur-sm'}`}
                    >
                      {line}
                    </p>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={skip}
                className="glass fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-cream/80"
              >
                {t.skip} <SkipForward className="h-4 w-4" />
              </button>
            </>
          )}

          {revealed && (
            <div className={`fixed inset-0 z-10 flex flex-col items-center overflow-x-hidden overflow-y-auto overscroll-contain px-5 pb-8 text-center ${phase === 'ending' ? 'pt-[9vh]' : 'pointer-events-none pt-[15vh]'}`}>
              <div aria-hidden="true" className="pointer-events-none absolute top-[4vh] left-1/2 -z-10 h-[56vh] w-[min(1100px,150vw)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(8,4,10,0.62),rgba(8,4,10,0.28)_62%,transparent)]" />
              <p className={`text-foil ${lang === 'en' ? 'font-serif-display text-2xl font-semibold tracking-[0.42em] uppercase sm:text-3xl' : 'font-display text-3xl sm:text-4xl'}`}>
                <NameReveal text={t.festivalTitle} play={revealed} reduced={device.reducedMotion} />
              </p>
              <p className={`mx-auto mt-4 max-w-md text-cream/85 transition-opacity delay-700 duration-[1600ms] ${lang === 'en' ? 'font-serif-display text-xl italic' : 'text-lg'}`}>
                {greeting.message || t.blessing}
              </p>
              <p className={`mt-7 text-gold ${lang === 'en' ? 'font-serif-display text-2xl italic' : 'text-xl font-semibold'}`}>{t.withLove}</p>
              <h2 className="name-centerpiece mt-1 max-w-5xl font-display text-[2.9rem] leading-[1.08] break-words sm:text-7xl lg:text-8xl">
                <NameReveal text={displayName} play={revealed} reduced={device.reducedMotion} delay={1.3} />
              </h2>

              {phase === 'ending' && <Ending t={t} lang={lang} onReplay={replay} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TopBar({
  t,
  lang,
  onLang,
  mode,
  onMode,
  music,
}: {
  t: Strings
  lang: Lang
  onLang: (l: Lang) => void
  mode: Mode
  onMode?: () => void
  music: { on: boolean; available: boolean }
}) {
  return (
    <div className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/" className="font-display text-lg text-cream/85 drop-shadow" aria-label="Festiverse 3D home">
        Festiverse <span className="text-gold">3D</span>
      </Link>
      <div className="flex items-center gap-2">
        <label className={`${btnIcon} relative w-auto px-3`}>
          <Globe className="h-4 w-4 text-gold" aria-hidden="true" />
          <span className="sr-only">Language</span>
          <select value={lang} onChange={(e) => onLang(e.target.value as Lang)} className="ml-1.5 cursor-pointer appearance-none bg-transparent text-sm font-semibold outline-none">
            {LANGS.map((l) => (
              <option key={l} value={l} className="bg-night">
                {l === 'en' ? 'EN' : l === 'hi' ? 'हि' : 'म'}
              </option>
            ))}
          </select>
        </label>
        {onMode && (
          <button type="button" onClick={onMode} className={btnIcon} aria-label={mode === '3d' ? t.liteMode : t.fullMode} title={mode === '3d' ? t.liteMode : t.fullMode}>
            {mode === '3d' ? <Clapperboard className="h-5 w-5" /> : <Box className="h-5 w-5" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => void soundtrack.toggle()}
          disabled={!music.available}
          className={`${btnIcon} disabled:cursor-not-allowed disabled:opacity-40`}
          aria-pressed={music.on}
          aria-label={!music.available ? t.musicUnavailable : music.on ? t.musicOff : t.musicOn}
          title={!music.available ? t.musicUnavailable : music.on ? t.musicOff : t.musicOn}
        >
          {music.on ? <Music2 className="h-5 w-5 text-gold" /> : <Music className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}

/** Act 6 — the viral ending with a working inline greeting generator. */
function Ending({ t, lang, onReplay }: { t: Strings; lang: Lang; onReplay: () => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SenderKind>('family')
  const [error, setError] = useState('')
  const [made, setMade] = useState<Greeting | null>(null)
  const url = made ? greetingUrl(made) : ''

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sanitizeText(name, NAME_MAX)) return setError(t.nameRequired)
    setError('')
    setMade(normalizeGreeting({ name, kind, lang, theme: 'ayodhya' }))
  }
  const pill = (on: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${on ? 'border-gold bg-gold/15 text-cream' : 'border-white/10 text-cream/65'}`

  return (
    <div data-ui className="mt-auto w-full max-w-md animate-[fadeUp_1s_var(--ease-cine)_both] pt-10">
      <div className="glass rounded-3xl bg-ink/80 p-5 text-left shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] sm:p-6">
        <p className={`text-gold ${lang === 'en' ? 'text-xs font-semibold tracking-[0.3em] uppercase' : 'text-sm font-semibold'}`}>{t.endingTitle}</p>
        <p className="mt-1.5 font-display text-xl leading-snug text-cream">{t.endingSub}</p>
        {!made ? (
          <form onSubmit={create} className="mt-4 flex flex-col gap-3" noValidate>
            <div className="flex gap-2">
              <button type="button" className={pill(kind === 'individual')} aria-pressed={kind === 'individual'} onClick={() => setKind('individual')}>
                <User className="h-4 w-4" /> {t.kindIndividual}
              </button>
              <button type="button" className={pill(kind === 'family')} aria-pressed={kind === 'family'} onClick={() => setKind('family')}>
                <Users className="h-4 w-4" /> {t.kindFamily}
              </button>
            </div>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError('')
              }}
              maxLength={NAME_MAX * 3}
              placeholder={kind === 'family' ? t.namePlaceholderFamily : t.namePlaceholderIndividual}
              aria-label={t.nameLabel}
              aria-invalid={!!error}
              enterKeyHint="go"
              className="w-full rounded-2xl border border-white/12 bg-ink/50 px-4 py-3 text-lg text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
            />
            {error && (
              <p className="text-sm text-ember" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className={`${btnPrimary} w-full`}>
              <Sparkles className="h-5 w-5" /> {t.createMy}
            </button>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-3" aria-live="polite">
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Greeting link" className="w-full truncate rounded-xl border border-white/10 bg-ink/60 px-3 py-2.5 font-mono text-xs text-cream/80" />
            <SharePanel url={url} shareText={STRINGS[made.lang].shareText(made.name, made.kind)} strings={t} />
            <div className="flex gap-3 text-sm">
              <Link to={greetingPath(made)} reloadDocument className="inline-flex flex-1 items-center justify-center gap-1.5 py-1.5 text-cream/75 hover:text-cream">
                <Sparkles className="h-4 w-4" /> {t.openPreview}
              </Link>
              <button type="button" onClick={() => setMade(null)} className="inline-flex flex-1 items-center justify-center gap-1.5 py-1.5 text-cream/75 hover:text-cream">
                <Pencil className="h-4 w-4" /> {t.editAgain}
              </button>
            </div>
          </div>
        )}
        <button type="button" onClick={onReplay} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 border-t border-white/10 pt-4 text-sm text-cream/70 hover:text-cream">
          <RotateCcw className="h-4 w-4" /> {t.replayExperience}
        </button>
      </div>
    </div>
  )
}
