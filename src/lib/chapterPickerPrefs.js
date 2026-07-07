const VIEW_STORAGE_KEY = 'bible-chapter-picker-view'
const VERSE_MODE_STORAGE_KEY = 'bible-chapter-picker-verse-mode'

export function loadChapterPickerView() {
  if (typeof window === 'undefined') return 'grid'
  const value = localStorage.getItem(VIEW_STORAGE_KEY)
  return value === 'list' ? 'list' : 'grid'
}

export function storeChapterPickerView(view) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VIEW_STORAGE_KEY, view === 'grid' ? 'grid' : 'list')
}

export function loadChapterPickerVerseMode() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(VERSE_MODE_STORAGE_KEY) === '1'
}

export function storeChapterPickerVerseMode(enabled) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VERSE_MODE_STORAGE_KEY, enabled ? '1' : '0')
}
