import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: true },
        includeAssets: ['favicon.svg'],
        manifest: {
          name: env.VITE_APP_TITLE || 'Bible · Reader',
          short_name: env.VITE_APP_NAME || 'Bible',
          description: '圣经阅读器',
          theme_color: env.VITE_ACCENT_COLOR || '#2383e2',
          background_color: '#f7f6f3',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            {
              src: `${base}favicon.svg`.replace(/\/+/g, '/'),
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: `${base}favicon.svg`.replace(/\/+/g, '/'),
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
          globIgnores: ['**/json/**', '**/cache-manifest.json'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/json\//],
        },
      }),
    ],
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
