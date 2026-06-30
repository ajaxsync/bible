import { bibleIndex, getBookTitle } from '../data/bibleIndex.js'

export function getPrevChapterRoute(book, chapter) {
  const info = getPrevChapterInfo(book, chapter)
  if (!info) return null
  return `/${info.book}/${info.chapter}`
}

export function getNextChapterRoute(book, chapter) {
  const info = getNextChapterInfo(book, chapter)
  if (!info) return null
  return `/${info.book}/${info.chapter}`
}

export function getPrevChapterInfo(book, chapter) {
  if (book === 1 && chapter === 1) return null
  if (chapter === 1) {
    const prevBook = book - 1
    return { book: prevBook, chapter: bibleIndex[prevBook].chapters }
  }
  return { book, chapter: chapter - 1 }
}

export function getNextChapterInfo(book, chapter) {
  if (book === 66 && chapter === bibleIndex[66].chapters) return null
  if (chapter === bibleIndex[book].chapters) {
    return { book: book + 1, chapter: 1 }
  }
  return { book, chapter: chapter + 1 }
}

export function formatChapterLabel(book, chapter, lang) {
  const title = getBookTitle(book, lang)
  if (lang === 'en') return `${title} ${chapter}`
  return `${title}${chapter}章`
}
