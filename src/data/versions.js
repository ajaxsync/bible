import { appConfig } from '../config/env.js'

export const VERSIONS = {
  cunps: { id: 'cunps', label: '和合本 简体', shortLabel: '和合本 简体', lang: 'chs', role: 'primary' },
  cunp: { id: 'cunp', label: '和合本 繁体', shortLabel: '和合本 繁体', lang: 'cht', role: 'primary' },
  niv: { id: 'niv', label: 'NIV', shortLabel: 'NIV', lang: 'en', role: 'primary' },
  cnv: { id: 'cnv', label: '新译本', shortLabel: '新译本', lang: 'cht', role: 'compare' },
  ccb: { id: 'ccb', label: '当代译本', shortLabel: '当代译本', lang: 'chs', role: 'compare' },
  csbs: { id: 'csbs', label: '标准译本', shortLabel: '标准译本', lang: 'chs', role: 'compare' },
  esv: { id: 'esv', label: 'ESV', shortLabel: 'ESV', lang: 'en', role: 'compare' },
  nasb: { id: 'nasb', label: 'NASB', shortLabel: 'NASB', lang: 'en', role: 'compare' },
}

export const PRIMARY_VERSION_IDS = appConfig.primaryVersionIds
export const COMPARE_ZH_IDS = appConfig.compareZhIds
export const COMPARE_EN_IDS = appConfig.compareEnIds
export const DEFAULT_VERSION = appConfig.defaultVersion

const STORAGE_KEY = appConfig.storageKeyVersion
const COMPARE_STORAGE_KEY = appConfig.storageKeyCompare

export function getVersion(id) {
  return VERSIONS[id] || VERSIONS[DEFAULT_VERSION]
}

export function isPrimaryVersion(id) {
  return PRIMARY_VERSION_IDS.includes(id)
}

export function getCompareVersionIds(primaryId) {
  const primary = getVersion(primaryId)
  return primary.lang === 'en' ? [...COMPARE_EN_IDS] : [...COMPARE_ZH_IDS]
}

export function loadStoredVersion() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && isPrimaryVersion(v)) return v
  } catch (_) {}
  return DEFAULT_VERSION
}

export function storeVersion(id) {
  if (!isPrimaryVersion(id)) return
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch (_) {}
}

export function loadCompareSelection(primaryId) {
  const available = getCompareVersionIds(primaryId)
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const filtered = parsed.filter((id) => available.includes(id))
      if (filtered.length > 0) return filtered
    }
  } catch (_) {}
  return available
}

export function storeCompareSelection(ids) {
  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids))
  } catch (_) {}
}
