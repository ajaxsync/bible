function chapterKey(versionId, book, chapter) {
  return `${versionId}:${book}:${chapter}`
}

function parseChapterKey(key) {
  const parts = key.split(':')
  if (parts.length !== 3) return null
  const book = parseInt(parts[1], 10)
  const chapter = parseInt(parts[2], 10)
  if (Number.isNaN(book) || Number.isNaN(chapter)) return null
  return { versionId: parts[0], book, chapter }
}

export function createVerseMarkStore(storageKey) {
  function readAll() {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function writeAll(data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (_) {}
  }

  return {
    loadChapter(versionId, book, chapter) {
      const all = readAll()
      const verses = all[chapterKey(versionId, book, chapter)]
      return new Set(Array.isArray(verses) ? verses : [])
    },

    saveChapter(versionId, book, chapter, verseSet) {
      const all = readAll()
      const key = chapterKey(versionId, book, chapter)
      const sorted = [...verseSet].sort((a, b) => a - b)
      if (sorted.length === 0) delete all[key]
      else all[key] = sorted
      writeAll(all)
    },

    add(versionId, book, chapter, verses, current) {
      const next = new Set(current)
      for (const num of verses) next.add(num)
      this.saveChapter(versionId, book, chapter, next)
      return next
    },

    remove(versionId, book, chapter, verses, current) {
      const next = new Set(current)
      for (const num of verses) next.delete(num)
      this.saveChapter(versionId, book, chapter, next)
      return next
    },

    listAll() {
      const all = readAll()
      const entries = []

      for (const [key, verses] of Object.entries(all)) {
        const parsed = parseChapterKey(key)
        if (!parsed || !Array.isArray(verses) || verses.length === 0) continue
        entries.push({
          ...parsed,
          verses: [...verses].sort((a, b) => a - b),
        })
      }

      entries.sort((a, b) => {
        if (a.book !== b.book) return a.book - b.book
        if (a.chapter !== b.chapter) return a.chapter - b.chapter
        return a.versionId.localeCompare(b.versionId)
      })

      return entries
    },
  }
}

export const verseHighlightStore = createVerseMarkStore('bible-verse-highlights-v1')
