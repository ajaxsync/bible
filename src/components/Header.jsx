import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { bibleIndex, parseChapterParam, chapterToParam, getBookTitle } from '../data/bibleIndex.js'
import { PRIMARY_VERSION_IDS, VERSIONS } from '../data/versions.js'
import { appConfig, isImageIcon } from '../config/env.js'
import { useVersion } from '../context/VersionContext.jsx'
import './Header.css'

const VERSION_LANG_LABEL = { chs: '简体中文', cht: '繁體中文', en: 'English' }

export default function Header() {
  const { book: bookParam, chapter: chapterParam } = useParams()
  const navigate = useNavigate()
  const { versionId, version, setVersionId } = useVersion()
  const book = parseInt(bookParam, 10)
  const { chapter, jin } = parseChapterParam(chapterParam)
  const [menuOpen, setMenuOpen] = useState(false)
  const [versionMenuOpen, setVersionMenuOpen] = useState(false)
  const [pickerBook, setPickerBook] = useState(null)

  const bookInfo = bibleIndex[book]
  const activeBook = pickerBook ?? book
  const activeBookInfo = bibleIndex[activeBook]

  useEffect(() => {
    setMenuOpen(false)
    setVersionMenuOpen(false)
    setPickerBook(null)
  }, [bookParam, chapterParam])

  if (!bookInfo) return null

  const goToChapter = (targetBook, targetChapter, targetJin = jin) => {
    navigate(`/${targetBook}/${chapterToParam(targetChapter, targetJin)}`)
    setMenuOpen(false)
    setPickerBook(null)
  }

  const prevLink = getPrevChapter(book, chapter, jin)
  const nextLink = getNextChapter(book, chapter, jin)

  return (
    <header className="header">
      <span className="header-logo">
        {isImageIcon(appConfig.icon) ? (
          <img src={appConfig.icon} alt="" className="header-logo-icon" />
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
          {getBookTitle(book, version.lang)} {chapter}{jin ? '（金句）' : ''}
          <span className="chevron">▾</span>
        </button>

        {nextLink ? (
          <Link to={nextLink} className={`nav-arrow ${menuOpen ? 'disabled' : ''}`} aria-label="下一章">›</Link>
        ) : (
          <span className="nav-arrow nav-arrow-disabled" aria-hidden>›</span>
        )}
      </div>

      <div className="header-version">
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
            <ul className="version-menu" role="listbox" aria-label="主阅读版本">
              {PRIMARY_VERSION_IDS.map((id) => {
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
                      }}
                    >
                      <span className="version-item-label">{v.label}</span>
                      <span className="version-item-group">{VERSION_LANG_LABEL[v.lang]}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

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
                      onClick={() => goToChapter(activeBook, ch, false)}
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

function getPrevChapter(book, chapter, jin) {
  if (book === 1 && chapter === 1 && !jin) return null
  if (jin) return `/${book}/${chapter}`
  if (chapter === 1) {
    const prevBook = book - 1
    return `/${prevBook}/${bibleIndex[prevBook].chapters}`
  }
  return `/${book}/${chapter - 1}`
}

function getNextChapter(book, chapter, jin) {
  if (book === 66 && chapter === bibleIndex[66].chapters && !jin) return null
  if (jin) return null
  if (chapter === bibleIndex[book].chapters) {
    return `/${book + 1}/1`
  }
  return `/${book}/${chapter + 1}`
}
