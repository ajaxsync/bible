import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { bibleIndex, parseChapterParam, chapterToParam, getBookTitle } from '../data/bibleIndex.js'
import { PRIMARY_VERSION_IDS, VERSIONS } from '../data/versions.js'
import { appConfig, isImageIcon } from '../config/env.js'
import { assetUrl } from '../lib/assetUrl.js'
import { useVersion } from '../context/VersionContext.jsx'
import CachePanel from './CachePanel.jsx'
import ReadingSettingsPanel from './ReadingSettingsPanel.jsx'
import './Header.css'

const VERSION_LANG_LABEL = { chs: '简体中文', cht: '繁體中文', en: 'English' }

export default function Header() {
  const { book: bookParam, chapter: chapterParam } = useParams()
  const navigate = useNavigate()
  const { versionId, version, setVersionId } = useVersion()
  const book = parseInt(bookParam, 10)
  const chapter = parseChapterParam(chapterParam)
  const [menuOpen, setMenuOpen] = useState(false)
  const [versionMenuOpen, setVersionMenuOpen] = useState(false)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [mobileVersionOpen, setMobileVersionOpen] = useState(false)
  const [cacheOpen, setCacheOpen] = useState(false)
  const [readingSettingsOpen, setReadingSettingsOpen] = useState(false)
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
    setPickerBook(null)
  }, [bookParam, chapterParam])

  if (!bookInfo) return null

  const goToChapter = (targetBook, targetChapter) => {
    navigate(`/${targetBook}/${chapterToParam(targetChapter)}`)
    setMenuOpen(false)
    setPickerBook(null)
  }

  const prevLink = getPrevChapter(book, chapter)
  const nextLink = getNextChapter(book, chapter)
  const isEn = version.lang === 'en'

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
      <span className="header-logo">
        {isImageIcon(appConfig.icon) ? (
          <img src={assetUrl(appConfig.icon)} alt="" className="header-logo-icon" />
        ) : (
          <span className="header-logo-emoji" aria-hidden>{appConfig.icon}</span>
        )}
        {appConfig.name}
      </span>

      <div className="header-nav">
        {prevLink ? (
          <Link to={prevLink} className={`nav-arrow ${menuOpen ? 'disabled' : ''}`} aria-label="上一章">‹</Link>
        ) : (
          <span className="nav-arrow nav-arrow-disabled" aria-hidden>‹</span>
        )}

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

        {nextLink ? (
          <Link to={nextLink} className={`nav-arrow ${menuOpen ? 'disabled' : ''}`} aria-label="下一章">›</Link>
        ) : (
          <span className="nav-arrow nav-arrow-disabled" aria-hidden>›</span>
        )}
      </div>

      <div className="header-version">
        <div className="header-actions-desktop">
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

      {menuOpen && (
        <div className="dropdown-overlay" onClick={() => { setMenuOpen(false); setPickerBook(null) }}>
          <div className="dropdown-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-column">
              <div className="dropdown-label">{version.lang === 'chs' ? '书卷' : version.lang === 'en' ? 'Books' : '書卷'}</div>
              <ul className="dropdown-list">
                {Object.values(bibleIndex).map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className={`dropdown-item ${b.id === activeBook ? 'current' : ''}`}
                      onClick={() => setPickerBook(b.id)}
                    >
                      {getBookTitle(b.id, version.lang)}
                    </button>
                  </li>
                ))}
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

function getPrevChapter(book, chapter) {
  if (book === 1 && chapter === 1) return null
  if (chapter === 1) {
    const prevBook = book - 1
    return `/${prevBook}/${bibleIndex[prevBook].chapters}`
  }
  return `/${book}/${chapter - 1}`
}

function getNextChapter(book, chapter) {
  if (book === 66 && chapter === bibleIndex[66].chapters) return null
  if (chapter === bibleIndex[book].chapters) {
    return `/${book + 1}/1`
  }
  return `/${book}/${chapter + 1}`
}
