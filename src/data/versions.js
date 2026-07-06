import { appConfig } from '../config/env.js'

export const VERSIONS = {
  cunps: { id: 'cunps', label: '和合本 简体', shortLabel: '和合本 简体', lang: 'chs', role: 'primary' },
  cunp: { id: 'cunp', label: '和合本 繁体', shortLabel: '和合本 繁体', lang: 'cht', role: 'primary' },
  niv: { id: 'niv', label: 'NIV', shortLabel: 'NIV', lang: 'en', role: 'primary' },
}

export const PRIMARY_VERSION_IDS = appConfig.primaryVersionIds
export const DEFAULT_VERSION = appConfig.defaultVersion

const STORAGE_KEY = appConfig.storageKeyVersion

export function getVersion(id) {
  return VERSIONS[id] || VERSIONS[DEFAULT_VERSION]
}

export function isPrimaryVersion(id) {
  return PRIMARY_VERSION_IDS.includes(id)
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
