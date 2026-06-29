import { dataUrl } from './assetUrl.js'
import {
  chapterCacheKey,
  getCachedChapter,
  putCachedChapter,
} from './bibleCache.js'

export async function fetchChapter(versionId, bookId, chapter) {
  const key = chapterCacheKey(versionId, bookId, chapter)
  const cached = await getCachedChapter(key)
  if (cached) return cached

  const url = encodeURI(`${dataUrl('json')}/${versionId}/${bookId}/${chapter}.json`)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    await putCachedChapter(key, data)
    return data
  } catch (err) {
    const offline = await getCachedChapter(key)
    if (offline) return offline
    throw new Error(`无法加载本章 (${versionId}): ${url}`)
  }
}
