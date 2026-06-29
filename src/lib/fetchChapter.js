import { dataUrl } from './assetUrl.js'

export async function fetchChapter(versionId, bookId, chapter, jin = false) {
  const suffix = jin ? '.jin' : ''
  const url = encodeURI(`${dataUrl('json')}/${versionId}/${bookId}/${chapter}${suffix}.json`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`无法加载本章 (${versionId}): ${url}`)
  }
  return res.json()
}
