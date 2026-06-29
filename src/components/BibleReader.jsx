import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { bibleIndex, parseChapterParam, chapterToParam, getBookTitle } from '../data/bibleIndex.js'
import { useVersion } from '../context/VersionContext.jsx'
import { appConfig } from '../config/env.js'
import { fetchChapter } from '../lib/fetchChapter.js'
import { setPageTitle } from '../lib/pageTitle.js'
import ComparePanel from './ComparePanel.jsx'
import './BibleReader.css'
import './VerseToolbar.css'

export default function BibleReader() {
  const { book: bookParam, chapter: chapterParam, verse: verseParam } = useParams()
  const { versionId, version } = useVersion()
  const book = parseInt(bookParam, 10)
  const chapter = parseChapterParam(chapterParam)
  const verse = verseParam ? parseInt(verseParam, 10) : 0
  const [chapterData, setChapterData] = useState(null)
  const [error, setError] = useState(null)
  const [compareOpen, setCompareOpen] = useState(false)

  const bookInfo = bibleIndex[book]
  const isZh = version.lang !== 'en'

  useEffect(() => {
    setCompareOpen(false)
  }, [book, chapter, verse, versionId])

  useEffect(() => {
    if (!bookInfo) {
      document.title = appConfig.title
      return
    }
    setPageTitle(book, chapter, { lang: version.lang, verse, versionLabel: version.label })
  }, [book, chapter, verse, version.lang, version.label, bookInfo])

  useEffect(() => {
    let cancelled = false
    setChapterData(null)
    setError(null)

    fetchChapter(versionId, book, chapter)
      .then((data) => {
        if (!cancelled) setChapterData(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => { cancelled = true }
  }, [book, chapter, versionId])

  if (error) {
    return (
      <div className="reader">
        <div className="reader-error">{isZh ? `无法加载本章：${error}` : `Failed to load: ${error}`}</div>
      </div>
    )
  }

  if (!chapterData || !bookInfo) {
    return (
      <div className="reader">
        <div className="reader-loading">{isZh ? '加载中…' : 'Loading…'}</div>
      </div>
    )
  }

  const chapterPath = `/${book}/${chapterToParam(chapter)}`
  const refLabel = `${getBookTitle(book, version.lang)} ${chapter}:${verse}`

  return (
    <article className={`reader lang-${version.lang} ${verse > 0 ? 'has-verse-toolbar' : ''}`}>
      <h1 className="reader-title">{getBookTitle(book, version.lang)} {chapter}</h1>
      <p className="reader-meta">{version.label}</p>

      <div className="chapter">
        {chapterData.sections.map((section, index) => (
          <Section
            key={index}
            section={section}
            chapterPath={chapterPath}
            verse={verse}
          />
        ))}
      </div>

      {verse === 0 && (
        <p className="verse-hint">{isZh ? '点击经节可对照其他译本' : 'Tap a verse to compare translations'}</p>
      )}

      {verse > 0 && (
        <div className="verse-toolbar">
          <span className="verse-toolbar-ref">{refLabel}</span>
          <button
            type="button"
            className="verse-toolbar-btn"
            onClick={() => setCompareOpen(true)}
          >
            {isZh ? '对照阅读' : 'Compare'}
          </button>
        </div>
      )}

      {verse > 0 && compareOpen && (
        <ComparePanel
          book={book}
          chapter={chapter}
          verse={verse}
          primaryVersionId={versionId}
          primaryLang={version.lang}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </article>
  )
}

function Section({ section, chapterPath, verse }) {
  if ('heading' in section) {
    if (Array.isArray(section.heading)) {
      return (
        <div className={`heading ${section.type}`}>
          {section.heading.map((content, idx) => {
            if (typeof content === 'object') {
              return (
                <Link to={content.href} key={idx}>
                  {content.text}
                </Link>
              )
            }
            return content
          })}
        </div>
      )
    }
    return <div className={`heading ${section.type}`}>{section.heading}</div>
  }

  return (
    <div className={`section ${section.type}`}>
      {section.contents.map((content, index) => {
        const { hasVerseLabel, verseNum, verseText, classes, title } = content
        const link = verseNum === verse ? chapterPath : `${chapterPath}/${verseNum}`

        return (
          <span className="section-content" key={index}>
            {hasVerseLabel ? <span className="verse-num">{verseNum}</span> : null}
            <Link to={link} title={title} className="verse-link">
              <span
                data-verse={verseNum}
                className={['verse', ...(classes || []), verseNum === verse ? 'selected' : ''].filter(Boolean).join(' ')}
              >
                {verseText}
              </span>
            </Link>
          </span>
        )
      })}
    </div>
  )
}
