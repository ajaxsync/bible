/** 阅读背景主题：常见护眼 / 电纸书配色 */
export const READING_THEMES = [
  {
    id: 'white',
    label: { chs: '白色', cht: '白色', en: 'White' },
    swatch: '#ffffff',
    vars: {
      '--bg': '#ffffff',
      '--bg-subtle': '#f7f6f3',
      '--bg-hover': '#efefef',
      '--border': '#e9e9e7',
      '--text': '#37352f',
      '--text-muted': '#787774',
      '--text-light': '#9b9a97',
      '--accent': '#2383e2',
      '--accent-soft': '#e7f3ff',
    },
  },
  {
    id: 'beige',
    label: { chs: '米色', cht: '米色', en: 'Beige' },
    swatch: '#f4ecd8',
    vars: {
      '--bg': '#f4ecd8',
      '--bg-subtle': '#ebe3cf',
      '--bg-hover': '#e0d6c0',
      '--border': '#d9cdb5',
      '--text': '#4a3f2f',
      '--text-muted': '#6b5e4a',
      '--text-light': '#8a7d68',
      '--accent': '#8b6914',
      '--accent-soft': '#f0e6c8',
    },
  },
  {
    id: 'green',
    label: { chs: '绿色', cht: '綠色', en: 'Green' },
    swatch: '#cce8cf',
    vars: {
      '--bg': '#cce8cf',
      '--bg-subtle': '#bdd9c0',
      '--bg-hover': '#aed0b2',
      '--border': '#a3c9a7',
      '--text': '#2d4a32',
      '--text-muted': '#4a6b50',
      '--text-light': '#6b8a70',
      '--accent': '#2e7d32',
      '--accent-soft': '#d4edda',
    },
  },
  {
    id: 'yellow',
    label: { chs: '黄色', cht: '黃色', en: 'Yellow' },
    swatch: '#fff9e6',
    vars: {
      '--bg': '#fff9e6',
      '--bg-subtle': '#f5efd6',
      '--bg-hover': '#ebe5cc',
      '--border': '#e8e0c8',
      '--text': '#4a4228',
      '--text-muted': '#6b6248',
      '--text-light': '#8a8068',
      '--accent': '#b8860b',
      '--accent-soft': '#fff3cd',
    },
  },
  {
    id: 'slate',
    label: { chs: '棕蓝', cht: '棕藍', en: 'Slate' },
    swatch: '#d4dce6',
    vars: {
      '--bg': '#d4dce6',
      '--bg-subtle': '#c8d2de',
      '--bg-hover': '#bcc8d6',
      '--border': '#b0bec8',
      '--text': '#3d3630',
      '--text-muted': '#5a5248',
      '--text-light': '#787068',
      '--accent': '#4a6fa5',
      '--accent-soft': '#dce8f4',
    },
  },
  {
    id: 'dark',
    label: { chs: '黑色', cht: '黑色', en: 'Dark' },
    swatch: '#1a1a1a',
    vars: {
      '--bg': '#1a1a1a',
      '--bg-subtle': '#252525',
      '--bg-hover': '#333333',
      '--border': '#3a3a3a',
      '--text': '#e8e8e8',
      '--text-muted': '#a0a0a0',
      '--text-light': '#707070',
      '--accent': '#5b9fd4',
      '--accent-soft': '#2a3a4a',
    },
  },
]

export const UI_STYLES = [
  { id: 'notion', label: { chs: 'Notion', cht: 'Notion', en: 'Notion' } },
  { id: 'kindle', label: { chs: 'Kindle', cht: 'Kindle', en: 'Kindle' } },
]

export const UI_STYLE_THEME_IDS = {
  notion: 'white',
  kindle: 'beige',
}

export const FONT_SIZES = [14, 15, 16, 17, 18, 20, 22, 24]
export const LINE_HEIGHTS = [1.5, 1.65, 1.85, 2.0, 2.2, 2.5]

const STORAGE_KEY = 'bible-reading-settings'
const SETTINGS_VERSION = 3
const LEGACY_DEFAULT_FONT_SIZE = 16

export const DEFAULT_READING_SETTINGS = {
  fontSize: 22,
  lineHeight: 1.85,
  themeId: 'white',
  uiStyle: 'notion',
}

export function getThemeById(id) {
  return READING_THEMES.find((t) => t.id === id) ?? READING_THEMES[0]
}

function normalizeReadingSettings(parsed) {
  let fontSize = FONT_SIZES.includes(parsed.fontSize) ? parsed.fontSize : DEFAULT_READING_SETTINGS.fontSize
  const lineHeight = LINE_HEIGHTS.includes(parsed.lineHeight) ? parsed.lineHeight : DEFAULT_READING_SETTINGS.lineHeight
  const themeId = READING_THEMES.some((t) => t.id === parsed.themeId) ? parsed.themeId : DEFAULT_READING_SETTINGS.themeId
  const uiStyle = UI_STYLES.some((s) => s.id === parsed.uiStyle) ? parsed.uiStyle : DEFAULT_READING_SETTINGS.uiStyle
  const version = parsed.version ?? 1

  if (version < SETTINGS_VERSION && fontSize === LEGACY_DEFAULT_FONT_SIZE) {
    fontSize = DEFAULT_READING_SETTINGS.fontSize
  }

  return { fontSize, lineHeight, themeId, uiStyle, version }
}

export function loadReadingSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_READING_SETTINGS }
    const parsed = JSON.parse(raw)
    const settings = normalizeReadingSettings(parsed)
    if (settings.version < SETTINGS_VERSION) {
      storeReadingSettings(settings)
    }
    const { version: _version, ...readingSettings } = settings
    return readingSettings
  } catch {
    return { ...DEFAULT_READING_SETTINGS }
  }
}

export function storeReadingSettings(settings) {
  const { version: _version, ...readingSettings } = settings
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readingSettings, version: SETTINGS_VERSION }))
}
