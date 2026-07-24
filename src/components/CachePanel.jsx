import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clearVersionCache,
  downloadVersionScripture,
  DownloadAbortedError,
  formatBytes,
  getAllVersionsCacheStats,
  isNativeBundledScripture,
} from '../lib/bibleCache.js'
import {
  clearLocalDataItems,
  clearPageCache,
  getLocalDataItemStats,
  getPageCacheStats,
} from '../lib/appDataCache.js'
import { formatAppVersionLabel, getAppVersionInfo } from '../lib/appVersion.js'
import { isNativeApp } from '../lib/platform.js'
import { PRIMARY_VERSION_IDS, VERSIONS } from '../data/versions.js'
import { useVersion } from '../context/VersionContext.jsx'
import { usePwaInstall } from '../hooks/usePwaInstall.js'
import { PANEL_TRANSITION_MS } from '../hooks/useAnimatedPanel.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import CacheVersionRow from './CacheVersionRow.jsx'
import './CachePanel.css'

const VERSION_LABELS = {
  cunps: { chs: '和合本 简体中文', cht: '和合本 簡體中文', en: 'Chinese Union Version (Simplified)' },
  cunp: { chs: '和合本 繁体中文', cht: '和合本 繁體中文', en: 'Chinese Union Version (Traditional)' },
  niv: { chs: 'NIV English', cht: 'NIV English', en: 'NIV English' },
}

function getDownloadState(versionId, stats, downloads) {
  const active = downloads[versionId]
  if (active?.status === 'downloading') return 'downloading'
  if (active?.status === 'paused') return 'paused'
  if (stats?.isComplete) return 'complete'
  return 'idle'
}

function getProgressPct(versionId, stats, downloads) {
  const active = downloads[versionId]
  if (active?.progress?.total) {
    return Math.round((active.progress.done / active.progress.total) * 100)
  }
  if (!stats?.chapterTotal) return 0
  return Math.round((stats.chapterCount / stats.chapterTotal) * 100)
}

function UsageBar({ scriptureBytes, clearableBytes, otherBytes, isZh, showClearable }) {
  const total = Math.max(scriptureBytes + clearableBytes + otherBytes, 1)
  const segments = [
    { key: 'scripture', bytes: scriptureBytes, className: 'is-scripture', label: isZh ? '经文' : 'Scripture' },
    showClearable
      ? { key: 'clearable', bytes: clearableBytes, className: 'is-clearable', label: isZh ? '可清理' : 'Clearable' }
      : null,
    { key: 'other', bytes: otherBytes, className: 'is-other', label: isZh ? '其他' : 'Other' },
  ].filter(Boolean)

  return (
    <div className="cache-usage">
      <div className="cache-usage-total">
        <span>{isZh ? '已用空间' : 'Used storage'}</span>
        <strong>{formatBytes(scriptureBytes + clearableBytes + otherBytes)}</strong>
      </div>
      <div className="cache-usage-bar" role="img" aria-label={isZh ? '存储占用分布' : 'Storage breakdown'}>
        {segments.map((seg) => {
          const pct = Math.max((seg.bytes / total) * 100, seg.bytes > 0 ? 2 : 0)
          return (
            <span
              key={seg.key}
              className={`cache-usage-seg ${seg.className}`}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${formatBytes(seg.bytes)}`}
            />
          )
        })}
      </div>
      <ul className="cache-usage-legend">
        {segments.map((seg) => (
          <li key={seg.key}>
            <span className={`cache-usage-dot ${seg.className}`} />
            <span>{seg.label}</span>
            <span className="cache-usage-legend-size">{formatBytes(seg.bytes)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CachePanel({ onClose }) {
  const { version } = useVersion()
  const nativeApp = isNativeApp()
  const isBundledApp = isNativeBundledScripture()
  const isZh = version.lang !== 'en'
  const lang = version.lang === 'en' ? 'en' : version.lang === 'cht' ? 'cht' : 'chs'

  const [versionStats, setVersionStats] = useState([])
  const [downloads, setDownloads] = useState({})
  const [error, setError] = useState(null)
  const [closing, setClosing] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [showAndroidGuide, setShowAndroidGuide] = useState(false)
  const [pageCache, setPageCache] = useState({ available: false, bytes: 0 })
  const [localItems, setLocalItems] = useState([])
  const [selectedManual, setSelectedManual] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [appVersionLabel, setAppVersionLabel] = useState('')

  useScrollLock(true)

  useEffect(() => {
    let cancelled = false
    getAppVersionInfo()
      .then((info) => {
        if (!cancelled) setAppVersionLabel(formatAppVersionLabel(info, isZh))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isZh])

  const abortRefs = useRef({})
  const closeTimerRef = useRef(null)
  const { installState, promptInstall } = usePwaInstall()

  const statsMap = Object.fromEntries(versionStats.map((item) => [item.versionId, item]))
  const anyDownloading = Object.values(downloads).some((item) => item.status === 'downloading')
  const showPageCacheCard = !nativeApp && pageCache.available

  const scriptureBytes = useMemo(
    () => versionStats.reduce((sum, item) => sum + (item.storageBytes || 0), 0),
    [versionStats],
  )
  const clearableBytes = showPageCacheCard ? pageCache.bytes : 0
  const otherBytes = useMemo(
    () => localItems.reduce((sum, item) => sum + (item.bytes || 0), 0),
    [localItems],
  )

  const refreshStats = useCallback(() => {
    getAllVersionsCacheStats()
      .then(setVersionStats)
      .catch(() => {})
  }, [])

  const refreshDataCache = useCallback(() => {
    setLocalItems(getLocalDataItemStats())
    if (nativeApp) {
      setPageCache({ available: false, bytes: 0 })
      return
    }
    getPageCacheStats()
      .then(setPageCache)
      .catch(() => setPageCache({ available: false, bytes: 0 }))
  }, [nativeApp])

  useEffect(() => {
    refreshStats()
    refreshDataCache()
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      Object.values(abortRefs.current).forEach((controller) => controller?.abort())
    }
  }, [refreshStats, refreshDataCache])

  useEffect(() => {
    if (!anyDownloading) return undefined
    const id = window.setInterval(refreshStats, 1500)
    return () => window.clearInterval(id)
  }, [anyDownloading, refreshStats])

  const closeThenReload = () => {
    if (closing) return
    setClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      onClose()
      window.location.reload()
    }, PANEL_TRANSITION_MS)
  }

  const requestClose = () => {
    if (anyDownloading) {
      const msg = isZh
        ? '下载进行中，关闭将停止下载。确定关闭吗？'
        : 'Download in progress. Closing will stop it. Continue?'
      if (!window.confirm(msg)) return
      Object.values(abortRefs.current).forEach((controller) => controller?.abort())
    }
    if (closing) return
    setClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      onClose()
    }, PANEL_TRANSITION_MS)
  }

  const motionClass = closing ? 'is-closing' : 'is-open'

  const setDownloadState = (versionId, patch) => {
    setDownloads((prev) => ({
      ...prev,
      [versionId]: { ...prev[versionId], ...patch },
    }))
  }

  const clearDownloadState = (versionId) => {
    setDownloads((prev) => {
      const next = { ...prev }
      delete next[versionId]
      return next
    })
  }

  const pauseDownload = (versionId) => {
    abortRefs.current[versionId]?.abort()
  }

  const startDownload = async (versionId) => {
    abortRefs.current[versionId]?.abort()
    const controller = new AbortController()
    abortRefs.current[versionId] = controller

    setError(null)
    setDownloadState(versionId, {
      status: 'downloading',
      progress: statsMap[versionId]
        ? {
          done: statsMap[versionId].chapterCount,
          total: statsMap[versionId].chapterTotal,
        }
        : null,
    })

    try {
      await downloadVersionScripture(
        versionId,
        (progress) => setDownloadState(versionId, { status: 'downloading', progress }),
        { signal: controller.signal },
      )
      refreshStats()
      clearDownloadState(versionId)
    } catch (err) {
      if (err instanceof DownloadAbortedError) {
        setDownloadState(versionId, { status: 'paused' })
        return
      }
      setError(err.message)
      clearDownloadState(versionId)
    } finally {
      if (abortRefs.current[versionId] === controller) {
        delete abortRefs.current[versionId]
      }
    }
  }

  const handleDownloadAction = (versionId) => {
    if (isBundledApp) return
    const state = getDownloadState(versionId, statsMap[versionId], downloads)
    if (state === 'complete') return
    if (state === 'downloading') {
      pauseDownload(versionId)
      return
    }
    startDownload(versionId)
  }

  const handleDelete = async (versionId) => {
    const label = VERSION_LABELS[versionId]?.[lang] ?? VERSIONS[versionId]?.shortLabel ?? versionId
    const msg = isZh
      ? `确定删除「${label}」的离线缓存？`
      : `Delete offline cache for ${label}?`
    if (!window.confirm(msg)) return

    pauseDownload(versionId)
    setError(null)
    try {
      await clearVersionCache(versionId)
      clearDownloadState(versionId)
      refreshStats()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleClearPageCache = async () => {
    const msg = isZh
      ? '确定清理页面缓存？清理后将刷新页面。'
      : 'Clear page cache? The page will reload afterward.'
    if (!window.confirm(msg)) return
    setBusy(true)
    setError(null)
    try {
      await clearPageCache()
      closeThenReload()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const toggleManualItem = (id) => {
    setSelectedManual((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleClearManual = () => {
    if (selectedManual.size === 0) return
    const msg = isZh
      ? `确定清理所选 ${selectedManual.size} 项数据？清理后将刷新页面。`
      : `Clear ${selectedManual.size} selected item(s)? The page will reload afterward.`
    if (!window.confirm(msg)) return
    setBusy(true)
    setError(null)
    try {
      clearLocalDataItems([...selectedManual])
      closeThenReload()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const handleInstall = async () => {
    if (installState === 'ios') {
      setShowIosGuide(true)
      setShowAndroidGuide(false)
      return
    }
    if (installState === 'android') {
      setShowAndroidGuide(true)
      setShowIosGuide(false)
      return
    }
    if (installState !== 'ready') return
    await promptInstall()
  }

  const actionLabels = {
    idle: isZh ? '下载' : 'Download',
    downloading: isZh ? '暂停' : 'Pause',
    paused: isZh ? '继续' : 'Resume',
    complete: isBundledApp ? (isZh ? '已内置' : 'Built-in') : (isZh ? '已完成' : 'Downloaded'),
  }

  const clearableManualItems = localItems.filter((item) => item.clearable)
  const readonlyManualItems = localItems.filter((item) => !item.clearable)
  const hasManualSelection = selectedManual.size > 0

  return (
    <>
      <div className={`cache-backdrop panel-backdrop ${motionClass}`} onClick={requestClose} aria-hidden />
      <div className={`cache-panel ${motionClass}`} role="dialog" aria-label={isZh ? '缓存管理' : 'Cache management'}>
        <BottomSheetHandle
          onClose={requestClose}
          label={isZh ? '关闭' : 'Close'}
          className="cache-panel-sheet-handle"
        />
        <div className="cache-panel-header">
          <h2 className="cache-panel-title">{isZh ? '缓存管理' : 'Cache management'}</h2>
          <button type="button" className="cache-panel-close" onClick={requestClose} aria-label={isZh ? '关闭' : 'Close'}>
            ×
          </button>
        </div>

        <div className="cache-panel-scroll">
          <UsageBar
            scriptureBytes={scriptureBytes}
            clearableBytes={clearableBytes}
            otherBytes={otherBytes}
            isZh={isZh}
            showClearable={showPageCacheCard}
          />

          <section className="cache-card">
            <div className="cache-card-head">
              <div>
                <h3 className="cache-card-title">{isZh ? '经文缓存' : 'Scripture cache'}</h3>
                <p className="cache-card-desc">
                  {isBundledApp
                    ? (isZh
                      ? '应用已内置全部译本经文，安装后即可离线阅读。'
                      : 'All translations are bundled for offline reading.')
                    : (isZh
                      ? '按版本下载经文；阅读过的章节也会自动缓存。'
                      : 'Download by version; read chapters are also cached.')}
                </p>
              </div>
              <span className="cache-card-size">{formatBytes(scriptureBytes)}</span>
            </div>
            <div className="cache-version-list">
              {PRIMARY_VERSION_IDS.map((versionId) => {
                const stats = statsMap[versionId]
                const downloadState = getDownloadState(versionId, stats, downloads)
                return (
                  <CacheVersionRow
                    key={versionId}
                    label={VERSION_LABELS[versionId]?.[lang] ?? VERSIONS[versionId]?.shortLabel ?? versionId}
                    chapterCount={stats?.chapterCount ?? 0}
                    chapterTotal={stats?.chapterTotal ?? 0}
                    storageBytes={downloads[versionId]?.progress?.bytesDownloaded ?? stats?.storageBytes ?? 0}
                    downloadState={downloadState}
                    progressPct={getProgressPct(versionId, stats, downloads)}
                    onDownloadAction={() => handleDownloadAction(versionId)}
                    onDelete={() => handleDelete(versionId)}
                    deleteLabel={isZh ? '删除' : 'Delete'}
                    actionLabels={actionLabels}
                    canDelete={!isBundledApp}
                  />
                )
              })}
            </div>
          </section>

          {showPageCacheCard && (
            <section className="cache-card">
              <div className="cache-card-head">
                <div>
                  <h3 className="cache-card-title">{isZh ? '可清理缓存' : 'Clearable cache'}</h3>
                  <p className="cache-card-desc">
                    {isZh
                      ? '页面缓存（应用壳资源）。清理后将自动刷新。'
                      : 'Page cache (app shell assets). Clearing will reload the page.'}
                  </p>
                </div>
                <span className="cache-card-size">{formatBytes(pageCache.bytes)}</span>
              </div>
              <div className="cache-card-row">
                <div className="cache-card-row-main">
                  <span className="cache-card-row-label">{isZh ? '页面缓存' : 'Page cache'}</span>
                  <span className="cache-card-row-meta">{formatBytes(pageCache.bytes)}</span>
                </div>
                <button
                  type="button"
                  className="cache-card-action"
                  onClick={handleClearPageCache}
                  disabled={busy || pageCache.bytes <= 0}
                >
                  {isZh ? '清理' : 'Clear'}
                </button>
              </div>
            </section>
          )}

          <section className="cache-card">
            <div className="cache-card-head">
              <div>
                <h3 className="cache-card-title">{isZh ? '手动清理' : 'Manual cleanup'}</h3>
                <p className="cache-card-desc">
                  {isZh
                    ? '勾选后清理；收藏与续航仅展示占用，不可清理。'
                    : 'Select items to clear. Highlights and stamina are view-only.'}
                </p>
              </div>
              <span className="cache-card-size">{formatBytes(otherBytes)}</span>
            </div>

            <ul className="cache-manual-list">
              {clearableManualItems.map((item) => {
                const checked = selectedManual.has(item.id)
                return (
                  <li key={item.id}>
                    <label className="cache-manual-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleManualItem(item.id)}
                        disabled={busy}
                      />
                      <span className="cache-manual-label">{item.label[lang] ?? item.label.chs}</span>
                      <span className="cache-manual-size">{formatBytes(item.bytes)}</span>
                    </label>
                  </li>
                )
              })}
            </ul>

            {readonlyManualItems.length > 0 && (
              <>
                <p className="cache-manual-readonly-title">{isZh ? '仅展示' : 'View only'}</p>
                <ul className="cache-manual-list cache-manual-list--readonly">
                  {readonlyManualItems.map((item) => (
                    <li key={item.id} className="cache-manual-item is-readonly">
                      <span className="cache-manual-label">{item.label[lang] ?? item.label.chs}</span>
                      <span className="cache-manual-size">{formatBytes(item.bytes)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <button
              type="button"
              className="cache-card-action cache-card-action--block"
              onClick={handleClearManual}
              disabled={busy || !hasManualSelection}
            >
              {isZh ? '清理所选' : 'Clear selected'}
            </button>
          </section>

          {error && <p className="cache-error">{error}</p>}

          {!nativeApp && installState !== 'unavailable' && installState !== 'installed' && (
            <div className="cache-install-section">
              <button
                type="button"
                className="cache-btn"
                onClick={handleInstall}
                disabled={anyDownloading || busy}
              >
                {isZh ? '添加到主屏幕' : 'Add to Home Screen'}
              </button>
              {installState === 'android' && !showAndroidGuide && (
                <p className="cache-install-hint">
                  {isZh
                    ? '点击上方按钮查看安装步骤；推荐使用 Chrome 以获得最佳体验。'
                    : 'Tap the button above for steps. Chrome is recommended.'}
                </p>
              )}
              {showIosGuide && installState === 'ios' && (
                <p className="cache-install-guide">
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
              {showAndroidGuide && installState === 'android' && (
                <p className="cache-install-guide">
                  {isZh ? (
                    <>
                      1. 点击浏览器<strong>菜单</strong><br />
                      2. 选择<strong>添加到主屏幕</strong>或<strong>安装应用</strong>
                    </>
                  ) : (
                    <>
                      1. Open the browser <strong>menu</strong><br />
                      2. Choose <strong>Add to Home screen</strong> or <strong>Install app</strong>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {installState === 'installed' && (
            <p className="cache-installed">{isZh ? '已添加到主屏幕' : 'Installed on Home Screen'}</p>
          )}

          {appVersionLabel && (
            <p className="cache-app-version">
              {isZh ? '版本' : 'Version'} {appVersionLabel}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
