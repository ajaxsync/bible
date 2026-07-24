import { useEffect, useMemo, useState } from 'react'
import { bibleIndex, parseChapterParam, getBookTitle } from '../data/bibleIndex.js'
import { useParams } from 'react-router-dom'
import { useVersion } from '../context/VersionContext.jsx'
import { useSpeechReader } from '../context/SpeechReaderContext.jsx'
import { SPEECH_RATES, getVoicesForLang, refreshSpeechVoices } from '../lib/speechReader.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import { PauseIcon, PlayIcon } from './SpeechIcons.jsx'
import './SpeechPanel.css'

export default function SpeechPanel({ onClose, activeVerse = 0 }) {
  const { book: bookParam, chapter: chapterParam } = useParams()
  const { version } = useVersion()
  const book = parseInt(bookParam, 10)
  const chapter = parseChapterParam(chapterParam)
  const bookInfo = bibleIndex[book]
  const isEn = version.lang === 'en'
  const isZh = !isEn

  const {
    playChapter,
    togglePause,
    status,
    currentVerse,
    verseTotal,
    location,
    isActive,
    rate,
    setRate,
    voiceURIs,
    voicesRevision,
    setVoice,
    nativeEngine,
    ttsReady,
  } = useSpeechReader()

  const [startVerse, setStartVerse] = useState(() => (activeVerse > 0 ? activeVerse : 1))
  const [voicesTick, setVoicesTick] = useState(0)
  const [playError, setPlayError] = useState('')
  const readingLang = version.lang
  const voices = useMemo(
    () => getVoicesForLang(readingLang),
    [readingLang, voicesRevision, voicesTick],
  )
  const selectedVoiceURI = voiceURIs[readingLang] || ''
  const missingLangVoice = voices.length === 0
    && (readingLang === 'chs' || readingLang === 'cht')
  const showTtsHint = nativeEngine && (!ttsReady || missingLangVoice || playError)

  useEffect(() => {
    setStartVerse(activeVerse > 0 ? activeVerse : 1)
  }, [activeVerse])

  useEffect(() => {
    let cancelled = false
    refreshSpeechVoices().then(() => {
      if (!cancelled) setVoicesTick((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!bookInfo) return null

  const isThisChapter = isActive
    && location?.book === book
    && location?.chapter === chapter
  const total = isThisChapter ? (location?.verseTotal || verseTotal) : 0
  const current = isThisChapter ? currentVerse : null
  const bookTitle = getBookTitle(book, version.lang)
  const chapterRef = isEn ? `${bookTitle} ${chapter}` : `${bookTitle} ${chapter}章`

  const handlePlay = () => {
    setPlayError('')
    const ok = playChapter({ fromVerse: startVerse })
    if (!ok) {
      setPlayError(
        isEn
          ? 'Unable to start playback. Install a system Text-to-speech engine and Chinese voice pack.'
          : '无法开始朗读。请安装系统「文字转语音」引擎及中文语音包后再试。',
      )
    }
  }

  useScrollLock(true)

  return (
    <>
      <div className="speech-panel-backdrop panel-backdrop" onClick={onClose} aria-hidden />
      <div className="speech-panel" role="dialog" aria-label={isEn ? 'Read aloud' : '朗读'}>
        <BottomSheetHandle onClose={onClose} label={isEn ? 'Close' : '关闭'} />
        <div className="speech-panel-body">
          <div className="speech-panel-ref">
            <span className="speech-panel-chapter">{chapterRef}</span>
            <div className="speech-panel-status">
              {isThisChapter && current && total > 0 ? (
                <span className="speech-panel-progress">
                  <span className="speech-panel-progress-current">{current}</span>
                  <span className="speech-panel-progress-sep">/</span>
                  <span className="speech-panel-progress-total">{total}</span>
                  <span className="speech-panel-progress-unit">{isEn ? ' verses' : '节'}</span>
                </span>
              ) : (
                <span className="speech-panel-progress-idle">
                  {isEn ? 'Ready' : '待播放'}
                </span>
              )}
            </div>
          </div>

          <div className="speech-panel-controls">
            <button
              type="button"
              className="speech-panel-control speech-panel-control-main"
              onClick={isThisChapter ? togglePause : handlePlay}
              aria-label={
                isThisChapter
                  ? (status === 'playing' ? (isEn ? 'Pause' : '暂停') : (isEn ? 'Resume' : '继续'))
                  : (isEn ? 'Play' : '播放')
              }
            >
              {isThisChapter && status === 'playing' ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          <div className="speech-panel-options">
            <div className="speech-panel-option-row">
              <label className="speech-panel-option-label" htmlFor="speech-voice-select">
                {isEn ? 'Voice' : '音色'}
              </label>
              <select
                id="speech-voice-select"
                className="speech-panel-select"
                value={selectedVoiceURI}
                onChange={(e) => setVoice(readingLang, e.target.value)}
                disabled={voices.length === 0}
              >
                <option value="">{isEn ? 'System default' : '系统默认'}</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name}
                    {!voice.localService ? (isEn ? ' (online)' : ' (在线)') : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="speech-panel-option-row">
              <label className="speech-panel-option-label" htmlFor="speech-rate-select">
                {isEn ? 'Speed' : '倍速'}
              </label>
              <select
                id="speech-rate-select"
                className="speech-panel-select"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                aria-label={isEn ? 'Playback speed' : '播放倍速'}
              >
                {SPEECH_RATES.map((option) => (
                  <option key={option} value={option}>
                    {option.toFixed(1)}x
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showTtsHint && (
            <p className="speech-panel-hint speech-panel-hint--warn">
              {playError
                || (isEn
                  ? 'System TTS is not ready. Install Text-to-speech / a Chinese voice pack in system settings (common on emulators).'
                  : '系统朗读引擎未就绪。请到手机设置 → 文字转语音 / 语音服务，安装引擎并下载中文语音包（模拟器上较常见）。')}
            </p>
          )}

          <p className="speech-panel-hint">
            {!isThisChapter && (
              startVerse > 1 ? (
                <>
                  {isZh ? `当前从第 ${startVerse} 节开始播放` : `Starting from verse ${startVerse}`}
                  <span className="speech-panel-hint-sep"> · </span>
                  <button
                    type="button"
                    className="speech-panel-link"
                    onClick={() => {
                      setStartVerse(1)
                      setPlayError('')
                      playChapter({ fromVerse: 1 })
                    }}
                  >
                    {isZh ? '重头播放' : 'From beginning'}
                  </button>
                </>
              ) : (
                isZh ? '将从本章开头播放' : 'Plays from the beginning of this chapter'
              )
            )}
          </p>
        </div>
      </div>
    </>
  )
}
