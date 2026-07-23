import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { bibleIndex, parseChapterParam, chapterToParam, getBookTitle } from '../data/bibleIndex.js'
import { appConfig, isImageIcon } from '../config/env.js'
import { assetUrl } from '../lib/assetUrl.js'
import { useVersion } from '../context/VersionContext.jsx'
import { useSpeechReader } from '../context/SpeechReaderContext.jsx'
import { isSpeechSupported } from '../lib/speechReader.js'
import CachePanel from './CachePanel.jsx'
import MarksPanel from './MarksPanel.jsx'
import ReadingSettingsPanel from './ReadingSettingsPanel.jsx'
import SpeechPanel from './SpeechPanel.jsx'
import BookChapterPicker from './BookChapterPicker.jsx'
import { useAnimatedPanel } from '../hooks/useAnimatedPanel.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import { useReadingProgress } from '../hooks/useReadingProgress.js'
import { useReadingStamina } from '../context/ReadingStaminaContext.jsx'
import { usePwaUpdate } from '../context/PwaUpdateContext.jsx'
import SpeakerIcon from './SpeakerIcon.jsx'
import LightningIcon from './LightningIcon.jsx'
import StaminaPanel from './StaminaPanel.jsx'
import './Header.css'

export default function Header() {
  const { book: bookParam, chapter: chapterParam, verse: verseParam } = useParams()
  const navigate = useNavigate()
  const { versionId, version } = useVersion()
  const {
    isActive,
    status,
    location: speechLocation,
  } = useSpeechReader()
  const book = parseInt(bookParam, 10)
  const chapter = parseChapterParam(chapterParam)
  const activeVerse = verseParam ? parseInt(verseParam, 10) : 0
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [cacheOpen, setCacheOpen] = useState(false)
  const [marksOpen, setMarksOpen] = useState(false)
  const [readingSettingsOpen, setReadingSettingsOpen] = useState(false)
  const [speechPanelOpen, setSpeechPanelOpen] = useState(false)
  const [pickerBook, setPickerBook] = useState(null)
  const { todayCompleted, panelOpen, openPanel, closePanel } = useReadingStamina()
  const { needRefresh, updating, applyUpdate } = usePwaUpdate()

  const readingProgress = useReadingProgress([book, chapter, versionId])

  const bookInfo = bibleIndex[book]
  const activeBook = pickerBook ?? book
  const activeBookInfo = bibleIndex[activeBook]
  const chapterPicker = useAnimatedPanel(menuOpen)

  useScrollLock(chapterPicker.render)

  const closeChapterPicker = () => {
    setMenuOpen(false)
    setPickerBook(null)
  }

  useEffect(() => {
    setMenuOpen(false)
    setActionsMenuOpen(false)
    setCacheOpen(false)
    setMarksOpen(false)
    setReadingSettingsOpen(false)
    setSpeechPanelOpen(false)
    setPickerBook(null)
    closePanel()
  }, [bookParam, chapterParam, closePanel])

  if (!bookInfo) return null

  const goToChapter = (targetBook, targetChapter, targetVerse = 0) => {
    const base = `/${targetBook}/${chapterToParam(targetChapter)}`
    navigate(targetVerse > 0 ? `${base}/${targetVerse}` : base)
    closeChapterPicker()
  }

  const isEn = version.lang === 'en'
  const isCht = version.lang === 'cht'
  const speechSupported = isSpeechSupported()
  const isSpeakingHere = isActive
    && speechLocation?.book === book
    && speechLocation?.chapter === chapter
  const isPlaying = isSpeakingHere && status === 'playing'

  const closeHeaderMenus = () => {
    setMenuOpen(false)
    setActionsMenuOpen(false)
    setPickerBook(null)
  }

  const openSpeechPanel = () => {
    setSpeechPanelOpen(true)
    closeHeaderMenus()
  }

  const handleAppUpdate = () => {
    closeHeaderMenus()
    applyUpdate()
  }

  const updateLabel = updating
    ? (isEn ? 'Updating…' : '更新中…')
    : (isEn ? 'Update app' : '版本更新')

  return (
    <header className="header">
      <div className="header-brand">
        <Link to="/" className="header-logo" aria-label={appConfig.name}>
          {isImageIcon(appConfig.icon) ? (
            <img src={assetUrl(appConfig.icon)} alt="" className="header-logo-icon" />
          ) : (
            <span className="header-logo-emoji" aria-hidden>{appConfig.icon}</span>
          )}
          <span className="header-logo-name">{appConfig.name}</span>
        </Link>
        <button
          type="button"
          className={`stamina-trigger${todayCompleted ? ' is-completed' : ''}`}
          onClick={openPanel}
          aria-label={isEn ? 'Reading stamina' : '阅读续航'}
          aria-pressed={todayCompleted}
        >
          <LightningIcon className="stamina-trigger-icon" />
        </button>
      </div>

      <div className="header-nav">
        <button
          type="button"
          className="book-dropdown-button"
          onClick={() => {
            setMenuOpen((open) => !open)
          }}
          aria-expanded={menuOpen}
        >
          {getBookTitle(book, version.lang)} {chapter}
          <span className="chevron">▾</span>
        </button>
      </div>

      <div className="header-version">
        <div className="header-actions">
          {speechSupported && (
            <button
              type="button"
              className={`speech-trigger${isSpeakingHere ? ' is-active' : ''}${isPlaying ? ' is-playing' : ''}`}
              onClick={openSpeechPanel}
              aria-label={isEn ? 'Read aloud' : '朗读'}
              aria-pressed={isSpeakingHere}
            >
              <SpeakerIcon className="speech-trigger-icon" />
            </button>
          )}

          <button
            type="button"
            className={`header-actions-trigger${needRefresh ? ' has-update' : ''}`}
            onClick={() => {
              setActionsMenuOpen((open) => !open)
              setMenuOpen(false)
              setPickerBook(null)
            }}
            aria-expanded={actionsMenuOpen}
            aria-haspopup="menu"
            aria-label={
              needRefresh
                ? (isEn ? 'More options, update available' : '更多选项，有新版本可更新')
                : (isEn ? 'More options' : '更多选项')
            }
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
            {needRefresh && <span className="header-actions-update-dot" aria-hidden />}
          </button>

          {actionsMenuOpen && (
            <>
              <div className="version-backdrop" onClick={closeHeaderMenus} aria-hidden />
              <div className="header-actions-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="header-actions-item"
                  onClick={() => {
                    setReadingSettingsOpen(true)
                    closeHeaderMenus()
                  }}
                >
                  {isEn ? 'Reading settings' : isCht ? '閱讀設定' : '阅读设置'}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="header-actions-item"
                  onClick={() => {
                    setMarksOpen(true)
                    closeHeaderMenus()
                  }}
                >
                  {isEn ? 'Saved verses' : isCht ? '經文收藏' : '经文收藏'}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="header-actions-item"
                  onClick={() => {
                    setCacheOpen(true)
                    closeHeaderMenus()
                  }}
                >
                  {isEn ? 'Cache management' : isCht ? '快取管理' : '缓存管理'}
                </button>

                {needRefresh && (
                  <>
                    <div className="header-actions-divider" role="separator" />
                    <button
                      type="button"
                      role="menuitem"
                      className="header-actions-item header-actions-item--update is-available"
                      onClick={handleAppUpdate}
                      disabled={updating}
                    >
                      {updateLabel}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="reading-progress" aria-hidden>
        <div
          className="reading-progress-fill"
          style={{ transform: `scaleX(${readingProgress})` }}
        />
      </div>

      {cacheOpen && <CachePanel onClose={() => setCacheOpen(false)} />}
      {marksOpen && <MarksPanel onClose={() => setMarksOpen(false)} />}
      {readingSettingsOpen && <ReadingSettingsPanel onClose={() => setReadingSettingsOpen(false)} />}
      {speechPanelOpen && speechSupported && (
        <SpeechPanel onClose={() => setSpeechPanelOpen(false)} activeVerse={activeVerse} />
      )}
      {panelOpen && <StaminaPanel onClose={closePanel} />}

      {chapterPicker.render && (
        <>
          <div
            className={`chapter-picker-backdrop panel-backdrop ${chapterPicker.motionClass}`}
            onClick={closeChapterPicker}
            aria-hidden
          />
          <div
            className={`chapter-picker-panel ${chapterPicker.motionClass}`}
            role="dialog"
            aria-label={isEn ? 'Book and chapter' : '书卷章节'}
          >
            <BookChapterPicker
              lang={version.lang}
              versionId={versionId}
              currentBook={book}
              currentChapter={chapter}
              currentVerse={activeVerse}
              activeBook={activeBook}
              activeBookInfo={activeBookInfo}
              onPickBook={setPickerBook}
              onGoToChapter={goToChapter}
              onClose={closeChapterPicker}
            />
          </div>
        </>
      )}
    </header>
  )
}
