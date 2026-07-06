import { getVerseText } from './speechReader.js'
import { getBookTitle } from '../data/bibleIndex.js'

export function sortVerses(verses) {
  return [...verses].sort((a, b) => a - b)
}

export function toggleVerse(selected, verseNum) {
  const set = new Set(selected)
  if (set.has(verseNum)) set.delete(verseNum)
  else set.add(verseNum)
  return sortVerses([...set])
}

export function selectVerseRange(anchor, verseNum) {
  const start = Math.min(anchor, verseNum)
  const end = Math.max(anchor, verseNum)
  const range = []
  for (let n = start; n <= end; n += 1) range.push(n)
  return range
}

export function mergeVerses(selected, verses) {
  return sortVerses([...new Set([...selected, ...verses])])
}

export function formatVerseRef(book, chapter, verses, lang) {
  const bookTitle = getBookTitle(book, lang)
  const sorted = sortVerses(verses)
  if (sorted.length === 0) return `${bookTitle} ${chapter}`
  if (sorted.length === 1) return `${bookTitle} ${chapter}:${sorted[0]}`

  const parts = formatVerseRangeParts(sorted)
  return `${bookTitle} ${chapter}:${parts.join(',')}`
}

function formatVerseRangeParts(sorted) {
  const parts = []
  let rangeStart = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i]
    if (current === prev + 1) {
      prev = current
      continue
    }
    parts.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`)
    rangeStart = current
    prev = current
  }

  return parts
}

/** 复制用引用：【创世记5章10节】或【创世记5章10-20节】 */
export function formatCopyRef(book, chapter, verses, lang) {
  const bookTitle = getBookTitle(book, lang)
  const sorted = sortVerses(verses)
  if (sorted.length === 0) return ''

  if (sorted.length === 1) {
    if (lang === 'en') return `【${bookTitle} ${chapter}:${sorted[0]}】`
    return `【${bookTitle}${chapter}章${sorted[0]}节】`
  }

  const rangeLabel = formatVerseRangeParts(sorted).join(',')
  if (lang === 'en') return `【${bookTitle} ${chapter}:${rangeLabel}】`
  return `【${bookTitle}${chapter}章${rangeLabel}节】`
}

export function buildVersesCopyText(chapterData, verses, book, chapter, version) {
  const sorted = sortVerses(verses)
  const ref = formatCopyRef(book, chapter, sorted, version.lang)
  if (sorted.length === 0) return ''

  if (sorted.length === 1) {
    const text = getVerseText(chapterData, sorted[0])
    return `${text.trim()}${ref}`
  }

  const lines = sorted.map((num) => {
    const text = getVerseText(chapterData, num)
    return `${num} ${text}`.trim()
  })
  return `${lines.join('\n')}${ref}`
}
