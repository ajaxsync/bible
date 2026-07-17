import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { bibleIndex, parseChapterParam, chapterToParam, getBookTitle } from '../data/bibleIndex.js'
import { useVersion } from '../context/VersionContext.jsx'
import { useSpeechReader } from '../context/SpeechReaderContext.jsx'
import { appConfig } from '../config/env.js'
import { fetchChapter } from '../lib/fetchChapter.js'
import { setPageTitle } from '../lib/pageTitle.js'
import { storeLastReadingPosition } from '../lib/lastReadingPosition.js'
import { getPrevChapterRoute, getNextChapterRoute, getPrevChapterInfo, getNextChapterInfo, formatChapterLabel } from '../lib/chapterNav.js'
import {
  buildVersesCopyText,
  formatVerseRef,
  mergeVerses,
  selectVerseRange,
  toggleVerse,
} from '../lib/verseSelection.js'
import {
  addHighlights,
  loadChapterHighlights,
  removeHighlights,
} from '../lib/verseHighlights.js'
import SpeechFloatingControl from './SpeechFloatingControl.jsx'
import { useReadingDwellTimer } from '../hooks/useReadingDwellTimer.js'
import { formatReadingEstimate } from '../lib/readingEstimate.js'
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
  const [selectedVerses, setSelectedVerses] = useState(() => (verse > 0 ? [verse] : []))
  const [selectionAnchor, setSelectionAnchor] = useState(() => (verse > 0 ? verse : null))
  const [highlightedVerses, setHighlightedVerses] = useState(() => new Set())
  const [copyHint, setCopyHint] = useState('')
  const prevVerseRef = useRef(verse)
  const {
    registerChapter,
    stop,
    playChapter,
    currentVerse: speakingVerse,
    location: speechLocation,
    status,
    isActive,
  } = useSpeechReader()

  const bookInfo = bibleIndex[book]
  useReadingDwellTimer({ book, chapter, enabled: Boolean(bookInfo) })
  const isZh = version.lang !== 'en'
  const readingEstimate = useMemo(
    () => formatReadingEstimate(chapterData, version.lang),
    [chapterData, version.lang],
  )
  const isSpeakingHere = isActive
    && speechLocation?.book === book
    && speechLocation?.chapter === chapter
  const hasSelection = selectedVerses.length > 0

  useEffect(() => {
    if (!bookInfo) return
    const anchorVerse = selectedVerses.length === 1 ? selectedVerses[0] : 0
    storeLastReadingPosition({ book, chapter, verse: anchorVerse })
  }, [book, chapter, selectedVerses, bookInfo])

  useEffect(() => {
    setSelectedVerses(verse > 0 ? [verse] : [])
    setSelectionAnchor(verse > 0 ? verse : null)
    setCopyHint('')
  }, [book, chapter, versionId])

  useEffect(() => {
    setHighlightedVerses(loadChapterHighlights(versionId, book, chapter))
  }, [versionId, book, chapter])

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
    if (!isSpeakingHere || !speakingVerse || status !== 'playing') return

    const verseNum = speakingVerse
    const frame = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-verse="${verseNum}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [speakingVerse, isSpeakingHere, status])

  useEffect(() => {
    if (!isSpeakingHere || status !== 'playing') {
      prevVerseRef.current = verse
      return
    }
    if (verse > 0 && verse !== prevVerseRef.current) {
      playChapter({ fromVerse: verse })
    }
    prevVerseRef.current = verse
  }, [verse, isSpeakingHere, status, playChapter])

  useEffect(() => {
    if (!bookInfo) {
      document.title = appConfig.title
      return
    }
    const titleVerse = selectedVerses.length === 1 ? selectedVerses[0] : 0
    setPageTitle(book, chapter, { lang: version.lang, verse: titleVerse, versionLabel: version.label })
  }, [book, chapter, selectedVerses, version.lang, version.label, bookInfo])

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
  const refLabel = formatVerseRef(book, chapter, selectedVerses, version.lang)
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
  const allSelectedHighlighted = selectedVerses.length > 0
    && selectedVerses.every((num) => highlightedVerses.has(num))

  const syncUrl = (verses) => {
    if (verses.length === 1) {
      navigate(`${chapterPath}/${verses[0]}`, { replace: true })
    } else if (verses.length === 0 && verse > 0) {
      navigate(chapterPath, { replace: true })
    }
  }

  const clearSelection = () => {
    setSelectedVerses([])
    setSelectionAnchor(null)
    if (verse > 0) navigate(chapterPath, { replace: true })
  }

  const handleVerseClick = (verseNum, event) => {
    event.preventDefault()
    event.stopPropagation()

    let next
    if (event.shiftKey && selectionAnchor != null) {
      next = mergeVerses(selectedVerses, selectVerseRange(selectionAnchor, verseNum))
    } else {
      next = toggleVerse(selectedVerses, verseNum)
      setSelectionAnchor(verseNum)
    }

    setSelectedVerses(next)
    syncUrl(next)
  }

  const handleCopy = async () => {
    const copyText = buildVersesCopyText(chapterData, selectedVerses, book, chapter, version)
    try {
      await navigator.clipboard.writeText(copyText)
      setCopyHint(isZh ? '已复制' : 'Copied')
      window.setTimeout(() => setCopyHint(''), 1500)
    } catch {
      setCopyHint(isZh ? '复制失败' : 'Copy failed')
      window.setTimeout(() => setCopyHint(''), 1500)
    }
  }

  const handleHighlight = () => {
    setHighlightedVerses(addHighlights(versionId, book, chapter, selectedVerses, highlightedVerses))
    setCopyHint(isZh ? '已高亮' : 'Highlighted')
    window.setTimeout(() => setCopyHint(''), 1500)
  }

  const handleUnhighlight = () => {
    setHighlightedVerses(removeHighlights(versionId, book, chapter, selectedVerses, highlightedVerses))
    setCopyHint(isZh ? '已取消高亮' : 'Unhighlighted')
    window.setTimeout(() => setCopyHint(''), 1500)
  }

  const readerClass = [
    'reader',
    `lang-${version.lang}`,
    hasSelection ? 'has-verse-toolbar' : '',
    isSpeakingHere ? 'is-speaking' : '',
    isSpeakingHere && !hasSelection ? 'has-speech-float' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <article className={readerClass} onClick={clearSelection}>
        <div className="reader-header">
          <h1 className="reader-title">{getBookTitle(book, version.lang)} {chapter}</h1>
          <p className="reader-estimate">{readingEstimate}</p>
        </div>
        <p className="reader-meta">{version.label}</p>

        <div className="chapter">
          {chapterData.sections.map((section, index) => (
            <Section
              key={index}
              section={section}
              selectedVerses={selectedVerses}
              highlightedVerses={highlightedVerses}
              speakingVerse={isSpeakingHere ? speakingVerse : null}
              onVerseClick={handleVerseClick}
            />
          ))}
        </div>

        {!hasSelection && (
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

        {hasSelection && (
          <div className="verse-toolbar" onClick={(e) => e.stopPropagation()}>
            <span className="verse-toolbar-ref">{refLabel}</span>
            <div className="verse-toolbar-actions">
              {copyHint && <span className="verse-toolbar-copy-hint">{copyHint}</span>}
              <button
                type="button"
                className="verse-toolbar-btn verse-toolbar-btn-muted"
                onClick={clearSelection}
              >
                {isZh ? '取消' : 'Clear'}
              </button>
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
                onClick={allSelectedHighlighted ? handleUnhighlight : handleHighlight}
              >
                {allSelectedHighlighted
                  ? (isZh ? '取消高亮' : 'Unhighlight')
                  : (isZh ? '高亮' : 'Highlight')}
              </button>
            </div>
          </div>
        )}
      </article>

      <SpeechFloatingControl verseSelected={hasSelection} />
    </>
  )
}

function Section({ section, selectedVerses, highlightedVerses, speakingVerse, onVerseClick }) {
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
        const isSelected = selectedVerses.includes(verseNum)
        const isHighlighted = highlightedVerses.has(verseNum)

        const verseClassName = [
          'verse',
          ...(classes || []),
          isSelected ? 'selected' : '',
          isHighlighted ? 'highlighted' : '',
          verseNum === speakingVerse ? 'speaking' : '',
        ].filter(Boolean).join(' ')

        return (
          <span className="section-content" key={index}>
            {hasVerseLabel ? <span className="verse-num">{verseNum}</span> : null}
            <span className="verse-button">
              <span
                role="button"
                tabIndex={0}
                title={title}
                data-verse={verseNum}
                className={verseClassName}
                onClick={(e) => onVerseClick(verseNum, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onVerseClick(verseNum, e)
                  }
                }}
              >
                {verseText}
              </span>
            </span>
          </span>
        )
      })}
    </div>
  )
}
