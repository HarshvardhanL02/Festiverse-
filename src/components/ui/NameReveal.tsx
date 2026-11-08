import { useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { splitGraphemes } from '../../lib/greeting'

/**
 * Cinematic name reveal. Latin text animates per letter; Indic scripts animate
 * per word so conjunct shaping (e.g. क्ष, त्र) is never broken across spans.
 */
export function NameReveal({ text, play, reduced, className = '', delay = 0 }: { text: string; play: boolean; reduced: boolean; className?: string; delay?: number }) {
  const root = useRef<HTMLSpanElement>(null)
  // Words never break internally; Latin words animate per letter, Indic words as a whole
  // (so conjunct shaping such as क्ष / त्र is never split across spans).
  const words = useMemo(() => {
    const indic = /[ऀ-ॿ]/.test(text)
    return text
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (indic ? [w] : splitGraphemes(w)))
  }, [text])
  const count = words.reduce((n, w) => n + w.length, 0)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const chars = el.querySelectorAll<HTMLElement>('[data-piece]')
    if (!play) {
      gsap.set(chars, { opacity: 0 })
      return
    }
    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.02, delay, clearProps: 'opacity' })
        return
      }
      gsap.fromTo(
        chars,
        { opacity: 0, yPercent: 40, scale: 1.25, filter: 'blur(16px)' },
        {
          opacity: 1,
          yPercent: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.9,
          delay,
          ease: 'expo.out',
          // Drop leftover transform/filter so text rendering (and gradient clipping) is clean afterwards.
          clearProps: 'transform,filter,opacity',
          stagger: { each: Math.min(0.08, 1.2 / Math.max(count, 1)) },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [play, reduced, count, text, delay])

  return (
    <span ref={root} className={className} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap" aria-hidden="true">
          {w.map((p, i) => (
            <span key={i} data-piece className="inline-block whitespace-pre will-change-transform">
              {p}
            </span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  )
}
