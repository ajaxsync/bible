import { dataUrl } from './assetUrl.js'

export async function fetchVerseVersions(book, chapter, verse) {
  const url = encodeURI(`${dataUrl('json/verses')}/${book}/${chapter}/${verse}.json`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`无法加载对照数据: ${url}`)
  }
  const data = await res.json()
  const entry = Object.values(data)[0]
  return entry?.versions || {}
}
