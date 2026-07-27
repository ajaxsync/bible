import packageJson from '../../package.json'
import { collectUserDataKeys } from './appDataCache.js'

export const BACKUP_FORMAT = 'bible-reader-backup'
export const BACKUP_FORMAT_VERSION = 1

function pad2(n) {
  return String(n).padStart(2, '0')
}

function stampForFilename(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    '-',
    pad2(date.getHours()),
    pad2(date.getMinutes()),
  ].join('')
}

export function buildBackupFilename(appVersion = packageJson.version) {
  const ver = String(appVersion || '0.0.0').replace(/[^\d.]+/g, '_')
  return `bible_reader_backup_${ver}_${stampForFilename()}.json`
}

/** 收集可备份的用户数据（阅读位置、收藏、续航、设置等） */
export function createUserDataBackup() {
  const keys = {}
  for (const key of collectUserDataKeys()) {
    try {
      const value = localStorage.getItem(key)
      if (value != null) keys[key] = value
    } catch {
      // ignore
    }
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: packageJson.version || '0.0.0',
    exportedAt: new Date().toISOString(),
    keys,
  }
}

export function serializeUserDataBackup(backup = createUserDataBackup()) {
  return `${JSON.stringify(backup, null, 2)}\n`
}

/**
 * @param {unknown} raw
 * @returns {{ format: string, formatVersion: number, appVersion?: string, exportedAt?: string, keys: Record<string, string> }}
 */
export function parseUserDataBackup(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!data || typeof data !== 'object') {
    throw new Error('invalid backup')
  }
  if (data.format !== BACKUP_FORMAT) {
    throw new Error('unsupported format')
  }
  if (typeof data.formatVersion !== 'number' || data.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error('unsupported format version')
  }
  if (!data.keys || typeof data.keys !== 'object' || Array.isArray(data.keys)) {
    throw new Error('missing keys')
  }

  const keys = {}
  for (const [key, value] of Object.entries(data.keys)) {
    if (typeof key !== 'string' || !key.startsWith('bible-')) continue
    if (typeof value !== 'string') continue
    keys[key] = value
  }

  return {
    format: data.format,
    formatVersion: data.formatVersion,
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : undefined,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : undefined,
    keys,
  }
}

/** 用备份覆盖本机对应 key；备份中没有的 key 不动 */
export function applyUserDataBackup(backup) {
  const parsed = backup.format === BACKUP_FORMAT && backup.keys
    ? backup
    : parseUserDataBackup(backup)

  const allowed = new Set(collectUserDataKeys())
  let written = 0
  for (const [key, value] of Object.entries(parsed.keys)) {
    if (!allowed.has(key)) continue
    try {
      localStorage.setItem(key, value)
      written += 1
    } catch {
      throw new Error('quota')
    }
  }
  return { written, total: Object.keys(parsed.keys).length }
}

/**
 * 导出：优先系统分享文件，否则触发下载。
 * @returns {Promise<'shared' | 'downloaded' | 'cancelled'>}
 */
export async function exportUserDataBackup() {
  const backup = createUserDataBackup()
  const text = serializeUserDataBackup(backup)
  const filename = buildBackupFilename(backup.appVersion)
  const blob = new Blob([text], { type: 'application/json' })
  const file = new File([blob], filename, { type: 'application/json' })

  try {
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled'
    // 分享失败则回退下载
  }

  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  }
  return 'downloaded'
}

export async function importUserDataBackupFromFile(file) {
  if (!file) throw new Error('no file')
  const text = await file.text()
  const backup = parseUserDataBackup(text)
  return applyUserDataBackup(backup)
}
