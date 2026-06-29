import { envDefaults, parseEnvList } from '../../config/defaults.mjs'

function readEnv(key) {
  const value = import.meta.env[key]
  if (value !== undefined && value !== '') return value
  return envDefaults[key] ?? ''
}

function readEnvList(key) {
  const raw = readEnv(key)
  return parseEnvList(raw)
}

/** 站点与运行时配置（VITE_ 前缀，见 .env.example） */
export const appConfig = {
  title: readEnv('VITE_APP_TITLE'),
  name: readEnv('VITE_APP_NAME'),
  icon: readEnv('VITE_APP_ICON'),
  favicon: readEnv('VITE_APP_FAVICON'),
  htmlLang: readEnv('VITE_APP_LANG'),
  defaultRoute: readEnv('VITE_DEFAULT_ROUTE'),
  jsonBase: readEnv('VITE_JSON_BASE'),
  versesEndpoint: readEnv('VITE_VERSES_ENDPOINT'),
  defaultVersion: readEnv('VITE_DEFAULT_VERSION'),
  primaryVersionIds: readEnvList('VITE_PRIMARY_VERSIONS'),
  compareZhIds: readEnvList('VITE_COMPARE_ZH_VERSIONS'),
  compareEnIds: readEnvList('VITE_COMPARE_EN_VERSIONS'),
  storageKeyVersion: readEnv('VITE_STORAGE_KEY_VERSION'),
  storageKeyCompare: readEnv('VITE_STORAGE_KEY_COMPARE'),
  contentMax: readEnv('VITE_CONTENT_MAX'),
  headerHeight: readEnv('VITE_HEADER_HEIGHT'),
  accentColor: readEnv('VITE_ACCENT_COLOR'),
  fontFamily: readEnv('VITE_FONT_FAMILY'),
}

export function isImageIcon(icon) {
  return icon.startsWith('/') || icon.startsWith('http://') || icon.startsWith('https://')
}

export function applyAppTheme() {
  const root = document.documentElement
  root.lang = appConfig.htmlLang
  document.title = appConfig.title
  root.style.setProperty('--content-max', appConfig.contentMax)
  root.style.setProperty('--header-height', appConfig.headerHeight)
  root.style.setProperty('--accent', appConfig.accentColor)
  root.style.setProperty('--font', appConfig.fontFamily)

  const favicon = document.querySelector('link[rel="icon"]')
  if (favicon && appConfig.favicon) {
    favicon.href = appConfig.favicon
  }
}
