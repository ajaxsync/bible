import { useEffect, useState } from 'react'
import { bibleIndex, getBookTitle, getBookPickerShort } from '../data/bibleIndex.js'
import { loadChapterPickerView, storeChapterPickerView } from '../lib/chapterPickerPrefs.js'

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

function TestamentTabs({ lang, testament, onChange }) {
  const isEn = lang === 'en'

  return (
    <div
      className="picker-segmented"
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

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="14" height="2" rx="1" />
      <rect x="2" y="8" width="14" height="2" rx="1" />
      <rect x="2" y="13" width="14" height="2" rx="1" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <rect x="2" y="2" width="6" height="6" rx="1" />
      <rect x="10" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="10" width="6" height="6" rx="1" />
      <rect x="10" y="10" width="6" height="6" rx="1" />
    </svg>
  )
}

function ViewToggle({ lang, view, onChange }) {
  const isEn = lang === 'en'
  const nextView = view === 'list' ? 'grid' : 'list'

  return (
    <button
      type="button"
      className="picker-view-toggle"
      onClick={() => onChange(nextView)}
      aria-label={
        nextView === 'grid'
          ? (isEn ? 'Switch to grid layout' : '切换到宫格')
          : (isEn ? 'Switch to list layout' : '切换到列表')
      }
    >
      {nextView === 'grid' ? <GridIcon /> : <ListIcon />}
    </button>
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
          {shortTitle && (
            <span className="dropdown-book-short">{shortTitle}</span>
          )}
          <span className="dropdown-book-title">{getBookTitle(bookId, lang)}</span>
        </button>
      </li>
    )
  })
}

function ListPicker({
  lang,
  testament,
  activeBook,
  activeBookInfo,
  currentBook,
  currentChapter,
  pickerBook,
  onPickBook,
  onGoToChapter,
}) {
  const isEn = lang === 'en'
  const isChs = lang === 'chs'
  const visibleBookIds = booksForTestament(testament)

  return (
    <div className="dropdown-panel-body">
      <div className="dropdown-column">
        <div className="dropdown-label">{isChs ? '书卷' : isEn ? 'Books' : '書卷'}</div>
        <ul className="dropdown-list">
          <BookListItems
            bookIds={visibleBookIds}
            lang={lang}
            activeBook={activeBook}
            onPickBook={onPickBook}
          />
        </ul>
      </div>
      <div className="dropdown-column">
        <div className="dropdown-label">
          {getBookTitle(activeBook, lang)} · {isEn ? 'Ch' : '章'}
        </div>
        <ul className="dropdown-list chapter-grid">
          {Array.from({ length: activeBookInfo.chapters }, (_, i) => i + 1).map((ch) => (
            <li key={ch}>
              <button
                type="button"
                className={`dropdown-item chapter-item ${activeBook === currentBook && ch === currentChapter && !pickerBook ? 'current' : ''}`}
                onClick={() => onGoToChapter(activeBook, ch)}
              >
                {ch}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
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
            title={bookTitle}
            aria-label={bookTitle}
            aria-pressed={bookId === selectedBook}
          >
            {shortTitle || bookTitle}
          </button>
        )
      })}
    </div>
  )
}

function GridPicker({ lang, testament, currentBook, currentChapter, onGoToChapter }) {
  const [selectedBook, setSelectedBook] = useState(currentBook)
  const isEn = lang === 'en'
  const selectedBookInfo = bibleIndex[selectedBook]
  const isReadingHere = selectedBook === currentBook
  const visibleBookIds = booksForTestament(testament)

  useEffect(() => {
    setSelectedBook(currentBook)
  }, [currentBook])

  useEffect(() => {
    setSelectedBook((prev) => resolveBookForTestament(testament, prev, currentBook))
  }, [testament, currentBook])

  return (
    <div className="dropdown-panel-body dropdown-panel-body--grid">
      <div className="picker-grid-layout">
        <div className="picker-grid-books-panel">
          <BookAbbrevGrid
            bookIds={visibleBookIds}
            lang={lang}
            selectedBook={selectedBook}
            onSelectBook={setSelectedBook}
          />
        </div>

        <div className="picker-grid-chapters-panel">
          <div className="picker-grid-chapters-label">
            {getBookTitle(selectedBook, lang)} · {isEn ? 'Ch' : '章'}
          </div>
          <div className="picker-grid-chapters">
            {Array.from({ length: selectedBookInfo.chapters }, (_, i) => i + 1).map((ch) => {
              const isCurrent = isReadingHere && ch === currentChapter
              return (
                <button
                  key={ch}
                  type="button"
                  className={`picker-grid-chapter${isCurrent ? ' current' : ''}`}
                  onClick={() => onGoToChapter(selectedBook, ch)}
                  aria-label={
                    isEn
                      ? `${getBookTitle(selectedBook, lang)}, chapter ${ch}`
                      : `${getBookTitle(selectedBook, lang)} 第 ${ch} 章`
                  }
                  aria-current={isCurrent ? 'true' : undefined}
                >
                  {ch}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BookChapterPicker({
  lang,
  currentBook,
  currentChapter,
  activeBook,
  activeBookInfo,
  pickerBook,
  onPickBook,
  onGoToChapter,
}) {
  const [view, setView] = useState(loadChapterPickerView)
  const [testament, setTestament] = useTestamentTab(currentBook)

  const setPickerView = (next) => {
    setView(next)
    storeChapterPickerView(next)
  }

  const handleTestamentChange = (next) => {
    setTestament(next)
    if (!booksForTestament(next).includes(activeBook)) {
      onPickBook(resolveBookForTestament(next, activeBook, currentBook))
    }
  }

  return (
    <>
      <div className="dropdown-toolbar">
        <TestamentTabs lang={lang} testament={testament} onChange={handleTestamentChange} />
        <ViewToggle lang={lang} view={view} onChange={setPickerView} />
      </div>

      {view === 'list' ? (
        <ListPicker
          lang={lang}
          testament={testament}
          activeBook={activeBook}
          activeBookInfo={activeBookInfo}
          currentBook={currentBook}
          currentChapter={currentChapter}
          pickerBook={pickerBook}
          onPickBook={onPickBook}
          onGoToChapter={onGoToChapter}
        />
      ) : (
        <GridPicker
          lang={lang}
          testament={testament}
          currentBook={currentBook}
          currentChapter={currentChapter}
          onGoToChapter={onGoToChapter}
        />
      )}
    </>
  )
}
