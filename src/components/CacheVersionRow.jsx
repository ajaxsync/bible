import { useRef, useState } from 'react'
import { formatBytes } from '../lib/bibleCache.js'

const SWIPE_REVEAL = 72
const SWIPE_THRESHOLD = 36
const DOWNLOAD_BTN_SIZE = 24

function CacheDownloadButton({ state, progress, onClick, ariaLabel }) {
  const size = DOWNLOAD_BTN_SIZE
  const stroke = 2
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference
  const btnClass = [
    'cache-download-btn',
    `cache-download-btn--${state}`,
    state === 'idle' && progress > 0 && progress < 100 ? 'cache-download-btn--partial' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={btnClass}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={state === 'complete'}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {state === 'complete' ? (
          <>
            <circle cx={size / 2} cy={size / 2} r={radius} className="cache-download-btn-fill" />
            <path
              d={`M ${size * 0.28} ${size * 0.52} L ${size * 0.44} ${size * 0.68} L ${size * 0.74} ${size * 0.36}`}
              className="cache-download-btn-check"
            />
          </>
        ) : (
          <>
            <circle cx={size / 2} cy={size / 2} r={radius} className="cache-download-btn-track" />
            {(state === 'downloading' || state === 'paused' || (state === 'idle' && progress > 0 && progress < 100)) && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                className="cache-download-btn-progress"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )}
            {state === 'downloading' && (
              <>
                <rect x={size * 0.35} y={size * 0.28} width={size * 0.07} height={size * 0.44} rx="0.5" className="cache-download-btn-icon" />
                <rect x={size * 0.58} y={size * 0.28} width={size * 0.07} height={size * 0.44} rx="0.5" className="cache-download-btn-icon" />
              </>
            )}
            {state === 'paused' && (
              <path
                d={`M ${size * 0.36} ${size * 0.28} L ${size * 0.36} ${size * 0.72} L ${size * 0.72} ${size * 0.5} Z`}
                className="cache-download-btn-icon"
              />
            )}
            {state === 'idle' && (
              <>
                <line x1={size * 0.5} y1={size * 0.24} x2={size * 0.5} y2={size * 0.56} className="cache-download-btn-icon-stroke" />
                <path d={`M ${size * 0.36} ${size * 0.44} L ${size * 0.5} ${size * 0.58} L ${size * 0.64} ${size * 0.44}`} className="cache-download-btn-icon-stroke" />
                <line x1={size * 0.3} y1={size * 0.68} x2={size * 0.7} y2={size * 0.68} className="cache-download-btn-icon-stroke" />
              </>
            )}
          </>
        )}
      </svg>
    </button>
  )
}

/**
 * 缓存行
 * - 经文（showDownload）：左标题，右为数量+大小上下排列 + 下载按钮
 * - 其它：左标题，右大小；标题下一行副信息；可滑动删除
 */
export default function CacheVersionRow({
  label,
  subtitle = null,
  storageBytes = 0,
  loading = false,
  canDelete = false,
  onDelete,
  deleteLabel = '删除',
  showDownload = false,
  downloadState = 'idle',
  progressPct = 0,
  onDownloadAction,
  actionLabels = {},
}) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const startOffset = useRef(0)
  const canSwipe = canDelete

  const closeSwipe = () => setOffsetX(0)

  const handleTouchStart = (event) => {
    if (!canSwipe) return
    touchStartX.current = event.touches[0].clientX
    touchStartY.current = event.touches[0].clientY
    startOffset.current = offsetX
    setDragging(true)
  }

  const handleTouchMove = (event) => {
    if (!dragging || !canSwipe) return
    const dx = event.touches[0].clientX - touchStartX.current
    const dy = event.touches[0].clientY - touchStartY.current
    if (Math.abs(dy) > Math.abs(dx)) return
    const next = Math.min(0, Math.max(-SWIPE_REVEAL, startOffset.current + dx))
    setOffsetX(next)
  }

  const handleTouchEnd = () => {
    if (!dragging) return
    setDragging(false)
    setOffsetX(offsetX <= -SWIPE_THRESHOLD ? -SWIPE_REVEAL : 0)
  }

  const handleDelete = () => {
    closeSwipe()
    onDelete?.()
  }

  const statsBlock = loading ? (
    <div className="cache-version-stats" aria-hidden>
      <span className="cache-size-loading" />
      <span className="cache-size-loading" />
    </div>
  ) : (
    <div className="cache-version-stats">
      {subtitle != null && subtitle !== '' && (
        <span className="cache-version-count">{subtitle}</span>
      )}
      <span className="cache-version-size">{formatBytes(storageBytes)}</span>
    </div>
  )

  return (
    <div className={`cache-version-row-wrap${canSwipe ? ' is-swipeable' : ''}`}>
      {canSwipe && (
        <button type="button" className="cache-version-delete cache-version-delete--swipe" onClick={handleDelete}>
          {deleteLabel}
        </button>
      )}
      <div
        className={[
          'cache-version-row',
          dragging ? 'is-dragging' : '',
          showDownload ? 'has-download' : '',
        ].filter(Boolean).join(' ')}
        style={canSwipe ? { transform: `translateX(${offsetX}px)` } : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <span className="cache-version-label">{label}</span>

        {showDownload ? (
          <>
            {statsBlock}
            <div className="cache-version-end">
              {canSwipe && (
                <button type="button" className="cache-btn cache-version-delete--inline" onClick={handleDelete}>
                  {deleteLabel}
                </button>
              )}
              <CacheDownloadButton
                state={downloadState}
                progress={progressPct}
                onClick={onDownloadAction}
                ariaLabel={actionLabels[downloadState]}
              />
            </div>
          </>
        ) : (
          <>
            <div className="cache-version-size-slot">
              {loading ? (
                <span className="cache-size-loading" aria-hidden />
              ) : (
                <span className="cache-version-size">{formatBytes(storageBytes)}</span>
              )}
            </div>
            <div className="cache-version-meta">
              {loading ? (
                <span className="cache-size-loading is-wide" aria-hidden />
              ) : (
                subtitle != null && subtitle !== '' && (
                  <span className="cache-version-count">{subtitle}</span>
                )
              )}
            </div>
            {canSwipe && (
              <div className="cache-version-end">
                <button type="button" className="cache-btn cache-version-delete--inline" onClick={handleDelete}>
                  {deleteLabel}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
