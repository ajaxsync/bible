import { dataUrl } from './assetUrl.js'
import {
  verseCacheKey,
  getCachedVerse,
  putCachedVerse,
} from './bibleCache.js'

export async function fetchVerseVersions(book, chapter, verse) {
  const key = verseCacheKey(book, chapter, verse)
  const cached = await getCachedVerse(key)
  if (cached) return cached

  const url = encodeURI(`${dataUrl('json/verses')}/${book}/${chapter}/${verse}.json`)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const entry = Object.values(data)[0]
    const versions = entry?.versions || {}
    await putCachedVerse(key, versions)
    return versions
  } catch {
    const offline = await getCachedVerse(key)
    if (offline) return offline
    throw new Error(`无法加载对照数据: ${url}`)
  }
}
