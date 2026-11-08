import { describe, expect, it } from 'vitest'
import { decodeGreeting, encodeGreeting, greetingPath, normalizeGreeting, sanitizeText, NAME_MAX, MESSAGE_MAX } from './greeting'
import { STRINGS } from '../i18n/strings'
import { whatsappShareUrl } from './share'

describe('greeting payload', () => {
  it('round-trips an English family greeting', () => {
    const g = { name: 'Kulkarni', kind: 'family' as const, theme: 'royal' as const, lang: 'en' as const }
    expect(decodeGreeting(encodeGreeting(g))).toEqual(g)
  })

  it('round-trips Devanagari names and messages', () => {
    const g = { name: 'क्षितिज त्रिपाठी', kind: 'individual' as const, theme: 'cosmic' as const, lang: 'hi' as const, message: 'शुभ दीपावली! 🪔' }
    expect(decodeGreeting(encodeGreeting(g))).toEqual(g)
  })

  it('round-trips Marathi', () => {
    const g = { name: 'देशपांडे', kind: 'family' as const, theme: 'ayodhya' as const, lang: 'mr' as const }
    expect(decodeGreeting(encodeGreeting(g))).toEqual(g)
  })

  it('produces URL-safe payloads', () => {
    const p = encodeGreeting({ name: '???>>>~~~ ÿÿÿ', kind: 'individual' })
    expect(p).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(greetingPath({ name: 'A' })).toMatch(/^\/w\/[A-Za-z0-9_-]+$/)
  })

  it('accepts the legacy plain-base64 name format', () => {
    const g = decodeGreeting('S2F0ZSBGYW1pbHk') // "Kate Family"
    expect(g?.name).toBe('Kate')
    expect(g?.kind).toBe('family')
    expect(g?.theme).toBe('ayodhya')
  })

  it.each(['', '!!!', 'abc$%', 'a'.repeat(3000), '____', 'e30', 'eyJ2Ijo5LCJuIjoiWCJ9'])('rejects invalid payload %#', (p) => {
    expect(decodeGreeting(p)).toBeNull()
  })

  it('rejects payloads with an empty name', () => {
    const p = btoa(JSON.stringify({ v: 1, n: '   ', k: 'i', t: 'a', l: 'en' })).replace(/=+$/, '')
    expect(decodeGreeting(p)).toBeNull()
  })

  it('falls back to safe defaults for unknown theme / language', () => {
    const p = btoa(JSON.stringify({ v: 1, n: 'Asha', k: 'i', t: 'z', l: 'fr' })).replace(/=+$/, '')
    expect(decodeGreeting(p)).toEqual({ name: 'Asha', kind: 'individual', theme: 'ayodhya', lang: 'en' })
  })

  it('throws when encoding without a name', () => {
    expect(() => encodeGreeting({ name: '  ' })).toThrow()
  })
})

describe('sanitizeText', () => {
  it('strips markup brackets, control and bidi-override characters', () => {
    expect(sanitizeText('<script>Ra‮j\u0007</script>', 40)).toBe('scriptRa j /script')
  })
  it('collapses whitespace', () => {
    expect(sanitizeText('  The   Sharma \n family ', 40)).toBe('The Sharma family')
  })
  it('clamps by grapheme, not code unit', () => {
    expect(sanitizeText('x'.repeat(500), MESSAGE_MAX)).toHaveLength(MESSAGE_MAX)
    expect(sanitizeText('🪔'.repeat(NAME_MAX + 5), NAME_MAX)).toBe('🪔'.repeat(NAME_MAX))
  })
  it('removes duplicated family suffixes', () => {
    expect(normalizeGreeting({ name: 'Sharma Family', kind: 'family' }).name).toBe('Sharma')
    expect(normalizeGreeting({ name: 'शर्मा परिवार', kind: 'family' }).name).toBe('शर्मा')
    expect(normalizeGreeting({ name: 'Sharma Family', kind: 'individual' }).name).toBe('Sharma Family')
  })
})

describe('i18n', () => {
  it('every language defines every key', () => {
    const keys = Object.keys(STRINGS.en).sort()
    for (const lang of ['hi', 'mr'] as const) expect(Object.keys(STRINGS[lang]).sort()).toEqual(keys)
  })
  it('sender name appears in every personalised line', () => {
    for (const s of Object.values(STRINGS)) {
      for (const kind of ['individual', 'family'] as const) {
        expect(s.fromLine('Zed', kind)).toContain('Zed')
        expect(s.sentYou('Zed', kind)).toContain('Zed')
        expect(s.displayName('Zed', kind)).toContain('Zed')
        expect(s.shareText('Zed', kind)).toContain('Zed')
      }
      expect(s.captions.ayodhya.length).toBeGreaterThan(0)
    }
  })
})

describe('share', () => {
  it('builds a WhatsApp link with encoded text + url', () => {
    const u = whatsappShareUrl('Hi & bye', 'https://x.test/w/abc')
    expect(u.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(u.split('text=')[1])).toBe('Hi & bye\nhttps://x.test/w/abc')
  })
})
