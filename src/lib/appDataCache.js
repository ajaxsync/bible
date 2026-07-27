import { appConfig } from '../config/env.js'
import { formatBytes } from './bibleCache.js'

const READING_SETTINGS_KEY = 'bible-reading-settings'
const LAST_READING_KEY = 'bible-last-reading'
const SPEECH_RATE_KEY = 'bible-speech-rate'
const SPEECH_VOICE_PREFIX = 'bible-speech-voice-'
const PICKER_VIEW_KEY = 'bible-chapter-picker-view'
const PICKER_VERSE_KEY = 'bible-chapter-picker-verse-mode'
const HIGHLIGHTS_KEY = 'bible-verse-highlights-v1'
const STAMINA_KEY = 'bible-reading-stamina-v1'

function storageValueBytes(key) {
  try {
    const value = localStorage.getItem(key)
    if (value == null) return 0
    return new Blob([key, value]).size
  } catch {
    return 0
  }
}

function listLocalStorageKeys() {
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key) keys.push(key)
    }
  } catch {
    // ignore
  }
  return keys
}

function sumKeys(keys) {
  return keys.reduce((total, key) => total + storageValueBytes(key), 0)
}

function readingSettingsKeys() {
  const keys = [READING_SETTINGS_KEY]
  if (appConfig.storageKeyVersion) keys.push(appConfig.storageKeyVersion)
  return keys
}

function speechKeys() {
  return listLocalStorageKeys().filter(
    (key) => key === SPEECH_RATE_KEY || key.startsWith(SPEECH_VOICE_PREFIX),
  )
}

function pickerKeys() {
  return [PICKER_VIEW_KEY, PICKER_VERSE_KEY]
}

/** 本地用户数据项；clearable=false 的仅展示、不可滑动删除 */
export const DATA_CACHE_ITEMS = [
  {
    id: 'readingSettings',
    clearable: true,
    keys: () => readingSettingsKeys(),
    label: { chs: '阅读设置', cht: '閱讀設定', en: 'Reading settings' },
    hint: { chs: '字号、主题与界面', cht: '字號、主題與介面', en: 'Font, theme, UI' },
  },
  {
    id: 'lastReading',
    clearable: true,
    keys: () => [LAST_READING_KEY],
    label: { chs: '上次阅读位置', cht: '上次閱讀位置', en: 'Last reading position' },
    hint: { chs: '打开应用时回到此处', cht: '開啟應用時回到此處', en: 'Restored on launch' },
  },
  {
    id: 'speech',
    clearable: true,
    keys: () => speechKeys(),
    label: { chs: '朗读设置', cht: '朗讀設定', en: 'Speech settings' },
    hint: { chs: '语速与音色', cht: '語速與音色', en: 'Rate and voice' },
  },
  {
    id: 'pickerPrefs',
    clearable: true,
    keys: () => pickerKeys(),
    label: { chs: '选择器偏好', cht: '選擇器偏好', en: 'Picker preferences' },
    hint: { chs: '章节列表视图', cht: '章節列表視圖', en: 'Chapter list view' },
  },
  {
    id: 'highlights',
    clearable: false,
    keys: () => [HIGHLIGHTS_KEY],
    label: { chs: '收藏与高亮', cht: '收藏與螢光', en: 'Saved highlights' },
    hint: { chs: '仅展示，不可删除', cht: '僅展示，不可刪除', en: 'View only' },
  },
  {
    id: 'stamina',
    clearable: false,
    keys: () => [STAMINA_KEY],
    label: { chs: '续航记录', cht: '續航記錄', en: 'Stamina records' },
    hint: { chs: '仅展示，不可删除', cht: '僅展示，不可刪除', en: 'View only' },
  },
]

export function getLocalDataItemStats() {
  return DATA_CACHE_ITEMS.map((item) => {
    const keys = item.keys().filter(Boolean)
    return {
      id: item.id,
      clearable: Boolean(item.clearable),
      label: item.label,
      hint: item.hint,
      bytes: sumKeys(keys),
      keys,
    }
  })
}

export function clearLocalDataItems(itemIds) {
  const idSet = new Set(itemIds)
  for (const item of DATA_CACHE_ITEMS) {
    if (!item.clearable || !idSet.has(item.id)) continue
    for (const key of item.keys()) {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
  }
}

/** 用户数据备份涉及的全部 localStorage key（不含经文 IndexedDB） */
export function collectUserDataKeys() {
  const keys = new Set()
  for (const item of DATA_CACHE_ITEMS) {
    for (const key of item.keys()) {
      if (key) keys.add(key)
    }
  }
  return [...keys]
}

export async function getPageCacheStats() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { available: false, bytes: 0, cacheCount: 0 }
  }

  try {
    const names = await caches.keys()
    let bytes = 0
    for (const name of names) {
      const cache = await caches.open(name)
      const requests = await cache.keys()
      for (const request of requests) {
        const response = await cache.match(request)
        if (!response) continue
        try {
          const blob = await response.clone().blob()
          bytes += blob.size
        } catch {
          // ignore unreadable entries
        }
      }
    }
    return { available: true, bytes, cacheCount: names.length }
  } catch {
    return { available: false, bytes: 0, cacheCount: 0 }
  }
}

export async function clearPageCache() {
  if (typeof window === 'undefined' || !('caches' in window)) return
  const names = await caches.keys()
  await Promise.all(names.map((name) => caches.delete(name)))
}

export { formatBytes }
