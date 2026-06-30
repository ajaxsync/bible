import { bibleIndex, chapterToParam } from '../data/bibleIndex.js'
import { appConfig } from '../config/env.js'

const STORAGE_KEY = 'bible-last-reading'

export function isValidReadingPosition({ book, chapter, verse = 0 }) {
  const info = bibleIndex[book]
  if (!info) return false
  if (!Number.isInteger(book) || !Number.isInteger(chapter)) return false
  if (chapter < 1 || chapter > info.chapters) return false
  if (!Number.isInteger(verse) || verse < 0) return false
  return true
}

export function loadLastReadingPosition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const book = parseInt(parsed.book, 10)
    const chapter = parseInt(parsed.chapter, 10)
    const verse = parsed.verse != null ? parseInt(parsed.verse, 10) : 0
    if (!isValidReadingPosition({ book, chapter, verse })) return null
    return { book, chapter, verse }
  } catch {
    return null
  }
}

export function storeLastReadingPosition({ book, chapter, verse = 0 }) {
  if (!isValidReadingPosition({ book, chapter, verse })) return
  try {
    const payload = { book, chapter }
    if (verse > 0) payload.verse = verse
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota errors */
  }
}

export function readingPositionToPath({ book, chapter, verse = 0 }) {
  const base = `/${book}/${chapterToParam(chapter)}`
  return verse > 0 ? `${base}/${verse}` : base
}

export function getLastReadingRoute() {
  const pos = loadLastReadingPosition()
  return pos ? readingPositionToPath(pos) : appConfig.defaultRoute
}
