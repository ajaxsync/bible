const STORAGE_KEY = 'bible-chapter-picker-view'

export function loadChapterPickerView() {
  if (typeof window === 'undefined') return 'list'
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'grid' ? 'grid' : 'list'
}

export function storeChapterPickerView(view) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, view === 'grid' ? 'grid' : 'list')
}
