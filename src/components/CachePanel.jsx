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
import {
  exportUserDataBackup,
  importUserDataBackupFromFile,
} from '../lib/userDataBackup.js'
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

function CacheSizeLoading({ wide = false }) {
  return (
    <span
      className={`cache-size-loading${wide ? ' is-wide' : ''}`}
      aria-hidden
    />
  )
}

function formatSizeOrLoading(bytes, loading) {
  if (loading) return <CacheSizeLoading />
  return formatBytes(bytes)
}

function CacheCardDesc({ loading, children }) {
  if (loading) {
    return (
      <div className="cache-card-desc-skeleton" aria-hidden>
        <span className="cache-card-desc-skeleton-line" />
        <span className="cache-card-desc-skeleton-line is-short" />
      </div>
    )
  }
  return <p className="cache-card-desc">{children}</p>
}

function UsageBar({ scriptureBytes, clearableBytes, otherBytes, isZh, showClearable, loading }) {
  const total = Math.max(scriptureBytes + clearableBytes + otherBytes, 1)
  const segments = [
    { key: 'scripture', bytes: scriptureBytes, className: 'is-scripture', label: isZh ? '经文' : 'Scripture' },
    showClearable
      ? { key: 'clearable', bytes: clearableBytes, className: 'is-clearable', label: isZh ? '可清理' : 'Clearable' }
      : null,
    { key: 'other', bytes: otherBytes, className: 'is-other', label: isZh ? '其他' : 'Other' },
  ].filter(Boolean)

  return (
    <div className={`cache-usage${loading ? ' is-loading' : ''}`}>
      <div className="cache-usage-total">
        <span>{isZh ? '已用空间' : 'Used storage'}</span>
        <strong>{formatSizeOrLoading(scriptureBytes + clearableBytes + otherBytes, loading)}</strong>
      </div>
      <div className="cache-usage-bar" role="img" aria-label={isZh ? '存储占用分布' : 'Storage breakdown'}>
        {loading ? (
          <span className="cache-usage-seg is-loading-bar" style={{ width: '40%' }} />
        ) : (
          segments.map((seg) => {
            const pct = Math.max((seg.bytes / total) * 100, seg.bytes > 0 ? 2 : 0)
            return (
              <span
                key={seg.key}
                className={`cache-usage-seg ${seg.className}`}
                style={{ width: `${pct}%` }}
                title={`${seg.label}: ${formatBytes(seg.bytes)}`}
              />
            )
          })
        )}
      </div>
      <ul className="cache-usage-legend">
        {segments.map((seg) => (
          <li key={seg.key}>
            <span className={`cache-usage-dot ${seg.className}`} />
            <span>{seg.label}</span>
            <span className="cache-usage-legend-size">
              {formatSizeOrLoading(seg.bytes, loading)}
            </span>
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
  const [localItems, setLocalItems] = useState(() => getLocalDataItemStats())
  const [busy, setBusy] = useState(false)
  const [statsReady, setStatsReady] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [appVersionLabel, setAppVersionLabel] = useState('')
  const [backupHint, setBackupHint] = useState(null)
  const importInputRef = useRef(null)

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
  const showPageCacheCard = !nativeApp && (!dataReady || pageCache.available)
  const sizesLoading = !statsReady || !dataReady

  const scriptureBytes = useMemo(
    () => versionStats.reduce((sum, item) => sum + (item.storageBytes || 0), 0),
    [versionStats],
  )
  const clearableBytes = showPageCacheCard && dataReady ? pageCache.bytes : 0
  const otherBytes = useMemo(
    () => localItems.reduce((sum, item) => sum + (item.bytes || 0), 0),
    [localItems],
  )

  const refreshStats = useCallback(() => {
    return getAllVersionsCacheStats()
      .then(setVersionStats)
      .catch(() => {})
      .finally(() => setStatsReady(true))
  }, [])

  const refreshDataCache = useCallback(() => {
    setLocalItems(getLocalDataItemStats())
    if (nativeApp) {
      setPageCache({ available: false, bytes: 0 })
      setDataReady(true)
      return Promise.resolve()
    }
    return getPageCacheStats()
      .then(setPageCache)
      .catch(() => setPageCache({ available: false, bytes: 0 }))
      .finally(() => setDataReady(true))
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

  const handleDeleteDataItem = (item) => {
    const label = item.label[lang] ?? item.label.chs
    const msg = isZh
      ? `确定删除「${label}」？删除后将刷新页面。`
      : `Delete “${label}”? The page will reload afterward.`
    if (!window.confirm(msg)) return
    setBusy(true)
    setError(null)
    try {
      clearLocalDataItems([item.id])
      closeThenReload()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const handleExportBackup = async () => {
    setBusy(true)
    setError(null)
    setBackupHint(null)
    try {
      const result = await exportUserDataBackup()
      if (result === 'cancelled') {
        setBackupHint(isZh ? '已取消分享' : 'Share cancelled')
      } else if (result === 'shared') {
        setBackupHint(isZh ? '备份已分享，请存到网盘或文件管理器' : 'Backup shared — save it somewhere safe')
      } else {
        setBackupHint(isZh ? '备份已下载，请妥善保存' : 'Backup downloaded — keep it safe')
      }
    } catch (err) {
      setError(err?.message || (isZh ? '导出失败' : 'Export failed'))
    } finally {
      setBusy(false)
    }
  }

  const handleImportBackupClick = () => {
    setError(null)
    setBackupHint(null)
    importInputRef.current?.click()
  }

  const handleImportBackupFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const msg = isZh
      ? '导入将覆盖本机对应的阅读数据（收藏、续航、设置等），确定继续？导入后将刷新页面。'
      : 'Import will overwrite matching local data (highlights, stamina, settings). Continue? The page will reload.'
    if (!window.confirm(msg)) return

    setBusy(true)
    setError(null)
    try {
      await importUserDataBackupFromFile(file)
      closeThenReload()
    } catch (err) {
      const code = err?.message
      let text = isZh ? '导入失败，请确认文件是本应用导出的备份' : 'Import failed. Use a backup from this app.'
      if (code === 'quota') text = isZh ? '存储空间不足，无法导入' : 'Not enough storage to import'
      setError(text)
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
            loading={sizesLoading}
          />

          <section className="cache-card">
            <div className="cache-card-head">
              <h3 className="cache-card-title">{isZh ? '经文缓存' : 'Scripture cache'}</h3>
              <p className="cache-card-size">{formatSizeOrLoading(scriptureBytes, !statsReady)}</p>
              <CacheCardDesc loading={!statsReady}>
                {isBundledApp
                  ? (isZh
                    ? '应用已内置全部译本经文，安装后即可离线阅读。'
                    : 'All translations are bundled for offline reading.')
                  : (isZh
                    ? '按版本下载经文；阅读过的章节也会自动缓存。左滑可删除。'
                    : 'Download by version; read chapters are also cached. Swipe left to delete.')}
              </CacheCardDesc>
            </div>
            <div className="cache-version-list">
              {PRIMARY_VERSION_IDS.map((versionId) => {
                const stats = statsMap[versionId]
                const downloadState = getDownloadState(versionId, stats, downloads)
                const storageBytes = downloads[versionId]?.progress?.bytesDownloaded ?? stats?.storageBytes ?? 0
                return (
                  <CacheVersionRow
                    key={versionId}
                    label={VERSION_LABELS[versionId]?.[lang] ?? VERSIONS[versionId]?.shortLabel ?? versionId}
                    subtitle={`${stats?.chapterCount ?? 0}/${stats?.chapterTotal ?? 0}`}
                    storageBytes={storageBytes}
                    downloadState={downloadState}
                    progressPct={getProgressPct(versionId, stats, downloads)}
                    onDownloadAction={() => handleDownloadAction(versionId)}
                    onDelete={() => handleDelete(versionId)}
                    deleteLabel={isZh ? '删除' : 'Delete'}
                    actionLabels={actionLabels}
                    showDownload
                    canDelete={!isBundledApp && (stats?.chapterCount ?? 0) > 0}
                    loading={!statsReady}
                  />
                )
              })}
            </div>
          </section>

          {showPageCacheCard && (
            <section className="cache-card">
              <div className="cache-card-head">
                <h3 className="cache-card-title">{isZh ? '可清理缓存' : 'Clearable cache'}</h3>
                <p className="cache-card-size">{formatSizeOrLoading(pageCache.bytes, !dataReady)}</p>
                <CacheCardDesc loading={!dataReady}>
                  {isZh
                    ? '页面缓存（应用壳资源）。清理后将自动刷新。'
                    : 'Page cache (app shell assets). Clearing will reload the page.'}
                </CacheCardDesc>
              </div>
              <div className="cache-version-list">
                <CacheVersionRow
                  label={isZh ? '页面缓存' : 'Page cache'}
                  subtitle={isZh ? '应用壳资源' : 'App shell assets'}
                  storageBytes={pageCache.bytes}
                  loading={!dataReady}
                  canDelete={dataReady && pageCache.bytes > 0}
                  onDelete={handleClearPageCache}
                  deleteLabel={isZh ? '清理' : 'Clear'}
                />
              </div>
            </section>
          )}

          <section className="cache-card">
            <div className="cache-card-head">
              <h3 className="cache-card-title">{isZh ? '数据备份' : 'Data backup'}</h3>
              <p className="cache-card-desc">
                {isZh
                  ? '导出收藏、续航、阅读位置与设置。卸载或清数据前请先备份；不含经文缓存。'
                  : 'Export highlights, stamina, reading position, and settings. Backup before uninstall. Scripture cache is not included.'}
              </p>
            </div>
            <div className="cache-backup-actions">
              <button
                type="button"
                className="cache-card-action"
                onClick={handleExportBackup}
                disabled={busy}
              >
                {isZh ? '导出备份' : 'Export'}
              </button>
              <button
                type="button"
                className="cache-card-action"
                onClick={handleImportBackupClick}
                disabled={busy}
              >
                {isZh ? '导入备份' : 'Import'}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="cache-backup-file-input"
                onChange={handleImportBackupFile}
                tabIndex={-1}
              />
            </div>
            {backupHint && <p className="cache-backup-hint">{backupHint}</p>}
          </section>

          <section className="cache-card">
            <div className="cache-card-head">
              <h3 className="cache-card-title">{isZh ? '手动清理' : 'Manual cleanup'}</h3>
              <p className="cache-card-size">{formatSizeOrLoading(otherBytes, !dataReady)}</p>
              <CacheCardDesc loading={!dataReady}>
                {isZh
                  ? '左滑删除单项数据；收藏与续航仅展示占用，不可删除。'
                  : 'Swipe left to delete an item. Highlights and stamina are view-only.'}
              </CacheCardDesc>
            </div>
            <div className="cache-version-list">
              {localItems.map((item) => (
                <CacheVersionRow
                  key={item.id}
                  label={item.label[lang] ?? item.label.chs}
                  subtitle={item.hint?.[lang] ?? item.hint?.chs ?? ''}
                  storageBytes={item.bytes}
                  loading={!dataReady}
                  canDelete={Boolean(item.clearable) && dataReady}
                  onDelete={() => handleDeleteDataItem(item)}
                  deleteLabel={isZh ? '删除' : 'Delete'}
                />
              ))}
            </div>
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
