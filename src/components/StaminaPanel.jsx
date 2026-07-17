import { useMemo, useRef, useState } from 'react'
import { useVersion } from '../context/VersionContext.jsx'
import { useReadingStamina } from '../context/ReadingStaminaContext.jsx'
import { PANEL_TRANSITION_MS } from '../hooks/useAnimatedPanel.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import {
  buildWeek,
  formatDateLabel,
  formatDuration,
} from '../lib/readingStamina.js'
import { captureElementAsPng, shareDataUrlImage } from '../lib/shareStaminaImage.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import LightningIcon from './LightningIcon.jsx'
import StaminaHelpDialog from './StaminaHelpDialog.jsx'
import StaminaSharePoster from './StaminaSharePoster.jsx'
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
    currentWeekDuration: '本周续航时间',
    pastWeekDuration: '该周续航时间',
    recordTitle: '续航记录',
    prevWeek: '上一周',
    nextWeek: '下一周',
    future: '尚未到来',
    partial: '阅读中',
    notStarted: '未续航',
    chapters: (n) => `${n} 章`,
    helpAria: '了解续航功能',
    shareAria: '分享',
    shareFailed: '生成海报失败，请稍后再试',
  },
  cht: {
    title: '閱讀續航',
    headline: '【續航】能幫助你培養每天讀經的習慣。',
    streakLabel: '使用續航',
    bestLabel: '最佳續航',
    dayUnit: '天',
    legendLess: '少',
    legendMore: '多',
    currentWeekDuration: '本週續航時間',
    pastWeekDuration: '該週續航時間',
    recordTitle: '續航記錄',
    prevWeek: '上一週',
    nextWeek: '下一週',
    future: '尚未到來',
    partial: '閱讀中',
    notStarted: '未續航',
    chapters: (n) => `${n} 章`,
    helpAria: '了解續航功能',
    shareAria: '分享',
    shareFailed: '生成海報失敗，請稍後再試',
  },
  en: {
    title: 'Reading stamina',
    headline: 'Stamina helps you build a daily Bible reading habit.',
    streakLabel: 'Current streak',
    bestLabel: 'best stamina',
    dayUnit: 'days',
    legendLess: 'Less',
    legendMore: 'More',
    currentWeekDuration: 'This week',
    pastWeekDuration: 'Week total',
    recordTitle: 'Stamina log',
    prevWeek: 'Previous week',
    nextWeek: 'Next week',
    future: 'Upcoming',
    partial: 'In progress',
    notStarted: 'No stamina',
    chapters: (n) => `${n} ch.`,
    helpAria: 'About stamina',
    shareAria: 'Share',
    shareFailed: 'Failed to create poster. Please try again.',
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
    <button
      type="button"
      className={`stamina-cell ${levelClass}`}
      disabled={cell.isFuture}
      aria-label={`${formatDateLabel(cell.date, lang)}，${buildCellLabel(cell, lang, copy)}`}
    >
      <span className="stamina-cell-day" aria-hidden>{cell.date.getDate()}</span>
      <span className="stamina-cell-duration" aria-hidden>
        {cell.isFuture ? '—' : formatCompactDuration(cell.seconds)}
      </span>
    </button>
  )
}

export default function StaminaPanel({ onClose }) {
  const { version } = useVersion()
  const { streak, longest } = useReadingStamina()
  const [closing, setClosing] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [posterDataUrl, setPosterDataUrl] = useState(null)
  const shareTargetRef = useRef(null)

  const lang = version.lang === 'en' ? 'en' : version.lang === 'cht' ? 'cht' : 'chs'
  const copy = COPY[lang]
  const dayLabels = DAY_LABELS[lang]

  useScrollLock(true)

  const week = useMemo(() => buildWeek(weekOffset), [weekOffset])
  const weekSeconds = useMemo(
    () => week.days.reduce((total, day) => total + day.seconds, 0),
    [week],
  )

  const requestClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => onClose(), PANEL_TRANSITION_MS)
  }

  const motionClass = closing ? 'is-closing' : 'is-open'

  const handleShare = async () => {
    if (sharing || !shareTargetRef.current) return
    setSharing(true)
    try {
      const dataUrl = await captureElementAsPng(shareTargetRef.current)
      if (navigator.share) {
        try {
          await shareDataUrlImage(dataUrl, { title: copy.title })
          return
        } catch (err) {
          if (err?.name === 'AbortError') return
        }
      }
      setPosterDataUrl(dataUrl)
    } catch {
      window.alert(copy.shareFailed)
    } finally {
      setSharing(false)
    }
  }

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
          <div className="stamina-panel-toolbar">
            <div className="stamina-panel-toolbar-spacer" aria-hidden />
            <div className="stamina-panel-toolbar-actions">
              <button
                type="button"
                className="stamina-panel-icon-btn"
                onClick={() => setHelpOpen(true)}
                aria-label={copy.helpAria}
              >
                ?
              </button>
              <button
                type="button"
                className="stamina-panel-icon-btn stamina-panel-icon-btn--share"
                onClick={handleShare}
                disabled={sharing}
                aria-label={copy.shareAria}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={shareTargetRef} className="stamina-panel-share-target">
          <h2 className="stamina-panel-headline">{copy.headline}</h2>

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
                  onClick={() => setWeekOffset((offset) => offset + 1)}
                >
                  {copy.prevWeek}
                </button>
                <button
                  type="button"
                  className="stamina-record-nav-btn"
                  disabled={weekOffset === 0}
                  onClick={() => setWeekOffset((offset) => Math.max(0, offset - 1))}
                >
                  {copy.nextWeek}
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
                <p className="stamina-week-total">
                  {weekOffset === 0 ? copy.currentWeekDuration : copy.pastWeekDuration}
                  <strong>{formatCompactDuration(weekSeconds)}</strong>
                </p>
              </div>
            </div>

            <div className="stamina-week-headers" aria-hidden>
              {dayLabels.map((label) => (
                <span key={label} className="stamina-week-day-label">{label}</span>
              ))}
            </div>

            <div className="stamina-week-row">
              {week.days.map((cell) => (
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
      {posterDataUrl && (
        <StaminaSharePoster
          lang={lang}
          dataUrl={posterDataUrl}
          onClose={() => setPosterDataUrl(null)}
        />
      )}
    </>
  )
}
