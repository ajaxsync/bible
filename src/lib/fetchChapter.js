import { appConfig } from '../config/env.js'

const JSON_BASE = appConfig.jsonBase

export async function fetchChapter(versionId, bookId, chapter, jin = false) {
  const suffix = jin ? '.jin' : ''
  const url = encodeURI(`${JSON_BASE}/${versionId}/${bookId}/${chapter}${suffix}.json`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`无法加载本章 (${versionId}): ${url}`)
  }
  return res.json()
}
