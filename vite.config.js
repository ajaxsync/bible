import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function serveVersesPlugin(versesDir) {
  return {
    name: 'serve-verses-from-biblebase',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/json/verses/')) return next()

        const relative = decodeURIComponent(req.url.replace('/json/verses/', ''))
        const filePath = path.join(versesDir, relative)

        if (!filePath.startsWith(versesDir) || !fs.existsSync(filePath)) {
          return next()
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const versesDir = path.resolve(__dirname, env.BIBLEBASE_VERSES_DIR || '../biblebase/public/json/verses')

  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), serveVersesPlugin(versesDir)],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
    server: {
      port: Number(env.DEV_PORT) || 3650,
      host: true,
    },
  }
})
