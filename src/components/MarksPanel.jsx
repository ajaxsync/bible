import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bibleIndex, chapterToParam } from '../data/bibleIndex.js'
import { VERSIONS } from '../data/versions.js'
import { useVersion } from '../context/VersionContext.jsx'
import { formatVerseRef } from '../lib/verseSelection.js'
import { listAllHighlights } from '../lib/verseHighlights.js'
import { PANEL_TRANSITION_MS } from '../hooks/useAnimatedPanel.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import './MarksPanel.css'

const COPY = {
  chs: {
    title: '经文收藏',
    close: '关闭',
    desc: '点击条目可跳转阅读对应经节。',
    empty: '暂无收藏经节',
  },
  cht: {
    title: '經文收藏',
    close: '關閉',
    desc: '點擊條目可跳轉閱讀對應經節。',
    empty: '暫無收藏經節',
  },
  en: {
    title: 'Saved verses',
    close: 'Close',
    desc: 'Tap an item to open the saved verse.',
    empty: 'No saved verses yet',
  },
}

function buildEntryLabel(entry, lang) {
  const bookInfo = bibleIndex[entry.book]
  if (!bookInfo) return null
  const bookLang = VERSIONS[entry.versionId]?.lang ?? lang
  return formatVerseRef(entry.book, entry.chapter, entry.verses, bookLang)
}

function buildEntryRoute(entry) {
  const firstVerse = entry.verses[0]
  return `/${entry.book}/${chapterToParam(entry.chapter)}/${firstVerse}`
}

export default function MarksPanel({ onClose }) {
  const navigate = useNavigate()
  const { version } = useVersion()
  const lang = version.lang === 'en' ? 'en' : version.lang === 'cht' ? 'cht' : 'chs'
  const copy = COPY[lang]
  const [closing, setClosing] = useState(false)

  useScrollLock(true)

  const highlights = useMemo(() => listAllHighlights(), [])

  const requestClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => onClose(), PANEL_TRANSITION_MS)
  }

  const motionClass = closing ? 'is-closing' : 'is-open'

  const goToEntry = (entry) => {
    requestClose()
    window.setTimeout(() => navigate(buildEntryRoute(entry)), PANEL_TRANSITION_MS)
  }

  return (
    <>
      <div className={`marks-backdrop panel-backdrop ${motionClass}`} onClick={requestClose} aria-hidden />
      <div className={`marks-panel ${motionClass}`} role="dialog" aria-label={copy.title}>
        <BottomSheetHandle onClose={requestClose} label={copy.close} className="marks-panel-sheet-handle" />
        <div className="marks-panel-header">
          <h2 className="marks-panel-title">{copy.title}</h2>
          <button type="button" className="marks-panel-close" onClick={requestClose} aria-label={copy.close}>
            ×
          </button>
        </div>

        <div className="marks-panel-scroll">
          <p className="marks-panel-desc">{copy.desc}</p>

          {highlights.length === 0 ? (
            <p className="marks-empty">{copy.empty}</p>
          ) : (
            <ul className="marks-list">
              {highlights.map((entry) => {
                const label = buildEntryLabel(entry, version.lang)
                const versionLabel = VERSIONS[entry.versionId]?.shortLabel ?? entry.versionId
                if (!label) return null
                const key = `${entry.versionId}:${entry.book}:${entry.chapter}:${entry.verses.join(',')}`
                return (
                  <li key={key}>
                    <button type="button" className="marks-item" onClick={() => goToEntry(entry)}>
                      <span className="marks-item-ref">{label}</span>
                      <span className="marks-item-meta">{versionLabel}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
