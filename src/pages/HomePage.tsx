import { Link } from 'react-router-dom'
import { ArrowRight, Code, Play } from 'lucide-react'
import { useEffect } from 'react'
import { AmbientEmbers, LanguageSwitcher, Logo, btnGhost, btnPrimary } from '../components/ui/common'
import { Still } from '../components/ui/Still'
import { useI18n } from '../i18n/I18nProvider'
import { greetingPath } from '../lib/greeting'
import { REPO_URL } from '../lib/config'

const ACT_STILLS = ['act1', 'act2', 'act3', 'act4'] as const

export default function HomePage() {
  const { t, lang } = useI18n()
  const demo = greetingPath({ name: 'Festiverse', kind: 'family', theme: 'ayodhya', lang })

  useEffect(() => {
    document.title = `Festiverse 3D — ${t.tagline}`
    const id = window.setTimeout(() => void import('./CreatePage'), 1500)
    return () => window.clearTimeout(id)
  }, [t.tagline])

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <section className="relative isolate flex min-h-dvh flex-col">
        <div className="absolute inset-0 -z-10">
          <Still id="act4" eager className="h-full w-full" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/10 to-ink" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-transparent" />
        </div>
        <AmbientEmbers count={18} />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-5 sm:px-8">
          <Logo />
          <LanguageSwitcher />
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-4 pb-16 sm:px-8 sm:pb-24">
          <p className={`mb-4 font-semibold text-gold ${lang === 'en' ? 'text-sm tracking-[0.25em] uppercase' : 'text-base'}`}>{t.tagline}</p>
          <h1 className="glow-text max-w-3xl font-display text-[2.6rem] leading-[1.08] text-cream sm:text-6xl lg:text-7xl">{t.heroTitle}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/80">{t.heroSub}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/create" className={btnPrimary}>
              {t.ctaCreate}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to={demo} className={btnGhost}>
              <Play className="h-4 w-4 text-gold" />
              {t.ctaSeeDemo}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <h2 className="font-display text-3xl text-cream sm:text-4xl">{t.journeyTitle}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {t.journeyActs.map((act, i) => (
            <figure key={i} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-night">
              <img
                src={`/stills/${ACT_STILLS[i]}.webp`}
                alt={act.title}
                loading="lazy"
                decoding="async"
                className="aspect-[16/9] w-full object-cover transition duration-[1200ms] ease-cine group-hover:scale-105"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent p-5 pt-16">
                <p className="text-xs font-semibold tracking-[0.2em] text-gold/80">{['I', 'II', 'III', 'IV'][i]}</p>
                <h3 className="font-display text-2xl text-cream">{act.title}</h3>
                <p className="mt-1 text-cream/70">{act.text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <h2 className="font-display text-3xl text-cream sm:text-4xl">{t.howTitle}</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {[t.how1, t.how2, t.how3].map((step, i) => (
            <li key={i} className="border-t border-gold/25 pt-5">
              <span className="font-display text-4xl text-saffron">{['१', '२', '३'][i]}</span>
              <p className="mt-3 text-lg leading-relaxed text-cream/80">{step}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12">
          <Link to="/create" className={btnPrimary}>
            {t.ctaCreate}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-cream/60 sm:flex-row sm:items-center sm:px-8">
          <p>{t.openSource}</p>
          {REPO_URL && (
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-gold">
              <Code className="h-4 w-4" /> Source code (MIT)
            </a>
          )}
        </div>
      </footer>
    </div>
  )
}
