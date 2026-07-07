import { useEffect, useState } from 'react'
import { getBookTitle, getBookPickerShort } from '../data/bibleIndex.js'
import { fetchChapter } from '../lib/fetchChapter.js'
import { getChapterVerseTotal } from '../lib/speechReader.js'
import {
  loadChapterPickerVerseMode,
  loadChapterPickerView,
  storeChapterPickerVerseMode,
  storeChapterPickerView,
} from '../lib/chapterPickerPrefs.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'

const OT_BOOK_IDS = Array.from({ length: 39 }, (_, i) => i + 1)
const NT_BOOK_IDS = Array.from({ length: 27 }, (_, i) => i + 40)

function testamentTabLabel(lang, testament) {
  if (lang === 'en') return testament === 'ot' ? 'OT' : 'NT'
  return testamentLabel(lang, testament)
}

function testamentLabel(lang, testament) {
  if (lang === 'en') return testament === 'ot' ? 'Old Testament' : 'New Testament'
  if (lang === 'chs') return testament === 'ot' ? '旧约' : '新约'
  return testament === 'ot' ? '舊約' : '新約'
}

function bookTestament(bookId) {
  return bookId <= 39 ? 'ot' : 'nt'
}

function booksForTestament(testament) {
  return testament === 'ot' ? OT_BOOK_IDS : NT_BOOK_IDS
}

function resolveBookForTestament(testament, preferredBook, fallbackBook) {
  const ids = booksForTestament(testament)
  if (ids.includes(preferredBook)) return preferredBook
  if (ids.includes(fallbackBook)) return fallbackBook
  return ids[0]
}

function useTestamentTab(currentBook) {
  const [testament, setTestament] = useState(() => bookTestament(currentBook))

  useEffect(() => {
    setTestament(bookTestament(currentBook))
  }, [currentBook])

  return [testament, setTestament]
}

function BreadcrumbTestamentTabs({ lang, testament, onChange }) {
  const isEn = lang === 'en'

  return (
    <div
      className="picker-segmented picker-breadcrumb-testament"
      role="tablist"
      aria-label={isEn ? 'Testament' : '约'}
    >
      {['ot', 'nt'].map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={testament === value}
          className={`picker-segmented-btn${testament === value ? ' current' : ''}`}
          onClick={() => onChange(value)}
          aria-label={testamentLabel(lang, value)}
        >
          {testamentTabLabel(lang, value)}
        </button>
      ))}
    </div>
  )
}

function TargetModeToggle({ lang, verseMode, onChange }) {
  const isEn = lang === 'en'
  const isCht = lang === 'cht'
  const label = isEn ? 'To verse' : isCht ? '目錄到節' : '目录到节'

  return (
    <label className="picker-target-switch">
      <span className={`picker-target-switch-label${verseMode ? ' active' : ''}`}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={verseMode}
        className="picker-target-switch-btn"
        onClick={() => onChange(!verseMode)}
        aria-label={
          isEn
            ? (verseMode ? 'Disable verse selection' : 'Enable verse selection')
            : (verseMode ? '关闭目录到节' : '开启目录到节')
        }
      >
        <span className="picker-target-switch-track" aria-hidden>
          <span className="picker-target-switch-thumb" />
        </span>
      </button>
    </label>
  )
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="14" height="2" rx="1" />
      <rect x="2" y="8" width="14" height="2" rx="1" />
      <rect x="2" y="13" width="14" height="2" rx="1" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <rect x="2" y="2" width="6" height="6" rx="1" />
      <rect x="10" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="10" width="6" height="6" rx="1" />
      <rect x="10" y="10" width="6" height="6" rx="1" />
    </svg>
  )
}

function ViewToggle({ lang, view, onChange }) {
  const isEn = lang === 'en'
  const isCht = lang === 'cht'
  const nextView = view === 'list' ? 'grid' : 'list'

  return (
    <button
      type="button"
      className="picker-view-toggle"
      onClick={() => onChange(nextView)}
      aria-label={
        nextView === 'grid'
          ? (isEn ? 'Show book abbreviations in grid' : isCht ? '卷名改為宮格顯示' : '卷名改为宫格显示')
          : (isEn ? 'Show full book names in list' : isCht ? '卷名改為列表顯示' : '卷名改为列表显示')
      }
      title={
        nextView === 'grid'
          ? (isEn ? 'Book grid' : isCht ? '卷名宮格' : '卷名宫格')
          : (isEn ? 'Book list' : isCht ? '卷名列表' : '卷名列表')
      }
    >
      {nextView === 'grid' ? <GridIcon /> : <ListIcon />}
    </button>
  )
}

function resolvePickerOpenState(currentBook, currentChapter) {
  if (currentBook && currentChapter) {
    return { step: 'chapter', selectedChapter: currentChapter }
  }
  return { step: 'book', selectedChapter: null }
}

function chapterBreadcrumbText(lang, chapter) {
  const isEn = lang === 'en'
  const isCht = lang === 'cht'
  const chapterLabel = isEn ? 'Ch' : isCht ? '章' : '章'
  if (!chapter) return chapterLabel
  return isEn ? `Ch ${chapter}` : isCht ? `第 ${chapter} 章` : `第 ${chapter} 章`
}

function PickerBreadcrumb({
  lang,
  testament,
  verseMode,
  book,
  chapter,
  step,
  view,
  onTestamentChange,
  onVerseModeChange,
  onViewChange,
  onStepChange,
}) {
  const isEn = lang === 'en'
  const isCht = lang === 'cht'
  const bookTitle = getBookTitle(book, lang)
  const bookLabel = isEn ? 'Book' : isCht ? '卷' : '卷'
  const verseLabel = isEn ? 'Verse' : isCht ? '節' : '节'
  const hasBook = step !== 'book'
  const hasChapter = step === 'chapter' || step === 'verse'

  return (
    <nav className="picker-breadcrumb" aria-label={isEn ? 'Picker steps' : '选择步骤'}>
      <div className="picker-breadcrumb-path">
        <BreadcrumbTestamentTabs
          lang={lang}
          testament={testament}
          onChange={onTestamentChange}
        />
        <span className="picker-breadcrumb-sep" aria-hidden>›</span>
        <button
          type="button"
          className={`picker-breadcrumb-item${step === 'book' ? ' current' : ''}`}
          onClick={() => onStepChange('book')}
          aria-current={step === 'book' ? 'step' : undefined}
        >
          {hasBook ? bookTitle : bookLabel}
        </button>

        {hasChapter && (
          <>
            <span className="picker-breadcrumb-sep" aria-hidden>›</span>
            <button
              type="button"
              className={`picker-breadcrumb-item${step === 'chapter' ? ' current' : ''}`}
              onClick={() => onStepChange('chapter')}
              aria-current={step === 'chapter' ? 'step' : undefined}
            >
              {chapterBreadcrumbText(lang, chapter)}
            </button>
          </>
        )}

        {verseMode && step === 'verse' && (
          <>
            <span className="picker-breadcrumb-sep" aria-hidden>›</span>
            <button
              type="button"
              className="picker-breadcrumb-item current"
              onClick={() => onStepChange('verse')}
              aria-current="step"
            >
              {verseLabel}
            </button>
          </>
        )}
      </div>

      <div className="picker-breadcrumb-actions">
        <TargetModeToggle lang={lang} verseMode={verseMode} onChange={onVerseModeChange} />
        {step === 'book' && (
          <ViewToggle lang={lang} view={view} onChange={onViewChange} />
        )}
      </div>
    </nav>
  )
}

function BookListItems({ bookIds, lang, activeBook, onPickBook }) {
  return bookIds.map((bookId) => {
    const shortTitle = getBookPickerShort(bookId, lang)
    return (
      <li key={bookId}>
        <button
          type="button"
          className={`dropdown-item ${bookId === activeBook ? 'current' : ''}`}
          onClick={() => onPickBook(bookId)}
        >
          {shortTitle && <span className="dropdown-book-short">{shortTitle}</span>}
          <span className="dropdown-book-title">{getBookTitle(bookId, lang)}</span>
        </button>
      </li>
    )
  })
}

function NumberGrid({ items, currentValue, onSelect, ariaPrefix }) {
  return (
    <ul className="chapter-grid picker-number-grid">
      {items.map((num) => (
        <li key={num}>
          <button
            type="button"
            className={`dropdown-item chapter-item${num === currentValue ? ' current' : ''}`}
            onClick={() => onSelect(num)}
            aria-label={`${ariaPrefix} ${num}`}
            aria-current={num === currentValue ? 'true' : undefined}
          >
            {num}
          </button>
        </li>
      ))}
    </ul>
  )
}

function BookAbbrevGrid({ bookIds, lang, selectedBook, onSelectBook }) {
  return (
    <div className="picker-grid-books">
      {bookIds.map((bookId) => {
        const shortTitle = getBookPickerShort(bookId, lang)
        const bookTitle = getBookTitle(bookId, lang)
        return (
          <button
            key={bookId}
            type="button"
            className={`picker-grid-book-btn${bookId === selectedBook ? ' current' : ''}`}
            onClick={() => onSelectBook(bookId)}
            aria-label={bookTitle}
            aria-pressed={bookId === selectedBook}
          >
            {shortTitle ? (
              <>
                <span className="picker-grid-book-short">{shortTitle}</span>
                <span className="picker-grid-book-full">{bookTitle}</span>
              </>
            ) : (
              <span className="picker-grid-book-short">{bookTitle}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function StepPicker({
  lang,
  view,
  testament,
  step,
  activeBook,
  activeBookInfo,
  selectedChapter,
  currentBook,
  currentChapter,
  currentVerse,
  verseTotal,
  verseLoading,
  verseError,
  onPickBook,
  onPickChapter,
  onPickVerse,
}) {
  const isEn = lang === 'en'
  const isChs = lang === 'chs'
  const visibleBookIds = booksForTestament(testament)

  if (step === 'book') {
    return (
      <div className="dropdown-panel-body dropdown-panel-body--step">
        {view === 'grid' ? (
          <BookAbbrevGrid
            bookIds={visibleBookIds}
            lang={lang}
            selectedBook={activeBook}
            onSelectBook={onPickBook}
          />
        ) : (
          <ul className="dropdown-list picker-step-list">
            <BookListItems
              bookIds={visibleBookIds}
              lang={lang}
              activeBook={activeBook}
              onPickBook={onPickBook}
            />
          </ul>
        )}
      </div>
    )
  }

  if (step === 'chapter') {
    return (
      <div className="dropdown-panel-body dropdown-panel-body--step dropdown-panel-body--numbers">
        <NumberGrid
          items={Array.from({ length: activeBookInfo.chapters }, (_, i) => i + 1)}
          currentValue={activeBook === currentBook ? currentChapter : 0}
          onSelect={onPickChapter}
          ariaPrefix={isEn ? 'Chapter' : '第'}
        />
      </div>
    )
  }

  const isCurrentVerse = activeBook === currentBook && selectedChapter === currentChapter
  const verseHeading = isEn ? 'Verse' : isChs ? '节' : '節'

  const verseButtons = Array.from({ length: verseTotal }, (_, i) => i + 1)

  return (
    <div className="dropdown-panel-body dropdown-panel-body--step dropdown-panel-body--numbers dropdown-panel-body--verse">
      {verseLoading && (
        <p className="picker-step-status">{isEn ? 'Loading…' : isChs ? '加载中…' : '載入中…'}</p>
      )}
      {verseError && <p className="picker-step-status picker-step-status--error">{verseError}</p>}
      {!verseLoading && !verseError && verseTotal > 0 && (
        <NumberGrid
          items={verseButtons}
          currentValue={isCurrentVerse ? currentVerse : 0}
          onSelect={onPickVerse}
          ariaPrefix={verseHeading}
        />
      )}
    </div>
  )
}

export default function BookChapterPicker({
  lang,
  versionId,
  currentBook,
  currentChapter,
  currentVerse = 0,
  activeBook,
  activeBookInfo,
  onPickBook,
  onGoToChapter,
  onClose,
}) {
  const openState = resolvePickerOpenState(currentBook, currentChapter)
  const [view, setView] = useState(loadChapterPickerView)
  const [verseMode, setVerseMode] = useState(loadChapterPickerVerseMode)
  const [testament, setTestament] = useTestamentTab(currentBook)
  const [step, setStep] = useState(openState.step)
  const [selectedChapter, setSelectedChapter] = useState(openState.selectedChapter)
  const [verseTotal, setVerseTotal] = useState(0)
  const [verseLoading, setVerseLoading] = useState(false)
  const [verseError, setVerseError] = useState('')
  const isEn = lang === 'en'

  const resetChapterSelection = () => {
    setSelectedChapter(null)
    setVerseTotal(0)
    setVerseError('')
  }

  const setPickerView = (next) => {
    setView(next)
    storeChapterPickerView(next)
  }

  const setPickerVerseMode = (enabled) => {
    setVerseMode(enabled)
    storeChapterPickerVerseMode(enabled)
    if (enabled && step === 'chapter' && selectedChapter) {
      setStep('verse')
    } else if (!enabled && step === 'verse') {
      setStep('chapter')
      resetChapterSelection()
    }
  }

  const handleTestamentChange = (next) => {
    setTestament(next)
    if (!booksForTestament(next).includes(activeBook)) {
      onPickBook(resolveBookForTestament(next, activeBook, currentBook))
    }
    setStep('book')
    resetChapterSelection()
  }

  const handlePickBook = (bookId) => {
    onPickBook(bookId)
    setStep('chapter')
    setSelectedChapter(bookId === currentBook ? currentChapter : null)
    setVerseTotal(0)
    setVerseError('')
  }

  const handlePickChapter = (chapter) => {
    if (!verseMode) {
      onGoToChapter(activeBook, chapter)
      return
    }
    setSelectedChapter(chapter)
    setStep('verse')
  }

  const handlePickVerse = (verse) => {
    if (selectedChapter) onGoToChapter(activeBook, selectedChapter, verse)
  }

  const handleStepChange = (nextStep) => {
    if (nextStep === 'book') {
      setStep('book')
      resetChapterSelection()
      return
    }
    if (nextStep === 'chapter') {
      setStep('chapter')
      resetChapterSelection()
      return
    }
    if (nextStep === 'verse' && verseMode && selectedChapter) {
      setStep('verse')
    }
  }

  useEffect(() => {
    if (!verseMode || step !== 'verse' || !selectedChapter) return undefined

    let cancelled = false
    setVerseLoading(true)
    setVerseError('')
    setVerseTotal(0)

    fetchChapter(versionId, activeBook, selectedChapter)
      .then((data) => {
        if (cancelled) return
        setVerseTotal(getChapterVerseTotal(data))
      })
      .catch((err) => {
        if (cancelled) return
        setVerseError(err.message)
      })
      .finally(() => {
        if (!cancelled) setVerseLoading(false)
      })

    return () => { cancelled = true }
  }, [verseMode, step, selectedChapter, activeBook, versionId])

  return (
    <div className="picker-shell">
      <BottomSheetHandle onClose={onClose} label={isEn ? 'Close' : '关闭'} />

      <PickerBreadcrumb
        lang={lang}
        testament={testament}
        verseMode={verseMode}
        book={activeBook}
        chapter={selectedChapter ?? (step !== 'book' ? currentChapter : null)}
        step={step}
        view={view}
        onTestamentChange={handleTestamentChange}
        onVerseModeChange={setPickerVerseMode}
        onViewChange={setPickerView}
        onStepChange={handleStepChange}
      />

      <StepPicker
        lang={lang}
        view={view}
        testament={testament}
        step={step}
        activeBook={activeBook}
        activeBookInfo={activeBookInfo}
        selectedChapter={selectedChapter}
        currentBook={currentBook}
        currentChapter={currentChapter}
        currentVerse={currentVerse}
        verseTotal={verseTotal}
        verseLoading={verseLoading}
        verseError={verseError}
        onPickBook={handlePickBook}
        onPickChapter={handlePickChapter}
        onPickVerse={handlePickVerse}
      />
    </div>
  )
}
