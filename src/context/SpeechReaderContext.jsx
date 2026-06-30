import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { SpeechReader, buildVerseQueue, getChapterVerseTotal, isSpeechSupported } from '../lib/speechReader.js'

const SpeechReaderContext = createContext(null)

export function SpeechReaderProvider({ children }) {
  const [status, setStatus] = useState('idle')
  const [currentVerse, setCurrentVerse] = useState(null)
  const [verseTotal, setVerseTotal] = useState(0)
  const [location, setLocation] = useState(null)
  const chapterRef = useRef(null)
  const readerRef = useRef(null)

  useEffect(() => {
    readerRef.current = new SpeechReader({
      onVerseChange: setCurrentVerse,
      onStatusChange: setStatus,
      onComplete: () => {
        setCurrentVerse(null)
        setLocation(null)
        setVerseTotal(0)
      },
    })
    return () => readerRef.current?.destroy()
  }, [])

  const registerChapter = useCallback((payload) => {
    chapterRef.current = payload
  }, [])

  const stop = useCallback(() => {
    readerRef.current?.stop()
    setLocation(null)
    setVerseTotal(0)
    setCurrentVerse(null)
  }, [])

  const playChapter = useCallback(({ fromVerse = 1 } = {}) => {
    const chapter = chapterRef.current
    if (!chapter?.chapterData) return false

    const queue = buildVerseQueue(chapter.chapterData, fromVerse)
    if (!queue.length) return false

    const total = getChapterVerseTotal(chapter.chapterData)
    setVerseTotal(total)
    setLocation({
      book: chapter.book,
      chapter: chapter.chapter,
      bookTitle: chapter.bookTitle,
      lang: chapter.lang,
      verseTotal: total,
    })

    return readerRef.current?.play(queue, chapter.lang) ?? false
  }, [])

  const togglePause = useCallback(() => {
    readerRef.current?.togglePause()
  }, [])

  const value = useMemo(
    () => ({
      supported: isSpeechSupported(),
      status,
      currentVerse,
      verseTotal,
      location,
      registerChapter,
      playChapter,
      togglePause,
      stop,
      isActive: status === 'playing' || status === 'paused',
    }),
    [status, currentVerse, verseTotal, location, registerChapter, playChapter, togglePause, stop],
  )

  return (
    <SpeechReaderContext.Provider value={value}>
      {children}
    </SpeechReaderContext.Provider>
  )
}

export function useSpeechReader() {
  const ctx = useContext(SpeechReaderContext)
  if (!ctx) throw new Error('useSpeechReader must be used within SpeechReaderProvider')
  return ctx
}
