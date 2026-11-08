import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isLang, type Lang } from '../lib/greeting'
import { STRINGS, type Strings } from './strings'
import { safeStorage } from '../lib/storage'

interface I18nValue {
  lang: Lang
  t: Strings
  setLang: (l: Lang) => void
}

const I18nContext = createContext<I18nValue | null>(null)
const KEY = 'festiverse.lang'

function detectLang(): Lang {
  const stored = safeStorage.get(KEY)
  if (isLang(stored)) return stored
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en'
  if (nav.startsWith('mr')) return 'mr'
  if (nav.startsWith('hi')) return 'hi'
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    safeStorage.set(KEY, l)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => ({ lang, t: STRINGS[lang], setLang }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
