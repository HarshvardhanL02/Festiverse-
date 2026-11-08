import { Link } from 'react-router-dom'
import { Home, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { AmbientEmbers, Logo, btnGhost, btnPrimary } from '../components/ui/common'
import { useI18n } from '../i18n/I18nProvider'

export function ErrorScreen({ title, body }: { title: string; body?: string }) {
  const { t } = useI18n()
  useEffect(() => {
    document.title = `${title} · Festiverse 3D`
  }, [title])
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center">
      <AmbientEmbers count={14} />
      <div className="absolute top-5 left-4 sm:left-8">
        <Logo />
      </div>
      <svg viewBox="0 0 64 64" className="h-20 w-20 opacity-80" aria-hidden="true">
        <path d="M8 40 Q32 60 56 40 Z" fill="#f3c46b" />
        <ellipse cx="32" cy="40" rx="24" ry="4" fill="#8a5420" />
        <path d="M32 18 q2 6 0 12" stroke="#cdbfa5" strokeWidth="2" fill="none" opacity="0.6" />
      </svg>
      <h1 className="mt-6 max-w-lg font-display text-3xl text-cream sm:text-4xl">{title}</h1>
      {body && <p className="mt-3 max-w-md text-cream/70">{body}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/create" className={btnPrimary}>
          <Sparkles className="h-5 w-5" /> {t.createOwn}
        </Link>
        <Link to="/" className={btnGhost}>
          <Home className="h-4 w-4" /> {t.goHome}
        </Link>
      </div>
    </div>
  )
}

export default function NotFoundPage() {
  const { t } = useI18n()
  return <ErrorScreen title={t.notFoundTitle} />
}
