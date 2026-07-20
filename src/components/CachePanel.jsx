import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearVersionCache,
  downloadVersionScripture,
  DownloadAbortedError,
  getAllVersionsCacheStats,
} from '../lib/bibleCache.js'
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

export default function CachePanel({ onClose }) {
  const { version } = useVersion()
  const isZh = version.lang !== 'en'
  const lang = version.lang === 'en' ? 'en' : version.lang === 'cht' ? 'cht' : 'chs'

  const [versionStats, setVersionStats] = useState([])
  const [downloads, setDownloads] = useState({})
  const [error, setError] = useState(null)
  const [closing, setClosing] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [showAndroidGuide, setShowAndroidGuide] = useState(false)

  useScrollLock(true)

  const abortRefs = useRef({})
  const closeTimerRef = useRef(null)
  const { installState, promptInstall } = usePwaInstall()

  const statsMap = Object.fromEntries(versionStats.map((item) => [item.versionId, item]))
  const anyDownloading = Object.values(downloads).some((item) => item.status === 'downloading')

  const refreshStats = useCallback(() => {
    getAllVersionsCacheStats()
      .then(setVersionStats)
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshStats()
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      Object.values(abortRefs.current).forEach((controller) => controller?.abort())
    }
  }, [refreshStats])

  useEffect(() => {
    if (!anyDownloading) return undefined
    const id = window.setInterval(refreshStats, 1500)
    return () => window.clearInterval(id)
  }, [anyDownloading, refreshStats])

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
    complete: isZh ? '已完成' : 'Downloaded',
  }

  return (
    <>
      <div className={`cache-backdrop panel-backdrop ${motionClass}`} onClick={requestClose} aria-hidden />
      <div className={`cache-panel ${motionClass}`} role="dialog" aria-label={isZh ? '离线缓存' : 'Offline cache'}>
        <BottomSheetHandle
          onClose={requestClose}
          label={isZh ? '关闭' : 'Close'}
          className="cache-panel-sheet-handle"
        />
        <div className="cache-panel-header">
          <h2 className="cache-panel-title">{isZh ? '离线缓存' : 'Offline cache'}</h2>
          <button type="button" className="cache-panel-close" onClick={requestClose} aria-label={isZh ? '关闭' : 'Close'}>
            ×
          </button>
        </div>

        <div className="cache-panel-scroll">
          <p className="cache-panel-desc">
            {isZh
              ? '按版本下载经文以供离线阅读。阅读过的章节也会自动缓存。'
              : 'Download scripture by version for offline reading. Chapters you read are also cached automatically.'}
          </p>

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
                />
              )
            })}
          </div>

          {error && <p className="cache-error">{error}</p>}

          {installState !== 'unavailable' && installState !== 'installed' && (
            <div className="cache-install-section">
              <button
                type="button"
                className="cache-btn"
                onClick={handleInstall}
                disabled={anyDownloading}
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
        </div>
      </div>
    </>
  )
}
