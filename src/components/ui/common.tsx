import { Link } from 'react-router-dom'
import { Globe, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { LANGS, type Lang } from '../../lib/greeting'
import { STRINGS } from '../../i18n/strings'
import { useI18n } from '../../i18n/I18nProvider'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="Festiverse 3D home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs>
          <radialGradient id="lg" cx="0.5" cy="0.35" r="0.6">
            <stop offset="0" stopColor="#fff2c9" />
            <stop offset="0.5" stopColor="#ff9a3c" />
            <stop offset="1" stopColor="#ff5f2e" />
          </radialGradient>
        </defs>
        <path d="M16 3 C19 9 21 12 21 15.5 A5 5 0 0 1 11 15.5 C11 12 13 9 16 3Z" fill="url(#lg)" className="flame" />
        <path d="M4 20 Q16 31 28 20 Z" fill="#f3c46b" />
        <ellipse cx="16" cy="20" rx="12" ry="2" fill="#b9772a" />
      </svg>
      <span className="font-display text-xl tracking-wide text-cream">
        Festiverse <span className="text-gold">3D</span>
      </span>
    </Link>
  )
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n()
  return (
    <label className="glass relative inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-3 text-sm text-cream/90">
      <Globe className="h-4 w-4 text-gold" aria-hidden="true" />
      <span className="sr-only">Language</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-medium outline-none"
      >
        {LANGS.map((l) => (
          <option key={l} value={l} className="bg-night text-cream">
            {compact ? l.toUpperCase() : STRINGS[l].langName}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-cream/80" role="status">
      <Loader2 className="h-7 w-7 animate-spin text-gold" aria-hidden="true" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}

/** CSS-only rising embers. Hidden automatically for reduced-motion users. */
export function AmbientEmbers({ count = 26 }: { count?: number }) {
  const embers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const size = 3 + ((i * 37) % 7)
        return {
          left: `${(i * 61) % 100}%`,
          size,
          delay: `${-((i * 1.7) % 14)}s`,
          duration: `${9 + ((i * 13) % 9)}s`,
          drift: `${((i * 29) % 80) - 40}px`,
        }
      }),
    [count],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={
            {
              left: e.left,
              bottom: '-20px',
              width: e.size,
              height: e.size,
              animationDelay: e.delay,
              animationDuration: e.duration,
              '--drift': e.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-marigold to-saffron px-6 py-3.5 font-semibold text-ink shadow-[0_8px_32px_-6px_rgba(255,154,60,0.65)] transition duration-300 ease-cine hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-6px_rgba(255,154,60,0.8)] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none'

export const btnGhost =
  'glass inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-medium text-cream transition duration-300 ease-cine hover:bg-white/10 active:scale-[0.98]'

export const btnIcon =
  'glass inline-flex h-11 w-11 items-center justify-center rounded-full text-cream transition hover:bg-white/10 active:scale-95'
