import { verseHighlightStore } from './verseMarkStorage.js'

export function loadChapterHighlights(versionId, book, chapter) {
  return verseHighlightStore.loadChapter(versionId, book, chapter)
}

export function addHighlights(versionId, book, chapter, verses, current) {
  return verseHighlightStore.add(versionId, book, chapter, verses, current)
}

export function removeHighlights(versionId, book, chapter, verses, current) {
  return verseHighlightStore.remove(versionId, book, chapter, verses, current)
}

export function listAllHighlights() {
  return verseHighlightStore.listAll()
}
