import { useMemo, useState } from 'react'
import { useVersion } from '../context/VersionContext.jsx'
import { useReadingStamina } from '../context/ReadingStaminaContext.jsx'
import { PANEL_TRANSITION_MS } from '../hooks/useAnimatedPanel.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import {
  buildMonth,
  formatDateLabel,
  formatDuration,
  formatMonthLabel,
} from '../lib/readingStamina.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import LightningIcon from './LightningIcon.jsx'
import StaminaHelpDialog from './StaminaHelpDialog.jsx'
import './StaminaPanel.css'

const DAY_LABELS = {
  chs: ['一', '二', '三', '四', '五', '六', '日'],
  cht: ['一', '二', '三', '四', '五', '六', '日'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

const COPY = {
  chs: {
    title: '阅读续航',
    headline: '【续航】能帮助你培养每天读经的习惯。',
    streakLabel: '使用续航',
    bestLabel: '最佳续航',
    dayUnit: '天',
    legendLess: '少',
    legendMore: '多',
    currentMonthDuration: '本月续航时间',
    pastMonthDuration: '该月续航时间',
    recordTitle: '续航记录',
    prevMonth: '上一月',
    nextMonth: '下一月',
    future: '尚未到来',
    partial: '阅读中',
    notStarted: '未续航',
    chapters: (n) => `${n} 章`,
    helpAria: '了解续航功能',
  },
  cht: {
    title: '閱讀續航',
    headline: '【續航】能幫助你培養每天讀經的習慣。',
    streakLabel: '使用續航',
    bestLabel: '最佳續航',
    dayUnit: '天',
    legendLess: '少',
    legendMore: '多',
    currentMonthDuration: '本月續航時間',
    pastMonthDuration: '該月續航時間',
    recordTitle: '續航記錄',
    prevMonth: '上一月',
    nextMonth: '下一月',
    future: '尚未到來',
    partial: '閱讀中',
    notStarted: '未續航',
    chapters: (n) => `${n} 章`,
    helpAria: '了解續航功能',
  },
  en: {
    title: 'Reading stamina',
    headline: 'Stamina helps you build a daily Bible reading habit.',
    streakLabel: 'Current streak',
    bestLabel: 'best stamina',
    dayUnit: 'days',
    legendLess: 'Less',
    legendMore: 'More',
    currentMonthDuration: 'This month',
    pastMonthDuration: 'Month total',
    recordTitle: 'Stamina log',
    prevMonth: 'Previous',
    nextMonth: 'Next',
    future: 'Upcoming',
    partial: 'In progress',
    notStarted: 'No stamina',
    chapters: (n) => `${n} ch.`,
    helpAria: 'About stamina',
  },
}

function buildCellLabel(cell, lang, copy) {
  if (cell.isFuture) return copy.future
  if (cell.completed) {
    const parts = [formatDuration(cell.seconds, lang)]
    if (cell.chapters.length > 0) {
      parts.push(copy.chapters(cell.chapters.length))
    }
    return parts.join(' · ')
  }
  if (cell.seconds > 0) return `${copy.partial} · ${formatDuration(cell.seconds, lang)}`
  return copy.notStarted
}

function formatCompactDuration(seconds) {
  if (seconds <= 0) return '0min'
  const minutes = Math.floor(seconds / 60)
  return minutes < 1 ? '<1min' : `${minutes}min`
}

function StaminaCell({ cell, lang, copy }) {
  const levelClass = cell.isFuture
    ? 'is-future'
    : cell.level === -1
      ? 'is-partial'
      : `level-${cell.level}`

  return (
    <div
      className={`stamina-cell ${levelClass}${cell.isOutsideMonth ? ' is-outside' : ''}`}
      aria-label={`${formatDateLabel(cell.date, lang)}，${buildCellLabel(cell, lang, copy)}`}
    >
      <span className="stamina-cell-day" aria-hidden>{cell.date.getDate()}</span>
      <span className="stamina-cell-duration" aria-hidden>
        {cell.isFuture || cell.isOutsideMonth ? '—' : formatCompactDuration(cell.seconds)}
      </span>
    </div>
  )
}

export default function StaminaPanel({ onClose }) {
  const { version } = useVersion()
  const { streak, longest } = useReadingStamina()
  const [closing, setClosing] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)

  const lang = version.lang === 'en' ? 'en' : version.lang === 'cht' ? 'cht' : 'chs'
  const copy = COPY[lang]
  const dayLabels = DAY_LABELS[lang]

  useScrollLock(true)

  const month = useMemo(() => buildMonth(monthOffset), [monthOffset])
  const monthLabel = formatMonthLabel(month.year, month.month, lang)
  const monthSeconds = useMemo(
    () => month.days
      .filter((day) => !day.isOutsideMonth)
      .reduce((total, day) => total + day.seconds, 0),
    [month],
  )

  const requestClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => onClose(), PANEL_TRANSITION_MS)
  }

  const motionClass = closing ? 'is-closing' : 'is-open'

  return (
    <>
      <div className={`stamina-backdrop panel-backdrop ${motionClass}`} onClick={requestClose} aria-hidden />
      <div
        className={`stamina-panel ${motionClass}`}
        role="dialog"
        aria-label={copy.title}
      >
        <BottomSheetHandle onClose={requestClose} label={lang === 'en' ? 'Close' : '关闭'} className="stamina-panel-sheet-handle" />

        <div className="stamina-panel-scroll">
          <div className="stamina-panel-body">
            <button
              type="button"
              className="stamina-panel-headline"
              onClick={() => setHelpOpen(true)}
              aria-label={copy.helpAria}
            >
              {copy.headline}
            </button>

            <div className="stamina-panel-summary">
              <div className="stamina-stat-col">
                <p className="stamina-stat-days stamina-stat-days--current">
                  <LightningIcon size={24} className="stamina-streak-icon" />
                  <span>{streak}</span>
                  <span>{copy.dayUnit}</span>
                </p>
                <p className="stamina-stat-label">{copy.streakLabel}</p>
              </div>
              <div className="stamina-stat-sep" aria-hidden />
              <div className="stamina-stat-col">
                <p className="stamina-stat-days stamina-stat-days--best">
                  <LightningIcon size={24} className="stamina-streak-icon" />
                  <span>{longest}</span>
                  <span>{copy.dayUnit}</span>
                </p>
                <p className="stamina-stat-label">{copy.bestLabel}</p>
              </div>
            </div>

            <div className="stamina-record" aria-label={copy.recordTitle}>
              <div className="stamina-record-toolbar">
                <div className="stamina-record-nav">
                  <button
                    type="button"
                    className="stamina-record-nav-btn"
                    onClick={() => setMonthOffset((offset) => offset + 1)}
                  >
                    {copy.prevMonth}
                  </button>
                  <span className="stamina-record-month">{monthLabel}</span>
                  <button
                    type="button"
                    className="stamina-record-nav-btn"
                    disabled={monthOffset === 0}
                    onClick={() => setMonthOffset((offset) => Math.max(0, offset - 1))}
                  >
                    {copy.nextMonth}
                  </button>
                </div>
                <div className="stamina-record-meta">
                  <div className="stamina-panel-legend" aria-hidden>
                    <span>{copy.legendLess}</span>
                    <span className="stamina-legend-bar">
                      <span className="stamina-legend-cell level-0" />
                      <span className="stamina-legend-cell level-1" />
                      <span className="stamina-legend-cell level-2" />
                      <span className="stamina-legend-cell level-3" />
                      <span className="stamina-legend-cell level-4" />
                    </span>
                    <span>{copy.legendMore}</span>
                  </div>
                  <p className="stamina-month-total">
                    {monthOffset === 0 ? copy.currentMonthDuration : copy.pastMonthDuration}
                    <strong>{formatCompactDuration(monthSeconds)}</strong>
                  </p>
                </div>
              </div>

              <div className="stamina-week-headers" aria-hidden>
                {dayLabels.map((label) => (
                  <span key={label} className="stamina-week-day-label">{label}</span>
                ))}
              </div>

              <div className="stamina-month-grid">
                {month.days.map((cell) => (
                  <StaminaCell key={cell.key} cell={cell} lang={lang} copy={copy} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {helpOpen && (
        <StaminaHelpDialog lang={lang} onClose={() => setHelpOpen(false)} />
      )}
    </>
  )
}
