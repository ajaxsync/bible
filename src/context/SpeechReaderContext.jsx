import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  SpeechReader,
  buildVerseQueue,
  getChapterVerseTotal,
  isNativeSpeechEngine,
  isNativeTtsReady,
  isSpeechSupported,
  loadSpeechRate,
  loadSpeechVoice,
  refreshSpeechVoices,
  storeSpeechRate,
  storeSpeechVoice,
  SPEECH_LANGS,
} from '../lib/speechReader.js'

const SpeechReaderContext = createContext(null)

export function SpeechReaderProvider({ children }) {
  const [supported, setSupported] = useState(() => isSpeechSupported())
  const [supportReady, setSupportReady] = useState(false)
  const [nativeEngine, setNativeEngine] = useState(false)
  const [ttsReady, setTtsReady] = useState(false)
  const [status, setStatus] = useState('idle')
  const [currentVerse, setCurrentVerse] = useState(null)
  const [verseTotal, setVerseTotal] = useState(0)
  const [location, setLocation] = useState(null)
  const [rate, setRateState] = useState(loadSpeechRate)
  const [voiceURIs, setVoiceURIs] = useState(() => (
    Object.fromEntries(SPEECH_LANGS.map((lang) => [lang, loadSpeechVoice(lang)]))
  ))
  const [voicesRevision, setVoicesRevision] = useState(0)
  const [engineError, setEngineError] = useState('')
  const chapterRef = useRef(null)
  const readerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const reader = new SpeechReader({
      onVerseChange: setCurrentVerse,
      onStatusChange: setStatus,
      onComplete: () => {
        setCurrentVerse(null)
        setLocation(null)
        setVerseTotal(0)
      },
      onVoicesChanged: () => setVoicesRevision((n) => n + 1),
      onPlayError: (code) => {
        if (cancelled) return
        setEngineError(code || 'error')
      },
    })
    readerRef.current = reader

    ;(async () => {
      const ok = await reader.whenReady()
      if (cancelled) return
      setSupported(ok)
      setNativeEngine(isNativeSpeechEngine())
      setTtsReady(isNativeTtsReady())
      setSupportReady(true)
      await refreshSpeechVoices()
      if (!cancelled) setVoicesRevision((n) => n + 1)
    })()

    return () => {
      cancelled = true
      reader.destroy()
      readerRef.current = null
    }
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
    setEngineError('')
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

  const setRate = useCallback((nextRate) => {
    setRateState((current) => {
      if (current === nextRate) return current
      storeSpeechRate(nextRate)
      readerRef.current?.setRate(nextRate)
      return nextRate
    })
  }, [])

  const setVoice = useCallback((lang, voiceURI) => {
    const next = voiceURI || ''
    setVoiceURIs((current) => {
      if ((current[lang] || '') === next) return current
      storeSpeechVoice(lang, next)
      readerRef.current?.setVoice(lang, next)
      return { ...current, [lang]: next }
    })
  }, [])

  const value = useMemo(
    () => ({
      supported,
      supportReady,
      nativeEngine,
      ttsReady,
      engineError,
      status,
      currentVerse,
      verseTotal,
      location,
      rate,
      voiceURIs,
      voicesRevision,
      registerChapter,
      playChapter,
      togglePause,
      setRate,
      setVoice,
      stop,
      isActive: status === 'playing' || status === 'paused',
    }),
    [
      supported,
      supportReady,
      nativeEngine,
      ttsReady,
      engineError,
      status,
      currentVerse,
      verseTotal,
      location,
      rate,
      voiceURIs,
      voicesRevision,
      registerChapter,
      playChapter,
      togglePause,
      setRate,
      setVoice,
      stop,
    ],
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
