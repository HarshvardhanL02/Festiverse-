import { useEffect, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { canNativeShare, copyText, nativeShare, whatsappShareUrl } from '../../lib/share'
import { useI18n } from '../../i18n/I18nProvider'
import type { Strings } from '../../i18n/strings'
import { btnGhost } from './common'

export function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.86 9.86 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.22-.08-.39-.12-.55.13-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06a6.74 6.74 0 0 1-3.37-2.95c-.25-.44.25-.41.72-1.36.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3c-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.17 1.74 2.66 4.22 3.73 1.57.68 2.18.74 2.97.62.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.3Z" />
    </svg>
  )
}

interface Props {
  url: string
  shareText: string
  title?: string
  compact?: boolean
  /** Override labels (the greeting page can be in a different language than the site UI). */
  strings?: Strings
}

export function SharePanel({ url, shareText, title = 'Festiverse 3D', compact = false, strings }: Props) {
  const { t: uiT } = useI18n()
  const t = strings ?? uiT
  const [copied, setCopied] = useState(false)
  const [nativeOk, setNativeOk] = useState(false)

  useEffect(() => setNativeOk(canNativeShare()), [])
  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(id)
  }, [copied])

  return (
    <div className={`flex flex-col gap-3 ${compact ? '' : 'w-full'}`}>
      <a
        href={whatsappShareUrl(shareText, url)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3.5 font-semibold text-[#062a14] shadow-[0_8px_30px_-8px_rgba(37,211,102,0.7)] transition duration-300 ease-cine hover:-translate-y-0.5 active:translate-y-0"
      >
        <WhatsAppIcon />
        {t.shareWhatsApp}
      </a>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={async () => setCopied(await copyText(url))}
          className={`${btnGhost} flex-1`}
          aria-live="polite"
        >
          {copied ? <Check className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />}
          {copied ? t.copied : t.copy}
        </button>
        {nativeOk && (
          <button
            type="button"
            onClick={() => nativeShare({ title, text: shareText, url })}
            className={`${btnGhost} flex-1`}
          >
            <Share2 className="h-4 w-4" />
            {t.shareMore}
          </button>
        )}
      </div>
    </div>
  )
}
