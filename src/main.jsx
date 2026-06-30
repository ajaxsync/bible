import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { VersionProvider } from './context/VersionContext.jsx'
import { ReadingSettingsProvider } from './context/ReadingSettingsContext.jsx'
import { SpeechReaderProvider } from './context/SpeechReaderContext.jsx'
import { PwaUpdateProvider } from './context/PwaUpdateContext.jsx'
import { applyAppTheme } from './config/env.js'
import { initPwaInstall } from './lib/pwaInstall.js'
import App from './App.jsx'
import './index.css'

applyAppTheme()

initPwaInstall()

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
          <SpeechReaderProvider>
            <PwaUpdateProvider>
              <App />
            </PwaUpdateProvider>
          </SpeechReaderProvider>
        </ReadingSettingsProvider>
      </VersionProvider>
    </BrowserRouter>
  </StrictMode>,
)
