import { describe, expect, it } from 'vitest'
import { fetchYouTubeMeta, parseYouTubeId } from './youtube'
import { decodeGreeting, encodeGreeting, YT_ID_RE } from './greeting'
import { MAX_UPLOAD_BYTES, validateAudioFile } from './music'
import { MUSIC_LIBRARY, OWNER_SONG_ID } from './musicLibrary'

describe('parseYouTubeId', () => {
  it.each([
    ['https://youtu.be/mtdVqpPFJkk', 'mtdVqpPFJkk'],
    ['https://youtu.be/mtdVqpPFJkk?si=abc123', 'mtdVqpPFJkk'],
    ['https://www.youtube.com/watch?v=mtdVqpPFJkk', 'mtdVqpPFJkk'],
    ['https://www.youtube.com/watch?feature=share&v=mtdVqpPFJkk&t=30s', 'mtdVqpPFJkk'],
    ['https://m.youtube.com/watch?v=mtdVqpPFJkk', 'mtdVqpPFJkk'],
    ['https://music.youtube.com/watch?v=mtdVqpPFJkk&list=RD', 'mtdVqpPFJkk'],
    ['https://www.youtube.com/shorts/mtdVqpPFJkk', 'mtdVqpPFJkk'],
    ['https://www.youtube.com/embed/mtdVqpPFJkk', 'mtdVqpPFJkk'],
    ['https://www.youtube.com/live/mtdVqpPFJkk?feature=share', 'mtdVqpPFJkk'],
    ['youtube.com/watch?v=mtdVqpPFJkk', 'mtdVqpPFJkk'],
    ['  mtdVqpPFJkk  ', 'mtdVqpPFJkk'],
  ])('accepts %s', (input, id) => {
    expect(parseYouTubeId(input)).toBe(id)
  })

  it.each([
    '',
    'hello world',
    'https://vimeo.com/123456',
    'https://youtube.com.evil.example/watch?v=mtdVqpPFJkk',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=mtdVqpPFJkk<script>',
    'https://www.youtube.com/@BhaDiPa',
    'https://www.youtube.com/playlist?list=PL123',
    'javascript:alert(1)',
    'https://youtu.be/',
  ])('rejects %s', (input) => {
    expect(parseYouTubeId(input)).toBeNull()
  })
})

describe('fetchYouTubeMeta (oEmbed)', () => {
  const fake = (status: number, body: unknown = {}) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

  it('returns the real title and channel', async () => {
    const m = await fetchYouTubeMeta('mtdVqpPFJkk', fake(200, { title: 'Din Din Diwali', author_name: 'Bharatiya Digital Party' }))
    expect(m).toEqual({ status: 'ok', title: 'Din Din Diwali', author: 'Bharatiya Digital Party' })
  })
  it('reports embedding disabled (401/403)', async () => {
    expect(await fetchYouTubeMeta('mtdVqpPFJkk', fake(401))).toEqual({ status: 'blocked' })
    expect(await fetchYouTubeMeta('mtdVqpPFJkk', fake(403))).toEqual({ status: 'blocked' })
  })
  it('reports missing videos (400/404)', async () => {
    expect(await fetchYouTubeMeta('aaaaaaaaaaa', fake(400))).toEqual({ status: 'not-found' })
    expect(await fetchYouTubeMeta('aaaaaaaaaaa', fake(404))).toEqual({ status: 'not-found' })
  })
  it('reports network failure as unknown', async () => {
    const boom = (async () => {
      throw new TypeError('offline')
    }) as unknown as typeof fetch
    expect(await fetchYouTubeMeta('mtdVqpPFJkk', boom)).toEqual({ status: 'unknown' })
  })
})

describe('music in shared links', () => {
  const base = { name: 'Kulkarni', kind: 'family' as const, theme: 'ayodhya' as const, lang: 'mr' as const }

  it('round-trips a YouTube song with metadata', () => {
    const g = { ...base, music: { kind: 'youtube' as const, id: 'mtdVqpPFJkk', title: 'Din Din Diwali', author: 'Bharatiya Digital Party' } }
    expect(decodeGreeting(encodeGreeting(g))).toEqual(g)
  })
  it('round-trips "no music"', () => {
    const g = { ...base, music: { kind: 'none' as const } }
    expect(decodeGreeting(encodeGreeting(g))).toEqual(g)
  })
  it('omits the default soundtrack (old links stay identical)', () => {
    expect(encodeGreeting({ ...base, music: { kind: 'default' } })).toBe(encodeGreeting(base))
    expect(decodeGreeting(encodeGreeting(base))?.music).toBeUndefined()
  })
  it('drops an invalid video id but keeps the greeting', () => {
    const payload = btoa(JSON.stringify({ v: 1, n: 'Asha', k: 'i', t: 'a', l: 'en', mu: 'y', y: '"><img src=x>' })).replace(/=+$/, '')
    const g = decodeGreeting(payload)
    expect(g?.name).toBe('Asha')
    expect(g?.music).toBeUndefined()
  })
  it('sanitises song titles from the link', () => {
    const payload = btoa(
      unescape(encodeURIComponent(JSON.stringify({ v: 1, n: 'Asha', k: 'i', t: 'a', l: 'en', mu: 'y', y: 'mtdVqpPFJkk', yt: '<b>Hi</b>‮', ya: 'x'.repeat(200) }))),
    ).replace(/=+$/, '')
    const g = decodeGreeting(payload)
    expect(g?.music).toMatchObject({ kind: 'youtube', id: 'mtdVqpPFJkk', title: 'bHi/b' })
    expect((g?.music as { author: string }).author.length).toBeLessThanOrEqual(60)
  })
})

describe('validateAudioFile', () => {
  const yes = () => true
  it.each(['song.mp3', 'song.wav', 'song.m4a', 'song.ogg', 'SONG.MP3'])('accepts %s', (name) => {
    expect(validateAudioFile({ name, size: 3_000_000, type: '' }, yes).ok).toBe(true)
  })
  it.each([
    ['video.mp4', 'video/mp4'],
    ['notes.txt', 'text/plain'],
    ['song.flac', 'audio/flac'],
    ['song.exe', 'application/octet-stream'],
    ['song.mp3', 'text/html'],
  ])('rejects %s', (name, type) => {
    expect(validateAudioFile({ name, size: 1000, type }, yes)).toEqual({ ok: false, reason: 'type' })
  })
  it('rejects files over the size limit', () => {
    expect(validateAudioFile({ name: 'big.mp3', size: MAX_UPLOAD_BYTES + 1, type: 'audio/mpeg' }, yes)).toEqual({ ok: false, reason: 'size' })
  })
  it('rejects formats this browser cannot decode (e.g. OGG on Safari)', () => {
    expect(validateAudioFile({ name: 'a.ogg', size: 1000, type: 'audio/ogg' }, () => false)).toEqual({ ok: false, reason: 'type' })
  })
})

describe('music library', () => {
  it('uses valid, unique YouTube ids', () => {
    const ids = MUSIC_LIBRARY.map((s) => s.id)
    ids.forEach((id) => expect(id).toMatch(YT_ID_RE))
    expect(new Set(ids).size).toBe(ids.length)
  })
  it("lists the owner's Marathi song first", () => {
    const mr = MUSIC_LIBRARY.filter((s) => s.category === 'mr')
    expect(mr[0].id).toBe(OWNER_SONG_ID)
    expect(mr[0].ownerPick).toBe(true)
  })
  it('has songs in every category', () => {
    for (const c of ['hi', 'mr', 'en'] as const) expect(MUSIC_LIBRARY.some((s) => s.category === c)).toBe(true)
  })
})
