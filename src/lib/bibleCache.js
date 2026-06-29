import { assetUrl } from './assetUrl.js'
import { PRIMARY_VERSION_IDS } from '../data/versions.js'

const DB_NAME = 'bible-reader'
const DB_VERSION = 1

const memory = {
  chapters: new Map(),
  verses: new Map(),
}

let dbPromise = null

export function chapterCacheKey(versionId, book, chapter) {
  return `${versionId}:${book}:${chapter}`
}

export function verseCacheKey(book, chapter, verse) {
  return `${book}:${chapter}:${verse}`
}

export function estimateValueBytes(value) {
  try {
    return new Blob([JSON.stringify(value)]).size
  } catch {
    return 0
  }
}

export function formatBytes(bytes, lang = 'chs') {
  if (!bytes || bytes <= 0) return lang === 'en' ? '0 B' : '0 B'
  const units = lang === 'en'
    ? ['B', 'KB', 'MB', 'GB']
    : ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  const digits = unit === 0 ? 0 : size < 10 ? 1 : 0
  return `${size.toFixed(digits)} ${units[unit]}`
}

export function formatEta(ms, lang = 'chs') {
  if (!ms || !Number.isFinite(ms) || ms < 0) {
    return lang === 'en' ? 'Calculating…' : '计算中…'
  }
  const sec = Math.max(1, Math.ceil(ms / 1000))
  if (sec < 60) return lang === 'en' ? `~${sec}s left` : `约 ${sec} 秒`
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  if (min < 60) {
    return lang === 'en'
      ? `~${min}m ${remSec}s left`
      : `约 ${min} 分 ${remSec} 秒`
  }
  const hour = Math.floor(min / 60)
  const remMin = min % 60
  return lang === 'en'
    ? `~${hour}h ${remMin}m left`
    : `约 ${hour} 小时 ${remMin} 分`
}

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('chapters')) db.createObjectStore('chapters')
      if (!db.objectStoreNames.contains('verses')) db.createObjectStore('verses')
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
  })
  return dbPromise
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet(storeName, key) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readonly')
  return idbRequest(tx.objectStore(storeName).get(key))
}

async function idbPut(storeName, key, value) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  tx.objectStore(storeName).put(value, key)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbCount(storeName) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readonly')
  return idbRequest(tx.objectStore(storeName).count())
}

async function idbGetAllKeys(storeName) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readonly')
  return idbRequest(tx.objectStore(storeName).getAllKeys())
}

async function idbClear(storeName) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  tx.objectStore(storeName).clear()
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function adjustStoredBytes(chapterDelta, verseDelta) {
  if (!chapterDelta && !verseDelta) return
  const [chapterBytes, verseBytes] = await Promise.all([
    idbGet('meta', 'chapterBytes'),
    idbGet('meta', 'verseBytes'),
  ])
  await Promise.all([
    idbPut('meta', 'chapterBytes', Math.max(0, (chapterBytes ?? 0) + chapterDelta)),
    idbPut('meta', 'verseBytes', Math.max(0, (verseBytes ?? 0) + verseDelta)),
  ])
}

async function estimateStoreBytes(storeName) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.openCursor()
    let bytes = 0
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (!cursor) {
        resolve(bytes)
        return
      }
      bytes += estimateValueBytes(cursor.value)
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

function getMemoryUsage() {
  let chapterBytes = 0
  for (const value of memory.chapters.values()) chapterBytes += estimateValueBytes(value)
  let verseBytes = 0
  for (const value of memory.verses.values()) verseBytes += estimateValueBytes(value)
  return {
    chapterCount: memory.chapters.size,
    verseCount: memory.verses.size,
    chapterBytes,
    verseBytes,
    totalBytes: chapterBytes + verseBytes,
  }
}

async function ensureByteStats(chapterCount, verseCount) {
  let chapterBytes = await idbGet('meta', 'chapterBytes')
  let verseBytes = await idbGet('meta', 'verseBytes')

  if (chapterBytes == null && chapterCount > 0) {
    chapterBytes = await estimateStoreBytes('chapters')
    await idbPut('meta', 'chapterBytes', chapterBytes)
  }
  if (verseBytes == null && verseCount > 0) {
    verseBytes = await estimateStoreBytes('verses')
    await idbPut('meta', 'verseBytes', verseBytes)
  }

  return {
    chapterBytes: chapterBytes ?? 0,
    verseBytes: verseBytes ?? 0,
  }
}

export async function getCachedChapter(key) {
  if (memory.chapters.has(key)) return memory.chapters.get(key)
  const data = await idbGet('chapters', key)
  if (data) memory.chapters.set(key, data)
  return data ?? null
}

export async function putCachedChapter(key, data) {
  const nextBytes = estimateValueBytes(data)
  const prev = memory.chapters.has(key) ? memory.chapters.get(key) : await idbGet('chapters', key)
  const prevBytes = prev ? estimateValueBytes(prev) : 0
  const delta = nextBytes - prevBytes

  memory.chapters.set(key, data)
  await idbPut('chapters', key, data)
  if (delta) await adjustStoredBytes(delta, 0)
}

export async function getCachedVerse(key) {
  if (memory.verses.has(key)) return memory.verses.get(key)
  const data = await idbGet('verses', key)
  if (data) memory.verses.set(key, data)
  return data ?? null
}

export async function putCachedVerse(key, data) {
  const nextBytes = estimateValueBytes(data)
  const prev = memory.verses.has(key) ? memory.verses.get(key) : await idbGet('verses', key)
  const prevBytes = prev ? estimateValueBytes(prev) : 0
  const delta = nextBytes - prevBytes

  memory.verses.set(key, data)
  await idbPut('verses', key, data)
  if (delta) await adjustStoredBytes(0, delta)
}

export async function getCacheStats() {
  const [chapterCount, verseCount, fullDownloadAt] = await Promise.all([
    idbCount('chapters'),
    idbCount('verses'),
    idbGet('meta', 'fullDownloadAt'),
  ])
  const { chapterBytes, verseBytes } = await ensureByteStats(chapterCount, verseCount)
  const memory = getMemoryUsage()

  return {
    chapterCount,
    verseCount,
    chapterBytes,
    verseBytes,
    storageBytes: chapterBytes + verseBytes,
    fullDownloadAt: fullDownloadAt ?? null,
    memory,
  }
}

export async function clearScriptureCache() {
  memory.chapters.clear()
  memory.verses.clear()
  await Promise.all([
    idbClear('chapters'),
    idbClear('verses'),
    idbPut('meta', 'fullDownloadAt', null),
    idbPut('meta', 'chapterBytes', 0),
    idbPut('meta', 'verseBytes', 0),
  ])
}

function parseChapterPath(relativePath) {
  const match = relativePath.match(/^json\/([^/]+)\/(\d+)\/([^/]+)\.json$/)
  if (!match) return null
  const [, versionId, book, chapterFile] = match
  if (!PRIMARY_VERSION_IDS.includes(versionId) || chapterFile.includes('.jin')) return null
  const chapter = parseInt(chapterFile, 10)
  if (Number.isNaN(chapter)) return null
  return { versionId, book: parseInt(book, 10), chapter }
}

function parseVersePath(relativePath) {
  const match = relativePath.match(/^json\/verses\/(\d+)\/(\d+)\/(\d+)\.json$/)
  if (!match) return null
  return {
    book: parseInt(match[1], 10),
    chapter: parseInt(match[2], 10),
    verse: parseInt(match[3], 10),
  }
}

async function loadManifest() {
  const url = assetUrl('json/cache-manifest.json')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`无法加载缓存清单: ${url}`)
  return res.json()
}

export async function getManifestInfo() {
  const manifest = await loadManifest()
  return {
    chapterTotal: manifest.chapters.length,
    verseTotal: manifest.verses.length,
    totalBytes: manifest.totalBytes ?? 0,
  }
}

export function isFullyCached(stats, manifestInfo) {
  if (!stats?.fullDownloadAt || !manifestInfo) return false
  return stats.chapterCount >= manifestInfo.chapterTotal
    && stats.verseCount >= manifestInfo.verseTotal
}

export function hasPartialCache(stats, manifestInfo) {
  if (!manifestInfo || isFullyCached(stats, manifestInfo)) return false
  return stats.chapterCount > 0 || stats.verseCount > 0
}

function itemCacheKey(item) {
  if (item.kind === 'chapter') {
    const parsed = parseChapterPath(item.path)
    if (!parsed) return null
    return { store: 'chapter', key: chapterCacheKey(parsed.versionId, parsed.book, parsed.chapter) }
  }
  const parsed = parseVersePath(item.path)
  if (!parsed) return null
  return { store: 'verse', key: verseCacheKey(parsed.book, parsed.chapter, parsed.verse) }
}

function isItemCached(item, chapterKeySet, verseKeySet) {
  const ref = itemCacheKey(item)
  if (!ref) return true
  return ref.store === 'chapter' ? chapterKeySet.has(ref.key) : verseKeySet.has(ref.key)
}

export class DownloadAbortedError extends Error {
  constructor() {
    super('下载已取消')
    this.name = 'DownloadAbortedError'
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DownloadAbortedError()
}

export async function downloadAllScripture(onProgress, options = {}) {
  const { signal } = options
  throwIfAborted(signal)

  const manifest = await loadManifest()
  const items = [
    ...manifest.chapters.map((path) => ({ kind: 'chapter', path })),
    ...manifest.verses.map((path) => ({ kind: 'verse', path })),
  ]
  const total = items.length
  const totalBytes = manifest.totalBytes ?? 0

  const [chapterKeys, verseKeys, initialStats] = await Promise.all([
    idbGetAllKeys('chapters'),
    idbGetAllKeys('verses'),
    getCacheStats(),
  ])
  const chapterKeySet = new Set(chapterKeys)
  const verseKeySet = new Set(verseKeys)

  const pending = []
  let initialDone = 0
  for (const item of items) {
    if (isItemCached(item, chapterKeySet, verseKeySet)) {
      initialDone += 1
    } else {
      pending.push(item)
    }
  }

  let done = initialDone
  let sessionDone = 0
  let sessionBytes = 0
  const initialBytes = initialStats.storageBytes
  const startedAt = Date.now()

  const reportProgress = () => {
    const elapsed = Date.now() - startedAt
    const pendingLeft = pending.length - sessionDone
    const etaMs = sessionDone > 0 && pendingLeft > 0
      ? (elapsed / sessionDone) * pendingLeft
      : null
    const bytesDone = initialBytes + sessionBytes
    const bytesLeft = Math.max(0, totalBytes - bytesDone)
    const bytesEtaMs = sessionBytes > 0 && bytesLeft > 0
      ? (elapsed / sessionBytes) * bytesLeft
      : etaMs

    onProgress?.({
      done,
      total,
      bytesDownloaded: bytesDone,
      totalBytes,
      etaMs: bytesEtaMs ?? etaMs,
    })
  }

  reportProgress()

  if (pending.length === 0) {
    throwIfAborted(signal)
    await idbPut('meta', 'fullDownloadAt', Date.now())
    return { total, totalBytes }
  }

  const batchSize = 20
  for (let i = 0; i < pending.length; i += batchSize) {
    throwIfAborted(signal)
    const batch = pending.slice(i, i + batchSize)
    await Promise.all(batch.map(async (item) => {
      throwIfAborted(signal)
      const url = assetUrl(item.path)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`下载失败: ${url}`)
      const buffer = await res.arrayBuffer()
      throwIfAborted(signal)
      sessionBytes += buffer.byteLength
      const data = JSON.parse(new TextDecoder().decode(buffer))

      const ref = itemCacheKey(item)
      if (!ref) return

      if (ref.store === 'chapter') {
        await putCachedChapter(ref.key, data)
        chapterKeySet.add(ref.key)
      } else {
        const entry = Object.values(data)[0]
        await putCachedVerse(ref.key, entry?.versions || {})
        verseKeySet.add(ref.key)
      }
    }))
    done += batch.length
    sessionDone += batch.length
    reportProgress()
  }

  throwIfAborted(signal)
  await idbPut('meta', 'fullDownloadAt', Date.now())
  return { total, totalBytes }
}
