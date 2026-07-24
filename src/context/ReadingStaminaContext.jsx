import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  addReadingSeconds,
  getTodaySnapshot,
  recordChapterVisit,
} from '../lib/readingStamina.js'

const ReadingStaminaContext = createContext(null)

export function ReadingStaminaProvider({ children }) {
  const [snapshot, setSnapshot] = useState(getTodaySnapshot)
  const [promptOpen, setPromptOpen] = useState(false)
  const [completionStreak, setCompletionStreak] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)

  const refresh = useCallback(() => {
    setSnapshot(getTodaySnapshot())
  }, [])

  const tickReading = useCallback((seconds) => {
    const result = addReadingSeconds(seconds)
    setSnapshot(getTodaySnapshot())
    if (result.justCompleted) {
      setCompletionStreak(result.streak ?? getTodaySnapshot().streak)
      setPromptOpen(true)
    }
  }, [])

  const recordChapter = useCallback((book, chapter) => {
    recordChapterVisit(book, chapter)
    setSnapshot(getTodaySnapshot())
  }, [])

  const openPanel = useCallback(() => {
    refresh()
    setPanelOpen(true)
  }, [refresh])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
  }, [])

  const closePrompt = useCallback(() => {
    setPromptOpen(false)
  }, [])

  const openPanelFromPrompt = useCallback(() => {
    setPromptOpen(false)
    openPanel()
  }, [openPanel])

  const value = useMemo(
    () => ({
      todaySeconds: snapshot.seconds,
      todayCompleted: snapshot.completed,
      streak: snapshot.streak,
      longest: snapshot.longest,
      promptOpen,
      completionStreak,
      panelOpen,
      tickReading,
      recordChapter,
      refresh,
      openPanel,
      closePanel,
      closePrompt,
      openPanelFromPrompt,
    }),
    [
      snapshot,
      promptOpen,
      completionStreak,
      panelOpen,
      tickReading,
      recordChapter,
      refresh,
      openPanel,
      closePanel,
      closePrompt,
      openPanelFromPrompt,
    ],
  )

  return (
    <ReadingStaminaContext.Provider value={value}>
      {children}
    </ReadingStaminaContext.Provider>
  )
}

export function useReadingStamina() {
  const ctx = useContext(ReadingStaminaContext)
  if (!ctx) throw new Error('useReadingStamina must be used within ReadingStaminaProvider')
  return ctx
}
