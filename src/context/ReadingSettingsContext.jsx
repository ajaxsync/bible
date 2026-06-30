import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  FONT_SIZES,
  LINE_HEIGHTS,
  getThemeById,
  loadReadingSettings,
  storeReadingSettings,
} from '../data/readingThemes.js'

const ReadingSettingsContext = createContext(null)

function applyReadingTheme(settings) {
  const root = document.documentElement
  const theme = getThemeById(settings.themeId)
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.style.setProperty('--reader-font-size', `${settings.fontSize}px`)
  root.style.setProperty('--reader-line-height', String(settings.lineHeight))
  root.dataset.readingTheme = settings.themeId
}

export function ReadingSettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => {
    const loaded = loadReadingSettings()
    applyReadingTheme(loaded)
    return loaded
  })

  const setSettings = (patch) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      storeReadingSettings(next)
      return next
    })
  }

  const setFontSize = (fontSize) => setSettings({ fontSize })
  const setLineHeight = (lineHeight) => setSettings({ lineHeight })
  const setThemeId = (themeId) => setSettings({ themeId })

  const adjustFontSize = (delta) => {
    setSettingsState((prev) => {
      const idx = FONT_SIZES.indexOf(prev.fontSize)
      const nextIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))
      const next = { ...prev, fontSize: FONT_SIZES[nextIdx] }
      storeReadingSettings(next)
      return next
    })
  }

  const adjustLineHeight = (delta) => {
    setSettingsState((prev) => {
      const idx = LINE_HEIGHTS.indexOf(prev.lineHeight)
      const nextIdx = Math.max(0, Math.min(LINE_HEIGHTS.length - 1, idx + delta))
      const next = { ...prev, lineHeight: LINE_HEIGHTS[nextIdx] }
      storeReadingSettings(next)
      return next
    })
  }

  useEffect(() => {
    applyReadingTheme(settings)
  }, [settings])

  const value = useMemo(
    () => ({
      settings,
      theme: getThemeById(settings.themeId),
      setFontSize,
      setLineHeight,
      setThemeId,
      adjustFontSize,
      adjustLineHeight,
    }),
    [settings],
  )

  return (
    <ReadingSettingsContext.Provider value={value}>
      {children}
    </ReadingSettingsContext.Provider>
  )
}

export function useReadingSettings() {
  const ctx = useContext(ReadingSettingsContext)
  if (!ctx) throw new Error('useReadingSettings must be used within ReadingSettingsProvider')
  return ctx
}
