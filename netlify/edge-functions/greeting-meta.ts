// Netlify Edge Function (free tier): rewrites the <title> / og:title of /w/* pages so
// WhatsApp link previews show the sender's name. The SPA works without it.
// Runs on Deno at the edge — intentionally excluded from the Vite/TS build.

interface Wire {
  v?: number
  n?: string
  k?: string
  l?: string
}

const TITLES: Record<string, (n: string, fam: boolean) => string> = {
  en: (n, f) => `${f ? `The ${n} Family` : n} sent you a Diwali world ✨`,
  hi: (n, f) => `${f ? `${n} परिवार` : n} ने आपको दिवाली का संसार भेजा है ✨`,
  mr: (n, f) => `${f ? `${n} कुटुंबाने` : `${n} यांनी`} तुम्हाला दिवाळीचे विश्व पाठवले आहे ✨`,
}

function decode(payload: string): { name: string; family: boolean; lang: string } | null {
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
    if (!text.startsWith('{')) return { name: text.replace(/\s+family$/i, ''), family: /\sfamily$/i.test(text), lang: 'en' }
    const w = JSON.parse(text) as Wire
    if (w.v !== 1 || typeof w.n !== 'string') return null
    return { name: w.n, family: w.k === 'f', lang: typeof w.l === 'string' && w.l in TITLES ? w.l : 'en' }
  } catch {
    return null
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const response = await context.next()
  const payload = new URL(request.url).pathname.split('/')[2]
  const info = payload ? decode(payload) : null
  if (!info || !(response.headers.get('content-type') ?? '').includes('text/html')) return response

  const name = escapeHtml(info.name.replace(/[\u0000-\u001F<>]/g, '').slice(0, 60))
  const title = TITLES[info.lang](name, info.family)
  const html = (await response.text())
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(html, { status: response.status, headers })
}
