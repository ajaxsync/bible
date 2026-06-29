import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { VersionProvider } from './context/VersionContext.jsx'
import { applyAppTheme } from './config/env.js'
import App from './App.jsx'
import './index.css'

applyAppTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <VersionProvider>
        <App />
      </VersionProvider>
    </BrowserRouter>
  </StrictMode>,
)
