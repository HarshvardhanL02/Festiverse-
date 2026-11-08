import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Dev-only: POST /__capture?name=act1 with a PNG data URL writes .stills-raw/act1.png.
 * Used to render the 2.5D film stills from the real 3D scene (see scripts/capture-stills.md).
 */
function stillCapture(): Plugin {
  return {
    name: 'festiverse-still-capture',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capture', (req, res) => {
        const url = new URL(req.url ?? '', 'http://x')
        const name = (url.searchParams.get('name') ?? '').replace(/[^\w-]/g, '')
        if (req.method !== 'POST' || !name) {
          res.statusCode = 400
          return res.end('bad request')
        }
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          const data = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, '')
          const dir = path.resolve(__dirname, '.stills-raw')
          mkdirSync(dir, { recursive: true })
          writeFileSync(path.join(dir, `${name}.png`), Buffer.from(data, 'base64'))
          res.end('ok')
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stillCapture()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
