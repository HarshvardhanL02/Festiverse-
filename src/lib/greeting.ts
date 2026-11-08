/**
 * Greeting payload encoding.
 *
 * Every greeting lives entirely inside its URL: /w/<payload>
 * The payload is base64url(UTF-8 JSON) with short keys. No database needed.
 */

export const THEMES = ['ayodhya', 'royal', 'cosmic'] as const
export type ThemeId = (typeof THEMES)[number]

export const LANGS = ['en', 'hi', 'mr'] as const
export type Lang = (typeof LANGS)[number]

export const SENDER_KINDS = ['individual', 'family'] as const
export type SenderKind = (typeof SENDER_KINDS)[number]

export const NAME_MAX = 40
export const MESSAGE_MAX = 140
const PAYLOAD_VERSION = 1

export interface Greeting {
  name: string
  kind: SenderKind
  theme: ThemeId
  lang: Lang
  message?: string
}

interface WirePayload {
  v: number
  n: string
  k: 'i' | 'f'
  t: 'a' | 'r' | 'c'
  l: Lang
  m?: string
}

const THEME_CODE: Record<ThemeId, WirePayload['t']> = { ayodhya: 'a', royal: 'r', cosmic: 'c' }
const CODE_THEME: Record<string, ThemeId> = { a: 'ayodhya', r: 'royal', c: 'cosmic' }

/** Collapse whitespace, strip control / bidi-override / markup characters, clamp length by grapheme. */
export function sanitizeText(input: unknown, max: number): string {
  if (typeof input !== 'string') return ''
  const cleaned = input
    // control chars, zero-width joiners are kept (needed for Devanagari), bidi overrides removed
    .replace(/[\u0000-\u001F\u007F-\u009F‪-‮⁦-⁩]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return clampGraphemes(cleaned, max)
}

export function splitGraphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (Seg) {
    return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
  }
  return Array.from(text)
}

function clampGraphemes(text: string, max: number): string {
  const g = splitGraphemes(text)
  return g.length > max ? g.slice(0, max).join('').trim() : text
}

export function isTheme(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEMES as readonly string[]).includes(v)
}
export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v)
}

/** Removes a trailing "family / परिवार / कुटुंब" so we don't print "the Sharma Family Family". */
export function stripFamilySuffix(name: string): string {
  return name.replace(/\s+(family|parivar|parivaar|परिवार|कुटुंब|कुटुंबीय|परिवारा)$/i, '').trim() || name
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64: string): string {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export class GreetingError extends Error {}

export function normalizeGreeting(input: Partial<Greeting>): Greeting {
  const name = sanitizeText(input.name, NAME_MAX)
  if (!name) throw new GreetingError('Name is required')
  const kind: SenderKind = input.kind === 'family' ? 'family' : 'individual'
  const message = sanitizeText(input.message, MESSAGE_MAX)
  return {
    name: kind === 'family' ? stripFamilySuffix(name) : name,
    kind,
    theme: isTheme(input.theme) ? input.theme : 'ayodhya',
    lang: isLang(input.lang) ? input.lang : 'en',
    ...(message ? { message } : {}),
  }
}

export function encodeGreeting(input: Partial<Greeting>): string {
  const g = normalizeGreeting(input)
  const wire: WirePayload = {
    v: PAYLOAD_VERSION,
    n: g.name,
    k: g.kind === 'family' ? 'f' : 'i',
    t: THEME_CODE[g.theme],
    l: g.lang,
    ...(g.message ? { m: g.message } : {}),
  }
  return toBase64Url(JSON.stringify(wire))
}

/**
 * Decodes a payload. Returns null for anything malformed — callers show the
 * "invalid link" screen. Also accepts legacy plain base64 names (e.g. "S2F0ZSBGYW1pbHk").
 */
export function decodeGreeting(payload: string | undefined | null): Greeting | null {
  if (!payload || payload.length > 2000 || !/^[A-Za-z0-9_\-+/=]+$/.test(payload)) return null
  let text: string
  try {
    text = fromBase64Url(payload)
  } catch {
    return null
  }
  try {
    if (text.startsWith('{')) {
      const raw = JSON.parse(text) as Partial<WirePayload>
      if (!raw || typeof raw !== 'object' || raw.v !== PAYLOAD_VERSION) return null
      return normalizeGreeting({
        name: raw.n,
        kind: raw.k === 'f' ? 'family' : 'individual',
        theme: CODE_THEME[raw.t ?? 'a'],
        lang: raw.l,
        message: raw.m,
      })
    }
    // Legacy / simple form: the whole payload is just a name.
    const isFamily = /\s(family|परिवार|कुटुंब)$/i.test(text.trim())
    return normalizeGreeting({ name: text, kind: isFamily ? 'family' : 'individual' })
  } catch {
    return null
  }
}

export function greetingPath(input: Partial<Greeting>): string {
  return `/w/${encodeGreeting(input)}`
}

export function greetingUrl(input: Partial<Greeting>, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin}${greetingPath(input)}`
}
