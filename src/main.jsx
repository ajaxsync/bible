import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { VersionProvider } from './context/VersionContext.jsx'
import { ReadingSettingsProvider } from './context/ReadingSettingsContext.jsx'
import { applyAppTheme } from './config/env.js'
import { initPwaInstall } from './lib/pwaInstall.js'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

applyAppTheme()

initPwaInstall()
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter
      basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <VersionProvider>
        <ReadingSettingsProvider>
          <App />
        </ReadingSettingsProvider>
      </VersionProvider>
    </BrowserRouter>
  </StrictMode>,
)
