import { useState } from 'react'
import { Check, Clapperboard, Music2, Plus, Upload, VolumeX } from 'lucide-react'
import type { Strings } from '../../i18n/strings'
import { MUSIC_LIBRARY, type MusicCategory } from '../../lib/musicLibrary'
import { youtubeThumb } from '../../lib/youtube'
import type { ActiveMusic } from '../../lib/music'

export function musicKey(m: ActiveMusic | undefined): string {
  if (!m) return 'default'
  if (m.kind === 'youtube') return `yt:${m.id}`
  return m.kind
}

interface Props {
  t: Strings
  value: ActiveMusic
  onPick: (m: ActiveMusic) => void
  onAddOwn: () => void
  defaultAvailable: boolean | null
  /** Initial category tab. */
  initialCategory?: MusicCategory
}

export function SongPicker({ t, value, onPick, onAddOwn, defaultAvailable, initialCategory = 'mr' }: Props) {
  const [cat, setCat] = useState<MusicCategory>(value.kind === 'youtube' ? (MUSIC_LIBRARY.find((s) => s.id === value.id)?.category ?? initialCategory) : initialCategory)
  const key = musicKey(value)
  const custom = value.kind === 'youtube' && !MUSIC_LIBRARY.some((s) => s.id === value.id) ? value : null
  const tabs: [MusicCategory, string][] = [
    ['mr', t.musicCatMr],
    ['hi', t.musicCatHi],
    ['en', t.musicCatEn],
  ]
  const chip = (on: boolean) =>
    `flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition ${on ? 'border-gold bg-gold/15 text-cream' : 'border-white/10 bg-white/[0.03] text-cream/75 hover:border-white/25'}`

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`${chip(key === 'default')} disabled:cursor-not-allowed disabled:opacity-45`}
          aria-pressed={key === 'default'}
          disabled={defaultAvailable === false}
          onClick={() => onPick({ kind: 'default' })}
          title={defaultAvailable === false ? t.musicDefaultMissing : undefined}
        >
          <Clapperboard className="h-4 w-4 shrink-0 text-gold" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{t.musicDefault}</span>
            {defaultAvailable === false && <span className="block truncate text-[11px] text-cream/50">{t.musicDefaultMissing}</span>}
          </span>
        </button>
        <button type="button" className={chip(key === 'none')} aria-pressed={key === 'none'} onClick={() => onPick({ kind: 'none' })}>
          <VolumeX className="h-4 w-4 shrink-0" />
          <span className="font-medium">{t.musicNone}</span>
        </button>
      </div>

      {(custom || value.kind === 'local') && (
        <div className={`${chip(true)} cursor-default`}>
          {value.kind === 'local' ? <Upload className="h-4 w-4 shrink-0 text-gold" /> : <img src={youtubeThumb(custom!.id)} alt="" className="h-9 w-16 shrink-0 rounded-md object-cover" />}
          <span className="min-w-0">
            <span className="block truncate text-[11px] text-gold/80">{value.kind === 'local' ? t.musicYourUpload : t.musicSelected}</span>
            <span className="block truncate font-medium">{value.kind === 'local' ? value.name : custom!.title || custom!.id}</span>
          </span>
          <Check className="ml-auto h-4 w-4 shrink-0 text-gold" />
        </div>
      )}

      <div role="tablist" className="flex gap-1 rounded-full bg-white/[0.05] p-1 text-sm">
        {tabs.map(([c, label]) => (
          <button
            key={c}
            role="tab"
            type="button"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={`flex-1 truncate rounded-full px-2 py-1.5 font-medium transition ${cat === c ? 'bg-gold text-ink' : 'text-cream/70 hover:text-cream'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2" role="tabpanel">
        {MUSIC_LIBRARY.filter((s) => s.category === cat).map((s) => {
          const on = key === `yt:${s.id}`
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onPick({ kind: 'youtube', id: s.id, title: s.title, author: s.channel })}
                className={`group flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition ${on ? 'border-gold bg-gold/12' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
              >
                <span className="relative h-12 w-[84px] shrink-0 overflow-hidden rounded-xl bg-night">
                  <img src={youtubeThumb(s.id)} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  {on && (
                    <span className="absolute inset-0 grid place-items-center bg-ink/55">
                      <Check className="h-5 w-5 text-gold" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {s.ownerPick && <span className="mb-0.5 inline-block rounded-full bg-saffron/20 px-2 py-px text-[10px] font-semibold text-saffron">{t.musicOwnerPick}</span>}
                  <span className="line-clamp-2 block text-sm leading-snug text-cream">{s.title}</span>
                  <span className="block truncate text-xs text-cream/50">{s.channel} · YouTube</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={onAddOwn}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/50 px-4 py-3 font-semibold text-gold transition hover:bg-gold/10"
      >
        <Plus className="h-4 w-4" /> {t.musicAddOwn}
      </button>
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-cream/45">
        <Music2 className="mt-px h-3 w-3 shrink-0" /> {t.musicViaYoutube}
      </p>
    </div>
  )
}
