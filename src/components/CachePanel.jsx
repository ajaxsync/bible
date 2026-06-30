import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearScriptureCache,
  downloadAllScripture,
  DownloadAbortedError,
  formatBytes,
  formatEta,
  getCacheStats,
  getManifestInfo,
  hasPartialCache,
  isFullyCached,
} from '../lib/bibleCache.js'
import { useVersion } from '../context/VersionContext.jsx'
import { usePwaInstall } from '../hooks/usePwaInstall.js'
import './CachePanel.css'

export default function CachePanel({ onClose }) {
  const { version } = useVersion()
  const isZh = version.lang !== 'en'
  const lang = isZh ? 'chs' : 'en'
  const [stats, setStats] = useState({
    chapterCount: 0,
    verseCount: 0,
    chapterBytes: 0,
    verseBytes: 0,
    storageBytes: 0,
    fullDownloadAt: null,
    memory: { chapterCount: 0, verseCount: 0, chapterBytes: 0, verseBytes: 0, totalBytes: 0 },
  })
  const [manifestInfo, setManifestInfo] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const refreshTimerRef = useRef(null)
  const abortRef = useRef(null)
  const { installState, promptInstall } = usePwaInstall()

  const fullyCached = isFullyCached(stats, manifestInfo)
  const partialCache = hasPartialCache(stats, manifestInfo)

  const refreshStats = useCallback(() => {
    getCacheStats()
      .then(setStats)
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshStats()
    getManifestInfo().then(setManifestInfo).catch(() => {})
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
      abortRef.current?.abort()
    }
  }, [refreshStats])

  useEffect(() => {
    if (downloading) {
      refreshTimerRef.current = setInterval(refreshStats, 1500)
      return () => clearInterval(refreshTimerRef.current)
    }
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [downloading, refreshStats])

  const requestClose = () => {
    if (downloading) {
      const msg = isZh
        ? '下载进行中，关闭将停止下载。确定关闭吗？'
        : 'Download in progress. Closing will stop it. Continue?'
      if (!window.confirm(msg)) return
      abortRef.current?.abort()
    }
    onClose()
  }

  const handlePauseDownload = () => {
    abortRef.current?.abort()
  }

  const handleDownloadAll = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setDownloading(true)
    setError(null)
    setProgress((prev) => prev ?? { done: 0, total: 0, bytesDownloaded: 0, totalBytes: 0, etaMs: null })
    try {
      await downloadAllScripture((p) => setProgress(p), { signal: controller.signal })
      refreshStats()
      setProgress(null)
    } catch (err) {
      if (err instanceof DownloadAbortedError) return
      setError(err.message)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setDownloading(false)
      }
    }
  }

  const handleInstall = async () => {
    if (installState === 'ios') {
      setShowIosGuide(true)
      return
    }
    if (installState !== 'ready') return
    await promptInstall()
  }

  const handleClear = async () => {
    const msg = isZh
      ? '确定清除所有已缓存的经文？离线时将无法阅读未重新下载的内容。'
      : 'Clear all cached scripture? Offline reading will require re-download.'
    if (!window.confirm(msg)) return

    setClearing(true)
    setError(null)
    try {
      await clearScriptureCache()
      refreshStats()
    } catch (err) {
      setError(err.message)
    } finally {
      setClearing(false)
    }
  }

  const formatDate = (ts) => {
    if (!ts) return isZh ? '尚未全量下载' : 'Not fully downloaded'
    return new Date(ts).toLocaleString(isZh ? 'zh-CN' : 'en-US')
  }

  const progressPct = progress?.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0

  const bytesPct = progress?.totalBytes
    ? Math.min(100, Math.round((progress.bytesDownloaded / progress.totalBytes) * 100))
    : progressPct

  const showProgressSlot = !fullyCached
  const hasProgressData = Boolean(progress?.total)

  return (
    <>
      <div className="cache-backdrop" onClick={requestClose} aria-hidden />
      <div className="cache-panel" role="dialog" aria-label={isZh ? '离线缓存' : 'Offline cache'}>
        <div className="cache-panel-header">
          <button type="button" className="cache-panel-close" onClick={requestClose} aria-label={isZh ? '关闭' : 'Close'}>
            ×
          </button>
        </div>

        <p className="cache-panel-desc">
          {fullyCached
            ? (isZh
              ? '全部经文已缓存，可离线阅读。阅读时仍会按需更新内存热缓存。'
              : 'All scripture is cached for offline reading.')
            : (isZh
              ? '阅读过的章节与对照经节会自动缓存。也可手动下载全部经文以供离线使用。'
              : 'Read chapters and compared verses are cached automatically. Download all for full offline use.')}
        </p>

        <dl className="cache-stats">
          <div className="cache-stat">
            <dt>{isZh ? '已缓存章节' : 'Chapters'}</dt>
            <dd>
              {manifestInfo
                ? `${stats.chapterCount} / ${manifestInfo.chapterTotal}`
                : stats.chapterCount}
            </dd>
          </div>
          <div className="cache-stat">
            <dt>{isZh ? '已缓存经节' : 'Verses'}</dt>
            <dd>
              {manifestInfo
                ? `${stats.verseCount} / ${manifestInfo.verseTotal}`
                : stats.verseCount}
            </dd>
          </div>
        </dl>

        <div className="cache-storage">
          <div className="cache-storage-row">
            <span>{isZh ? '章节占用' : 'Chapter storage'}</span>
            <strong>{formatBytes(stats.chapterBytes, lang)}</strong>
          </div>
          <div className="cache-storage-row">
            <span>{isZh ? '经节占用' : 'Verse storage'}</span>
            <strong>{formatBytes(stats.verseBytes, lang)}</strong>
          </div>
          <div className="cache-storage-row cache-storage-total">
            <span>{isZh ? '本地合计' : 'Total stored'}</span>
            <strong>{formatBytes(stats.storageBytes, lang)}</strong>
          </div>
          <div className="cache-storage-row cache-storage-memory">
            <span>{isZh ? '内存热缓存' : 'In-memory'}</span>
            <strong>
              {isZh
                ? `${stats.memory.chapterCount} 章 · ${formatBytes(stats.memory.totalBytes, lang)}`
                : `${stats.memory.chapterCount} ch · ${formatBytes(stats.memory.totalBytes, lang)}`}
            </strong>
          </div>
        </div>

        <p className="cache-meta">
          {isZh ? '上次全量下载：' : 'Last full download: '}
          {formatDate(stats.fullDownloadAt)}
        </p>

        {showProgressSlot && (
          <div className="cache-progress-block" aria-live="polite">
            <div className="cache-progress">
              <div className="cache-progress-bar" style={{ width: `${hasProgressData ? bytesPct : 0}%` }} />
              <span className="cache-progress-label">
                {hasProgressData
                  ? `${progress.done} / ${progress.total} (${progressPct}%)`
                  : (downloading
                    ? (isZh ? '准备中…' : 'Preparing…')
                    : (isZh ? '尚未开始' : 'Not started'))}
              </span>
            </div>
            <div className="cache-progress-meta">
              <span>
                {hasProgressData
                  ? (
                    <>
                      {formatBytes(progress.bytesDownloaded, lang)}
                      {progress.totalBytes ? ` / ${formatBytes(progress.totalBytes, lang)}` : ''}
                    </>
                  )
                  : '\u00A0'}
              </span>
              <span>{hasProgressData ? formatEta(progress.etaMs, lang) : '\u00A0'}</span>
            </div>
          </div>
        )}

        {error && <p className="cache-error">{error}</p>}

        <div className="cache-actions">
          {!fullyCached && (
            downloading ? (
              <button
                type="button"
                className="cache-btn cache-btn-primary"
                onClick={handlePauseDownload}
                disabled={clearing}
              >
                {isZh ? '暂停下载' : 'Pause download'}
              </button>
            ) : (
              <button
                type="button"
                className="cache-btn cache-btn-primary"
                onClick={handleDownloadAll}
                disabled={clearing}
              >
                {partialCache
                  ? (isZh ? '继续下载' : 'Resume download')
                  : (isZh ? '下载全部' : 'Download all')}
              </button>
            )
          )}
          <button
            type="button"
            className="cache-btn"
            onClick={handleClear}
            disabled={downloading || clearing}
          >
            {clearing ? (isZh ? '清除中…' : 'Clearing…') : (isZh ? '清除缓存' : 'Clear cache')}
          </button>
          {installState === 'installed' ? (
            <p className="cache-installed">{isZh ? '已添加到主屏幕' : 'Installed on Home Screen'}</p>
          ) : (
            <>
              <button
                type="button"
                className="cache-btn"
                onClick={handleInstall}
                disabled={installState === 'unavailable' || downloading || clearing}
              >
                {isZh ? '添加到主屏幕' : 'Add to Home Screen'}
              </button>
              {installState === 'unavailable' && (
                <p className="cache-install-hint">
                  {isZh
                    ? '若按钮不可用，请使用浏览器菜单中的「安装应用」或「添加到主屏幕」。需通过 HTTPS 访问。'
                    : 'If unavailable, use the browser menu to install. HTTPS is required.'}
                </p>
              )}
              {showIosGuide && installState === 'ios' && (
                <p className="cache-ios-guide">
                  {isZh ? (
                    <>
                      1. 点击 Safari 底部的<strong>分享</strong>按钮<br />
                      2. 向下滑动，选择<strong>添加到主屏幕</strong>
                    </>
                  ) : (
                    <>
                      1. Tap the <strong>Share</strong> button in Safari<br />
                      2. Choose <strong>Add to Home Screen</strong>
                    </>
                  )}
                </p>
              )}
            </>
          )}
        </div>

        <p className="cache-hint">
          {isZh
            ? '安装后可从主屏幕打开；离线阅读需先缓存经文。'
            : 'Install for Home Screen access; cache scripture for offline reading.'}
        </p>
      </div>
    </>
  )
}
