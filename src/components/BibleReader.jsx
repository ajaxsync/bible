import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { bibleIndex, parseChapterParam, chapterToParam, getBookTitle } from '../data/bibleIndex.js'
import { useVersion } from '../context/VersionContext.jsx'
import { useSpeechReader } from '../context/SpeechReaderContext.jsx'
import { getVerseText } from '../lib/speechReader.js'
import { appConfig } from '../config/env.js'
import { fetchChapter } from '../lib/fetchChapter.js'
import { setPageTitle } from '../lib/pageTitle.js'
import { storeLastReadingPosition } from '../lib/lastReadingPosition.js'
import { getPrevChapterRoute, getNextChapterRoute, getPrevChapterInfo, getNextChapterInfo, formatChapterLabel } from '../lib/chapterNav.js'
import ComparePanel from './ComparePanel.jsx'
import SpeechFloatingControl from './SpeechFloatingControl.jsx'
import './BibleReader.css'
import './VerseToolbar.css'

export default function BibleReader() {
  const { book: bookParam, chapter: chapterParam, verse: verseParam } = useParams()
  const navigate = useNavigate()
  const { versionId, version } = useVersion()
  const book = parseInt(bookParam, 10)
  const chapter = parseChapterParam(chapterParam)
  const verse = verseParam ? parseInt(verseParam, 10) : 0
  const [chapterData, setChapterData] = useState(null)
  const [error, setError] = useState(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [copyHint, setCopyHint] = useState('')
  const prevVerseRef = useRef(verse)
  const {
    registerChapter,
    stop,
    playChapter,
    currentVerse: speakingVerse,
    location: speechLocation,
    isActive,
  } = useSpeechReader()

  const bookInfo = bibleIndex[book]
  const isZh = version.lang !== 'en'
  const isSpeakingHere = isActive
    && speechLocation?.book === book
    && speechLocation?.chapter === chapter

  useEffect(() => {
    if (!bookInfo) return
    storeLastReadingPosition({ book, chapter, verse })
  }, [book, chapter, verse, bookInfo])

  useEffect(() => {
    setCompareOpen(false)
    setCopyHint('')
  }, [book, chapter, verse, versionId])

  useEffect(() => {
    stop()
    prevVerseRef.current = 0
  }, [book, chapter, versionId, stop])

  useEffect(() => {
    if (!chapterData || !bookInfo) return
    registerChapter({
      book,
      chapter,
      bookTitle: getBookTitle(book, version.lang),
      lang: version.lang,
      chapterData,
    })
  }, [book, chapter, chapterData, version.lang, bookInfo, registerChapter])

  useEffect(() => {
    if (!isSpeakingHere || !speakingVerse) return
    const el = document.querySelector(`[data-verse="${speakingVerse}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [speakingVerse, isSpeakingHere])

  useEffect(() => {
    if (!isSpeakingHere || !isActive) {
      prevVerseRef.current = verse
      return
    }
    if (verse > 0 && verse !== prevVerseRef.current) {
      playChapter({ fromVerse: verse })
    }
    prevVerseRef.current = verse
  }, [verse, isSpeakingHere, isActive, playChapter])

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
  const prevChapterLink = getPrevChapterRoute(book, chapter)
  const nextChapterLink = getNextChapterRoute(book, chapter)
  const prevChapterInfo = getPrevChapterInfo(book, chapter)
  const nextChapterInfo = getNextChapterInfo(book, chapter)
  const currentChapterLabel = formatChapterLabel(book, chapter, version.lang)
  const prevChapterLabel = prevChapterInfo
    ? formatChapterLabel(prevChapterInfo.book, prevChapterInfo.chapter, version.lang)
    : null
  const nextChapterLabel = nextChapterInfo
    ? formatChapterLabel(nextChapterInfo.book, nextChapterInfo.chapter, version.lang)
    : null

  const clearVerseSelection = () => {
    if (verse <= 0) return
    setCompareOpen(false)
    navigate(chapterPath)
  }

  const handleCopy = async () => {
    const text = getVerseText(chapterData, verse)
    const copyText = `${text} ${refLabel} ${version.label}`
    try {
      await navigator.clipboard.writeText(copyText)
      setCopyHint(isZh ? '已复制' : 'Copied')
      window.setTimeout(() => setCopyHint(''), 1500)
    } catch {
      setCopyHint(isZh ? '复制失败' : 'Copy failed')
      window.setTimeout(() => setCopyHint(''), 1500)
    }
  }

  const readerClass = [
    'reader',
    `lang-${version.lang}`,
    verse > 0 ? 'has-verse-toolbar' : '',
    isSpeakingHere ? 'is-speaking' : '',
    isSpeakingHere && verse === 0 ? 'has-speech-float' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <article className={readerClass} onClick={clearVerseSelection}>
        <h1 className="reader-title">{getBookTitle(book, version.lang)} {chapter}</h1>
        <p className="reader-meta">{version.label}</p>

        <div className="chapter">
          {chapterData.sections.map((section, index) => (
            <Section
              key={index}
              section={section}
              chapterPath={chapterPath}
              verse={verse}
              speakingVerse={isSpeakingHere ? speakingVerse : null}
            />
          ))}
        </div>

        {verse === 0 && (
          <nav className="chapter-nav" aria-label={isZh ? '章节导航' : 'Chapter navigation'}>
            <div className="chapter-nav-col chapter-nav-col-prev">
              {prevChapterLink && (
                <Link to={prevChapterLink} className="chapter-nav-cell">
                  <span className="chapter-nav-action">{isZh ? '阅读上一章' : 'Previous'}</span>
                  <span className="chapter-nav-target">{prevChapterLabel}</span>
                </Link>
              )}
            </div>
            <div className="chapter-nav-col chapter-nav-col-center">
              <div className="chapter-nav-cell chapter-nav-cell-static">
                <span className="chapter-nav-action chapter-nav-action-current">
                  {isZh ? '已读完' : 'Finished'}
                </span>
                <span className="chapter-nav-target">{currentChapterLabel}</span>
              </div>
            </div>
            <div className="chapter-nav-col chapter-nav-col-next">
              {nextChapterLink && (
                <Link to={nextChapterLink} className="chapter-nav-cell">
                  <span className="chapter-nav-action">{isZh ? '阅读下一章' : 'Next'}</span>
                  <span className="chapter-nav-target">{nextChapterLabel}</span>
                </Link>
              )}
            </div>
          </nav>
        )}

        {verse > 0 && (
          <div className="verse-toolbar" onClick={(e) => e.stopPropagation()}>
            <span className="verse-toolbar-ref">{refLabel}</span>
            <div className="verse-toolbar-actions">
              {copyHint && <span className="verse-toolbar-copy-hint">{copyHint}</span>}
              <button
                type="button"
                className="verse-toolbar-btn verse-toolbar-btn-muted"
                onClick={handleCopy}
              >
                {isZh ? '复制' : 'Copy'}
              </button>
              <button
                type="button"
                className="verse-toolbar-btn"
                onClick={() => setCompareOpen(true)}
              >
                {isZh ? '对照阅读' : 'Compare'}
              </button>
            </div>
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

      <SpeechFloatingControl verseSelected={verse > 0} />
    </>
  )
}

function Section({ section, chapterPath, verse, speakingVerse }) {
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
            <Link to={link} title={title} className="verse-link" onClick={(e) => e.stopPropagation()}>
              <span
                data-verse={verseNum}
                className={['verse', ...(classes || []), verseNum === verse ? 'selected' : '', verseNum === speakingVerse ? 'speaking' : ''].filter(Boolean).join(' ')}
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
