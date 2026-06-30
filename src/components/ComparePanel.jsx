import { useEffect, useState } from 'react'
import { getBookTitle } from '../data/bibleIndex.js'
import {
  getCompareVersionIds,
  getVersion,
  loadCompareSelection,
  storeCompareSelection,
} from '../data/versions.js'
import { fetchVerseVersions } from '../lib/fetchVerse.js'
import './ComparePanel.css'
import BottomSheetHandle from './BottomSheetHandle.jsx'

export default function ComparePanel({
  book,
  chapter,
  verse,
  primaryVersionId,
  primaryLang,
  onClose,
}) {
  const compareIds = getCompareVersionIds(primaryVersionId)
  const [selectedIds, setSelectedIds] = useState(() => loadCompareSelection(primaryVersionId))
  const [versionsData, setVersionsData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const primary = getVersion(primaryVersionId)
  const refLabel = `${getBookTitle(book, primaryLang)} ${chapter}:${verse}`

  useEffect(() => {
    setSelectedIds(loadCompareSelection(primaryVersionId))
  }, [primaryVersionId, book, chapter, verse])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setVersionsData(null)

    fetchVerseVersions(book, chapter, verse)
      .then((data) => {
        if (!cancelled) setVersionsData(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [book, chapter, verse])

  const toggleVersion = (id) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
      const valid = next.filter((x) => compareIds.includes(x))
      storeCompareSelection(valid.length > 0 ? valid : compareIds)
      return valid.length > 0 ? valid : compareIds
    })
  }

  return (
    <>
      <div className="compare-backdrop" onClick={onClose} aria-hidden />
      <aside className="compare-panel" role="dialog" aria-label="对照阅读" onClick={(e) => e.stopPropagation()}>
        <BottomSheetHandle onClose={onClose} label="关闭" className="compare-sheet-handle" />
        <header className="compare-header">
          <div>
            <div className="compare-title">{refLabel} · 对照</div>
            <div className="compare-subtitle">主阅读：{primary.label}</div>
          </div>
          <button type="button" className="compare-close" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className="compare-chips">
          {compareIds.map((id) => {
            const v = getVersion(id)
            const active = selectedIds.includes(id)
            return (
              <button
                key={id}
                type="button"
                className={`compare-chip ${active ? 'active' : ''}`}
                onClick={() => toggleVersion(id)}
              >
                {v.shortLabel}
              </button>
            )
          })}
        </div>

        <div className="compare-body">
          {loading && <p className="compare-status">加载中…</p>}
          {error && <p className="compare-status compare-error">{error}</p>}
          {!loading && !error && selectedIds.map((id) => {
            const v = getVersion(id)
            const block = versionsData?.[id]
            return (
              <div className="compare-row" key={id}>
                <div className="compare-row-label">{v.label}</div>
                <div className="compare-row-text">{block?.text || '（暂无文本）'}</div>
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}
