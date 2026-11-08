import { useEffect, useId, useRef, useState } from 'react'
import { ExternalLink, Link2, Loader2, Upload, X } from 'lucide-react'
import type { Strings } from '../../i18n/strings'
import { fetchYouTubeMeta, parseYouTubeId, youtubeThumb, youtubeWatchUrl, type YouTubeMeta } from '../../lib/youtube'
import { validateAudioFile, type ActiveMusic } from '../../lib/music'
import { MUSIC_AUTHOR_MAX, MUSIC_TITLE_MAX, sanitizeText } from '../../lib/greeting'
import { btnPrimary } from '../ui/common'

interface Props {
  t: Strings
  open: boolean
  onClose: () => void
  onAdd: (m: ActiveMusic) => void
  /** Explain that uploads stay local (create page). */
  uploadNote?: string
}

type Tab = 'youtube' | 'upload'

export function AddSongModal({ t, open, onClose, onAdd, uploadNote }: Props) {
  const [tab, setTab] = useState<Tab>('youtube')
  const [link, setLink] = useState('')
  const [checking, setChecking] = useState(false)
  const [ytId, setYtId] = useState<string | null>(null)
  const [meta, setMeta] = useState<YouTubeMeta | null>(null)
  const [linkError, setLinkError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [rights, setRights] = useState(false)
  const ids = { title: useId(), link: useId(), file: useId() }
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setLink('')
      setYtId(null)
      setMeta(null)
      setLinkError('')
      setFile(null)
      setFileError('')
      setRights(false)
    }
  }, [open])

  if (!open) return null

  const check = async (e: React.FormEvent) => {
    e.preventDefault()
    setMeta(null)
    const id = parseYouTubeId(link)
    setYtId(id)
    if (!id) return setLinkError(t.musicYtInvalid)
    setLinkError('')
    setChecking(true)
    setMeta(await fetchYouTubeMeta(id))
    setChecking(false)
  }

  const pickFile = (f: File | null) => {
    setFile(null)
    setFileError('')
    if (!f) return
    const res = validateAudioFile(f)
    if (!res.ok) return setFileError(res.reason === 'size' ? t.musicUploadTooBig : t.musicUploadBadType)
    setFile(f)
  }

  const useYoutube = () => {
    if (!ytId || !meta || meta.status === 'blocked' || meta.status === 'not-found') return
    onAdd({
      kind: 'youtube',
      id: ytId,
      ...(meta.status === 'ok' ? { title: sanitizeText(meta.title, MUSIC_TITLE_MAX), author: sanitizeText(meta.author, MUSIC_AUTHOR_MAX) } : {}),
    })
    onClose()
  }

  const useUpload = () => {
    if (!file || !rights) return
    // Local only: an object URL in this tab. Nothing is uploaded or stored.
    onAdd({ kind: 'local', name: sanitizeText(file.name, 80) || 'audio', url: URL.createObjectURL(file) })
    onClose()
  }

  const tabBtn = (k: Tab, label: string, Icon: typeof Link2) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === k}
      onClick={() => setTab(k)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${tab === k ? 'bg-gold text-ink' : 'text-cream/70 hover:text-cream'}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        data-ui
        className="glass w-full max-w-md animate-[fadeUp_0.5s_var(--ease-cine)_both] rounded-t-3xl bg-night/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 id={ids.title} className="font-display text-2xl text-cream">
            {t.musicAddOwn}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.musicClose} className="rounded-full p-2 text-cream/70 hover:bg-white/10 hover:text-cream">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div role="tablist" className="mt-4 flex gap-1 rounded-full bg-white/[0.06] p-1">
          {tabBtn('youtube', t.musicAddYoutube, Link2)}
          {tabBtn('upload', t.musicAddUpload, Upload)}
        </div>

        {tab === 'youtube' ? (
          <form onSubmit={check} className="mt-5 flex flex-col gap-3" noValidate>
            <label htmlFor={ids.link} className="sr-only">
              {t.musicAddYoutube}
            </label>
            <div className="flex gap-2">
              <input
                id={ids.link}
                value={link}
                onChange={(e) => {
                  setLink(e.target.value)
                  setLinkError('')
                  setMeta(null)
                }}
                inputMode="url"
                placeholder={t.musicYtPlaceholder}
                aria-invalid={!!linkError}
                className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-ink/50 px-4 py-3 text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
              />
              <button type="submit" disabled={!link.trim() || checking} className="rounded-2xl bg-white/10 px-4 font-semibold text-cream hover:bg-white/15 disabled:opacity-40">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : t.musicYtCheck}
              </button>
            </div>
            {linkError && (
              <p role="alert" className="text-sm text-ember">
                {linkError}
              </p>
            )}
            {ytId && meta && (
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3" aria-live="polite">
                <div className="flex items-center gap-3">
                  <img src={youtubeThumb(ytId)} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 text-sm">
                    {meta.status === 'ok' && (
                      <>
                        <p className="line-clamp-2 text-cream">{meta.title}</p>
                        <p className="truncate text-cream/50">{meta.author}</p>
                      </>
                    )}
                    {meta.status === 'blocked' && <p className="text-ember">{t.musicYtBlocked}</p>}
                    {meta.status === 'not-found' && <p className="text-ember">{t.musicYtNotFound}</p>}
                    {meta.status === 'unknown' && <p className="text-cream/70">{t.musicYtUnknown}</p>}
                  </div>
                </div>
                {meta.status === 'blocked' ? (
                  <a href={youtubeWatchUrl(ytId)} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} w-full`}>
                    <ExternalLink className="h-4 w-4" /> {t.musicOpenYoutube}
                  </a>
                ) : meta.status !== 'not-found' ? (
                  <button type="button" onClick={useYoutube} className={`${btnPrimary} w-full`}>
                    {t.musicUseSong}
                  </button>
                ) : null}
              </div>
            )}
            <p className="text-[11px] text-cream/45">{t.musicViaYoutube}</p>
          </form>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            <label
              htmlFor={ids.file}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed border-gold/40 px-4 py-6 text-center transition hover:bg-gold/5"
            >
              <Upload className="h-6 w-6 text-gold" />
              <span className="font-semibold text-cream">{file ? file.name : t.musicUploadPick}</span>
              <span className="text-xs text-cream/50">{t.musicUploadHint}</span>
            </label>
            <input
              id={ids.file}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.oga,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {fileError && (
              <p role="alert" className="text-sm text-ember">
                {fileError}
              </p>
            )}
            <label className="flex items-start gap-2.5 text-sm text-cream/80">
              <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#f3c46b]" />
              {t.musicUploadRights}
            </label>
            <p className="rounded-xl bg-white/[0.04] p-3 text-xs leading-relaxed text-cream/60">{uploadNote ?? t.musicUploadLocalNote}</p>
            <button type="button" disabled={!file || !rights} onClick={useUpload} className={`${btnPrimary} w-full`}>
              {t.musicUseSong}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
