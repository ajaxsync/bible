import { getBookTitle } from '../data/bibleIndex.js'
import { appConfig } from '../config/env.js'

export function getChapterLabel(book, chapter, { lang, verse = 0, jin = false }) {
  const bookTitle = getBookTitle(book, lang)
  const ref = verse > 0 ? `${bookTitle} ${chapter}:${verse}` : `${bookTitle} ${chapter}`
  if (jin) return `${ref}${lang === 'en' ? ' (Highlights)' : '（金句）'}`
  return ref
}

export function getPageTitle(book, chapter, { versionLabel, ...options }) {
  const chapterLabel = getChapterLabel(book, chapter, options)
  return `${chapterLabel} · ${versionLabel} · ${appConfig.title}`
}

export function setPageTitle(book, chapter, options) {
  document.title = getPageTitle(book, chapter, options)
}
