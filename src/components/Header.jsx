import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { bibleIndex, parseChapterParam, chapterToParam, getBookTitle, getBookShortTitle } from '../data/bibleIndex.js'
import { PRIMARY_VERSION_IDS, VERSIONS } from '../data/versions.js'
import { appConfig, isImageIcon } from '../config/env.js'
import { assetUrl } from '../lib/assetUrl.js'
import { useVersion } from '../context/VersionContext.jsx'
import { useSpeechReader } from '../context/SpeechReaderContext.jsx'
import { isSpeechSupported } from '../lib/speechReader.js'
import CachePanel from './CachePanel.jsx'
import ReadingSettingsPanel from './ReadingSettingsPanel.jsx'
import SpeechPanel from './SpeechPanel.jsx'
import SpeakerIcon from './SpeakerIcon.jsx'
import './Header.css'

const VERSION_LANG_LABEL = { chs: '简体中文', cht: '繁體中文', en: 'English' }

export default function Header() {
  const { book: bookParam, chapter: chapterParam, verse: verseParam } = useParams()
  const navigate = useNavigate()
  const { versionId, version, setVersionId } = useVersion()
  const {
    isActive,
    status,
    location: speechLocation,
  } = useSpeechReader()
  const book = parseInt(bookParam, 10)
  const chapter = parseChapterParam(chapterParam)
  const activeVerse = verseParam ? parseInt(verseParam, 10) : 0
  const [menuOpen, setMenuOpen] = useState(false)
  const [versionMenuOpen, setVersionMenuOpen] = useState(false)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [mobileVersionOpen, setMobileVersionOpen] = useState(false)
  const [cacheOpen, setCacheOpen] = useState(false)
  const [readingSettingsOpen, setReadingSettingsOpen] = useState(false)
  const [speechPanelOpen, setSpeechPanelOpen] = useState(false)
  const [pickerBook, setPickerBook] = useState(null)

  const bookInfo = bibleIndex[book]
  const activeBook = pickerBook ?? book
  const activeBookInfo = bibleIndex[activeBook]

  useEffect(() => {
    setMenuOpen(false)
    setVersionMenuOpen(false)
    setActionsMenuOpen(false)
    setMobileVersionOpen(false)
    setCacheOpen(false)
    setReadingSettingsOpen(false)
    setSpeechPanelOpen(false)
    setPickerBook(null)
  }, [bookParam, chapterParam])

  if (!bookInfo) return null

  const goToChapter = (targetBook, targetChapter) => {
    navigate(`/${targetBook}/${chapterToParam(targetChapter)}`)
    setMenuOpen(false)
    setPickerBook(null)
  }

  const isEn = version.lang === 'en'
  const speechSupported = isSpeechSupported()
  const isSpeakingHere = isActive
    && speechLocation?.book === book
    && speechLocation?.chapter === chapter
  const isPlaying = isSpeakingHere && status === 'playing'

  const openSpeechPanel = () => {
    setSpeechPanelOpen(true)
    setMenuOpen(false)
    setVersionMenuOpen(false)
    setActionsMenuOpen(false)
    setPickerBook(null)
  }

  const versionOptions = PRIMARY_VERSION_IDS.map((id) => {
    const v = VERSIONS[id]
    return (
      <li key={id}>
        <button
          type="button"
          role="option"
          aria-selected={versionId === id}
          className={`version-item ${versionId === id ? 'current' : ''}`}
          onClick={() => {
            setVersionId(id)
            setVersionMenuOpen(false)
            setActionsMenuOpen(false)
            setMobileVersionOpen(false)
          }}
        >
          <span className="version-item-label">{v.label}</span>
          <span className="version-item-group">{VERSION_LANG_LABEL[v.lang]}</span>
        </button>
      </li>
    )
  })

  return (
    <header className="header">
      <Link to="/" className="header-logo" aria-label={appConfig.name}>
        {isImageIcon(appConfig.icon) ? (
          <img src={assetUrl(appConfig.icon)} alt="" className="header-logo-icon" />
        ) : (
          <span className="header-logo-emoji" aria-hidden>{appConfig.icon}</span>
        )}
        <span className="header-logo-name">{appConfig.name}</span>
      </Link>

      <div className="header-nav">
        <button
          type="button"
          className="book-dropdown-button"
          onClick={() => {
            setMenuOpen((open) => !open)
            setVersionMenuOpen(false)
          }}
          aria-expanded={menuOpen}
        >
          {getBookTitle(book, version.lang)} {chapter}
          <span className="chevron">▾</span>
        </button>
      </div>

      <div className="header-version">
        <div className="header-actions-desktop">
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
            className="cache-trigger"
            onClick={() => {
              setCacheOpen(true)
              setMenuOpen(false)
              setVersionMenuOpen(false)
              setPickerBook(null)
            }}
          >
            {isEn ? 'Offline cache' : '离线缓存'}
          </button>

          <button
            type="button"
            className="version-dropdown-button"
            onClick={() => {
              setVersionMenuOpen((open) => !open)
              setMenuOpen(false)
              setPickerBook(null)
            }}
            aria-expanded={versionMenuOpen}
            aria-haspopup="listbox"
          >
            {version.label}
            <span className="chevron">▾</span>
          </button>

          {versionMenuOpen && (
            <>
              <div className="version-backdrop" onClick={() => setVersionMenuOpen(false)} aria-hidden />
              <ul className="version-menu" role="listbox" aria-label={isEn ? 'Bible version' : '主阅读版本'}>
                {versionOptions}
              </ul>
            </>
          )}

          <button
            type="button"
            className="reading-trigger"
            onClick={() => {
              setReadingSettingsOpen(true)
              setMenuOpen(false)
              setVersionMenuOpen(false)
              setPickerBook(null)
            }}
          >
            {isEn ? 'Font' : '字体调整'}
          </button>
        </div>

        <div className="header-actions-mobile">
          {speechSupported && (
            <button
              type="button"
              className={`speech-trigger speech-trigger-mobile${isSpeakingHere ? ' is-active' : ''}${isPlaying ? ' is-playing' : ''}`}
              onClick={openSpeechPanel}
              aria-label={isEn ? 'Read aloud' : '朗读'}
              aria-pressed={isSpeakingHere}
            >
              <SpeakerIcon className="speech-trigger-icon" />
            </button>
          )}

          <button
            type="button"
            className="header-actions-trigger"
            onClick={() => {
              setActionsMenuOpen((open) => !open)
              setMenuOpen(false)
              setVersionMenuOpen(false)
              setPickerBook(null)
            }}
            aria-expanded={actionsMenuOpen}
            aria-haspopup="menu"
            aria-label={isEn ? 'More options' : '更多选项'}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>

          {actionsMenuOpen && (
            <>
              <div className="version-backdrop" onClick={() => { setActionsMenuOpen(false); setMobileVersionOpen(false) }} aria-hidden />
              <div className="header-actions-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="header-actions-item"
                  onClick={() => {
                    setCacheOpen(true)
                    setActionsMenuOpen(false)
                    setMobileVersionOpen(false)
                    setMenuOpen(false)
                    setPickerBook(null)
                  }}
                >
                  {isEn ? 'Offline cache' : '离线缓存'}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="header-actions-item header-actions-item--version"
                  onClick={() => setMobileVersionOpen((open) => !open)}
                  aria-expanded={mobileVersionOpen}
                >
                  <span className="header-actions-item-main">{isEn ? 'Version' : '经文版本'}</span>
                  <span className="header-actions-item-value">
                    {version.label}
                    <span className="chevron">{mobileVersionOpen ? '▴' : '▾'}</span>
                  </span>
                </button>

                {mobileVersionOpen && (
                  <ul className="header-actions-version-list" role="listbox" aria-label={isEn ? 'Bible version' : '主阅读版本'}>
                    {versionOptions}
                  </ul>
                )}

                <button
                  type="button"
                  role="menuitem"
                  className="header-actions-item"
                  onClick={() => {
                    setReadingSettingsOpen(true)
                    setActionsMenuOpen(false)
                    setMobileVersionOpen(false)
                    setMenuOpen(false)
                    setPickerBook(null)
                  }}
                >
                  {isEn ? 'Reading settings' : '字体调整'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {cacheOpen && <CachePanel onClose={() => setCacheOpen(false)} />}
      {readingSettingsOpen && <ReadingSettingsPanel onClose={() => setReadingSettingsOpen(false)} />}
      {speechPanelOpen && speechSupported && (
        <SpeechPanel onClose={() => setSpeechPanelOpen(false)} activeVerse={activeVerse} />
      )}

      {menuOpen && (
        <div className="dropdown-overlay" onClick={() => { setMenuOpen(false); setPickerBook(null) }}>
          <div className="dropdown-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-column">
              <div className="dropdown-label">{version.lang === 'chs' ? '书卷' : version.lang === 'en' ? 'Books' : '書卷'}</div>
              <ul className="dropdown-list">
                {Object.values(bibleIndex).map((b) => {
                  const shortTitle = getBookShortTitle(b.id, version.lang)
                  return (
                  <li key={b.id}>
                    <button
                      type="button"
                      className={`dropdown-item ${b.id === activeBook ? 'current' : ''}`}
                      onClick={() => setPickerBook(b.id)}
                    >
                      {shortTitle && (
                        <span className="dropdown-book-short">{shortTitle}</span>
                      )}
                      <span className="dropdown-book-title">{getBookTitle(b.id, version.lang)}</span>
                    </button>
                  </li>
                  )
                })}
              </ul>
            </div>
            <div className="dropdown-column">
              <div className="dropdown-label">
                {getBookTitle(activeBook, version.lang)} · {version.lang === 'en' ? 'Ch' : '章'}
              </div>
              <ul className="dropdown-list chapter-grid">
                {Array.from({ length: activeBookInfo.chapters }, (_, i) => i + 1).map((ch) => (
                  <li key={ch}>
                    <button
                      type="button"
                      className={`dropdown-item chapter-item ${activeBook === book && ch === chapter && !pickerBook ? 'current' : ''}`}
                      onClick={() => goToChapter(activeBook, ch)}
                    >
                      {ch}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
