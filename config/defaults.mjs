/** 环境变量默认值（运行时与 vite 构建共用） */
export const envDefaults = {
  VITE_APP_TITLE: 'Bible · Reader',
  VITE_APP_NAME: 'Bible',
  VITE_APP_ICON: '/favicon.svg',
  VITE_APP_FAVICON: '/favicon.svg',
  VITE_APP_LANG: 'zh-Hant',
  VITE_DEFAULT_ROUTE: '/1/1',
  VITE_JSON_BASE: '/json',
  VITE_DEFAULT_VERSION: 'cunps',
  VITE_PRIMARY_VERSIONS: 'cunps,cunp,niv',
  VITE_STORAGE_KEY_VERSION: 'bible-version-v2',
  VITE_CONTENT_MAX: '720px',
  VITE_HEADER_HEIGHT: '56px',
  VITE_ACCENT_COLOR: '#2383e2',
  /* 留空：界面字体由 index.css 按语言切换（中文黑体 + 英文 Inter）；勿再写死 Inter 覆盖整栈 */
  VITE_FONT_FAMILY: '',
}

export function parseEnvList(raw) {
  if (!raw) return []
  return raw.split(',').map((item) => item.trim()).filter(Boolean)
}
