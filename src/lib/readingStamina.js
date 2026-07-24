const STORAGE_KEY = 'bible-reading-stamina-v1'
/** 当日有效阅读满此时长即打卡（续航完成） */
export const CHECKIN_THRESHOLD_SECONDS = 60

export function getTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function emptyData() {
  return {
    version: 1,
    records: {},
    streak: { current: 0, longest: 0, lastCompletedDate: null },
  }
}

export function loadStaminaData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyData()
    return {
      version: 1,
      records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {},
      streak: {
        current: Number(parsed.streak?.current) || 0,
        longest: Number(parsed.streak?.longest) || 0,
        lastCompletedDate: parsed.streak?.lastCompletedDate ?? null,
      },
    }
  } catch {
    return emptyData()
  }
}

function saveStaminaData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota errors */
  }
}

function getOrCreateTodayRecord(data, dateKey = getTodayKey()) {
  if (!data.records[dateKey]) {
    data.records[dateKey] = { seconds: 0, completed: false, chapters: [] }
  }
  return data.records[dateKey]
}

function updateStreak(data, todayKey = getTodayKey()) {
  const { streak } = data
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getTodayKey(yesterday)

  if (streak.lastCompletedDate === yesterdayKey) {
    streak.current += 1
  } else if (streak.lastCompletedDate !== todayKey) {
    streak.current = 1
  }

  streak.longest = Math.max(streak.longest, streak.current)
  streak.lastCompletedDate = todayKey
}

export function getIntensityLevel(seconds, completed) {
  if (!completed) {
    return seconds > 0 ? -1 : 0
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 3) return 1
  if (minutes < 10) return 2
  if (minutes < 30) return 3
  return 4
}

export function getTodaySnapshot() {
  const data = loadStaminaData()
  const todayKey = getTodayKey()
  const record = data.records[todayKey]
  return {
    todayKey,
    seconds: record?.seconds ?? 0,
    completed: record?.completed ?? false,
    chapters: record?.chapters ?? [],
    streak: data.streak.current,
    longest: data.streak.longest,
  }
}

export function addReadingSeconds(seconds) {
  if (seconds <= 0) return { justCompleted: false }

  const data = loadStaminaData()
  const record = getOrCreateTodayRecord(data)

  const prevCompleted = record.completed
  record.seconds += seconds

  if (!prevCompleted && record.seconds >= CHECKIN_THRESHOLD_SECONDS) {
    record.completed = true
    record.completedAt = new Date().toISOString()
    updateStreak(data)
    saveStaminaData(data)
    return { justCompleted: true, streak: data.streak.current }
  }

  saveStaminaData(data)
  return { justCompleted: false }
}

export function recordChapterVisit(book, chapter) {
  if (!Number.isInteger(book) || !Number.isInteger(chapter)) return
  const data = loadStaminaData()
  const record = getOrCreateTodayRecord(data)
  const key = `${book}/${chapter}`
  if (!record.chapters.includes(key)) {
    record.chapters.push(key)
    saveStaminaData(data)
  }
}

function buildDayCell(date, data, today, { isOutsideMonth = false } = {}) {
  const key = getTodayKey(date)
  const record = data.records[key]
  const seconds = record?.seconds ?? 0
  const completed = record?.completed ?? false

  return {
    date,
    key,
    isFuture: date > today,
    isOutsideMonth,
    seconds,
    completed,
    chapters: record?.chapters ?? [],
    level: getIntensityLevel(seconds, completed),
  }
}

function getMondayOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * 按月生成日历格（周一到周日，含月初月末补齐的相邻月日期）。
 * monthOffset: 0 本月，1 上月，以此类推。
 */
export function buildMonth(monthOffset = 0) {
  const data = loadStaminaData()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
  monthStart.setHours(0, 0, 0, 0)
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()

  const monthEnd = new Date(year, month + 1, 0)
  monthEnd.setHours(0, 0, 0, 0)

  const gridStart = getMondayOfWeek(monthStart)
  const gridEnd = new Date(monthEnd)
  const endWeekday = gridEnd.getDay()
  if (endWeekday !== 0) {
    gridEnd.setDate(gridEnd.getDate() + (7 - endWeekday))
  }

  const days = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const date = new Date(cursor)
    days.push(buildDayCell(date, data, today, {
      isOutsideMonth: date.getMonth() !== month,
    }))
    cursor.setDate(cursor.getDate() + 1)
  }

  return { days, year, month, monthStart }
}

export function formatMonthLabel(year, month, lang) {
  const date = new Date(year, month, 1)
  if (lang === 'en') {
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
  }
  if (lang === 'cht') {
    return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long' }).format(date)
  }
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(date)
}

export function formatDuration(seconds, lang) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) {
    return lang === 'en' ? '< 1 min' : '不足 1 分钟'
  }
  if (lang === 'en') {
    return minutes === 1 ? '1 min' : `${minutes} min`
  }
  return `${minutes} 分钟`
}

export function formatDateLabel(date, lang) {
  if (lang === 'en') {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  }
  if (lang === 'cht') {
    return new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
  }
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}
