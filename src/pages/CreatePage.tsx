import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Sparkles, User, Users } from 'lucide-react'
import { LanguageSwitcher, Logo, btnGhost, btnPrimary } from '../components/ui/common'
import { Still } from '../components/ui/Still'
import { SharePanel } from '../components/ui/SharePanel'
import { useI18n } from '../i18n/I18nProvider'
import { STRINGS } from '../i18n/strings'
import {
  LANGS,
  MESSAGE_MAX,
  NAME_MAX,
  greetingPath,
  greetingUrl,
  normalizeGreeting,
  sanitizeText,
  splitGraphemes,
  type Greeting,
  type Lang,
  type SenderKind,
} from '../lib/greeting'

export default function CreatePage() {
  const { t, lang: uiLang } = useI18n()
  const ids = { name: useId(), msg: useId(), err: useId() }

  const [name, setName] = useState('')
  const [kind, setKind] = useState<SenderKind>('family')
  // One flagship world for now; the link format keeps a theme field so more can be added later.
  const theme = 'ayodhya' as const
  const [lang, setLang] = useState<Lang>(uiLang)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Greeting | null>(null)

  // Follow UI language changes until the user explicitly picks a greeting language.
  const [langTouched, setLangTouched] = useState(false)
  useEffect(() => {
    if (!langTouched) setLang(uiLang)
  }, [uiLang, langTouched])

  useEffect(() => {
    document.title = `${t.createTitle} · Festiverse 3D`
  }, [t.createTitle])

  const nameLen = splitGraphemes(name).length
  const msgLen = splitGraphemes(message).length
  const gt = STRINGS[lang]
  const previewName = sanitizeText(name, NAME_MAX) || (kind === 'family' ? t.namePlaceholderFamily : t.namePlaceholderIndividual).replace(/^(e\.g\.|जैसे:|उदा\.)\s*/, '')

  const url = useMemo(() => (result ? greetingUrl(result) : ''), [result])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!sanitizeText(name, NAME_MAX)) {
      setError(t.nameRequired)
      return
    }
    setError('')
    setResult(normalizeGreeting({ name, kind, theme, lang, message }))
    requestAnimationFrame(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const pill = (active: boolean) =>
    `flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-medium transition duration-300 ease-cine ${
      active ? 'border-gold bg-gold/15 text-cream' : 'border-white/10 bg-white/[0.03] text-cream/70 hover:border-white/25'
    }`

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,rgba(124,108,255,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(255,154,60,0.12),transparent_60%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-5 sm:px-8">
        <Logo />
        <LanguageSwitcher />
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:py-16">
        <section>
          <h1 className="font-display text-4xl text-cream sm:text-5xl">{t.createTitle}</h1>
          <p className="mt-2 text-cream/65">{t.createSub}</p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-7" noValidate>
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold text-cream/80">{t.kindLabel}</legend>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className={pill(kind === 'individual')} aria-pressed={kind === 'individual'} onClick={() => setKind('individual')}>
                  <User className="h-4 w-4" /> {t.kindIndividual}
                </button>
                <button type="button" className={pill(kind === 'family')} aria-pressed={kind === 'family'} onClick={() => setKind('family')}>
                  <Users className="h-4 w-4" /> {t.kindFamily}
                </button>
              </div>
            </fieldset>

            <div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <label htmlFor={ids.name} className="text-sm font-semibold text-cream/80">
                  {t.nameLabel}
                </label>
                <span className={`text-xs ${nameLen > NAME_MAX ? 'text-ember' : 'text-cream/40'}`}>
                  {nameLen}/{NAME_MAX}
                </span>
              </div>
              <input
                id={ids.name}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError('')
                  if (result) setResult(null)
                }}
                maxLength={NAME_MAX * 3}
                autoComplete="name"
                enterKeyHint="done"
                placeholder={kind === 'family' ? t.namePlaceholderFamily : t.namePlaceholderIndividual}
                aria-invalid={!!error}
                aria-describedby={error ? ids.err : undefined}
                className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-lg text-cream placeholder:text-cream/30 focus:border-gold focus:bg-white/[0.06] focus:outline-none"
              />
              {error && (
                <p id={ids.err} className="mt-2 text-sm text-ember" role="alert">
                  {error}
                </p>
              )}
            </div>


            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold text-cream/80">{t.langLabel}</legend>
              <div className="grid grid-cols-3 gap-3">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={pill(lang === l)}
                    aria-pressed={lang === l}
                    onClick={() => {
                      setLang(l)
                      setLangTouched(true)
                      setResult(null)
                    }}
                  >
                    {STRINGS[l].langName}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <label htmlFor={ids.msg} className="text-sm font-semibold text-cream/80">
                  {t.messageLabel} <span className="font-normal text-cream/40">({t.optional})</span>
                </label>
                <span className={`text-xs ${msgLen > MESSAGE_MAX ? 'text-ember' : 'text-cream/40'}`}>
                  {msgLen}/{MESSAGE_MAX}
                </span>
              </div>
              <textarea
                id={ids.msg}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  if (result) setResult(null)
                }}
                rows={3}
                maxLength={MESSAGE_MAX * 3}
                placeholder={gt.messagePlaceholder}
                className="w-full resize-none rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
              />
            </div>

            <button type="submit" className={`${btnPrimary} w-full text-lg`}>
              <Sparkles className="h-5 w-5" />
              {t.generate}
            </button>
          </form>
        </section>

        {/* Live preview + result */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_30px_80px_-30px_rgba(255,154,60,0.35)]">
            <Still id="act4" eager className="aspect-[4/5] w-full sm:aspect-[16/12]" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-center sm:p-8" lang={lang}>
              <p className="text-foil font-display text-3xl leading-tight sm:text-4xl">{gt.festivalTitle}</p>
              <p className="glow-text mt-2 font-display text-xl text-cream sm:text-2xl">{gt.fromLine(previewName, kind)}</p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-cream/70">{sanitizeText(message, MESSAGE_MAX) || gt.defaultWish}</p>
            </div>
          </div>

          {result && (
            <div id="result" className="glass mt-6 rounded-3xl p-6" aria-live="polite">
              <h2 className="font-display text-2xl text-gold">{t.linkReady}</h2>
              <p className="mt-1 text-sm text-cream/65">{t.linkReadySub}</p>
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Greeting link"
                className="mt-4 w-full truncate rounded-xl border border-white/10 bg-ink/60 px-3 py-2.5 font-mono text-xs text-cream/80"
              />
              <div className="mt-4">
                <SharePanel url={url} shareText={STRINGS[result.lang].shareText(result.name, result.kind)} />
              </div>
              <div className="mt-3 flex gap-3">
                <Link to={greetingPath(result)} className={`${btnGhost} flex-1`}>
                  <Eye className="h-4 w-4" /> {t.preview}
                </Link>
                <button type="button" className={`${btnGhost} flex-1`} onClick={() => document.getElementById(ids.name)?.focus()}>
                  <Pencil className="h-4 w-4" /> {t.editAgain}
                </button>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
