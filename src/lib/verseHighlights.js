const STORAGE_KEY = 'bible-verse-highlights-v1'

function chapterKey(versionId, book, chapter) {
  return `${versionId}:${book}:${chapter}`
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (_) {}
}

export function loadChapterHighlights(versionId, book, chapter) {
  const all = readAll()
  const verses = all[chapterKey(versionId, book, chapter)]
  return new Set(Array.isArray(verses) ? verses : [])
}

export function saveChapterHighlights(versionId, book, chapter, verseSet) {
  const all = readAll()
  const key = chapterKey(versionId, book, chapter)
  const sorted = [...verseSet].sort((a, b) => a - b)
  if (sorted.length === 0) delete all[key]
  else all[key] = sorted
  writeAll(all)
}

export function addHighlights(versionId, book, chapter, verses, current) {
  const next = new Set(current)
  for (const num of verses) next.add(num)
  saveChapterHighlights(versionId, book, chapter, next)
  return next
}

export function removeHighlights(versionId, book, chapter, verses, current) {
  const next = new Set(current)
  for (const num of verses) next.delete(num)
  saveChapterHighlights(versionId, book, chapter, next)
  return next
}
