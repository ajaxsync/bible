import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { VersionProvider } from './context/VersionContext.jsx'
import { ReadingSettingsProvider } from './context/ReadingSettingsContext.jsx'
import { SpeechReaderProvider } from './context/SpeechReaderContext.jsx'
import { PwaUpdateProvider } from './context/PwaUpdateContext.jsx'
import { ReadingStaminaProvider } from './context/ReadingStaminaContext.jsx'
import { applyAppTheme } from './config/env.js'
import { initPwaInstall } from './lib/pwaInstall.js'
import { initNativeShell } from './lib/nativeShell.js'
import App from './App.jsx'
import './index.css'
import './legacy-layout.css'

applyAppTheme()

initPwaInstall()
void initNativeShell()

const isNativeApp = Capacitor.isNativePlatform()
const Router = isNativeApp ? HashRouter : BrowserRouter
const routerBasename = isNativeApp
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router
      basename={routerBasename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <VersionProvider>
        <ReadingSettingsProvider>
          <SpeechReaderProvider>
            <PwaUpdateProvider>
              <ReadingStaminaProvider>
                <App />
              </ReadingStaminaProvider>
            </PwaUpdateProvider>
          </SpeechReaderProvider>
        </ReadingSettingsProvider>
      </VersionProvider>
    </Router>
  </StrictMode>,
)
