import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { PANEL_TRANSITION_MS } from '../hooks/useAnimatedPanel.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import { copyText } from '../lib/copyText.js'
import { appConfig } from '../config/env.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import './ChapterShareDialog.css'

const COPY = {
  chs: {
    title: '分享本章',
    close: '关闭',
    copyMessage: '复制文案',
    copiedMessage: '已复制',
    copyFailedMessage: '复制失败',
    shareNative: '分享',
    ariaLabel: '分享本章',
    shareMessage: (appName, chapterLabel, url) =>
      `我正在使用 ${appName} 阅读${chapterLabel}，觉得很不错，推荐你也试试：\n${url}`,
  },
  cht: {
    title: '分享本章',
    close: '關閉',
    copyMessage: '複製文案',
    copiedMessage: '已複製',
    copyFailedMessage: '複製失敗',
    shareNative: '分享',
    ariaLabel: '分享本章',
    shareMessage: (appName, chapterLabel, url) =>
      `我正在使用 ${appName} 閱讀${chapterLabel}，覺得很不錯，推薦你也試試：\n${url}`,
  },
  en: {
    title: 'Share chapter',
    close: 'Close',
    copyMessage: 'Copy message',
    copiedMessage: 'Copied',
    copyFailedMessage: 'Copy failed',
    shareNative: 'Share',
    ariaLabel: 'Share chapter',
    shareMessage: (appName, chapterLabel, url) =>
      `I'm reading ${chapterLabel} with ${appName} and really like it. Give it a try:\n${url}`,
  },
}

export default function ChapterShareDialog({ lang, chapterLabel, shareUrl, onClose }) {
  const [closing, setClosing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const copy = COPY[lang] ?? COPY.chs
  const motionClass = closing ? 'is-closing' : 'is-open'
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const shareMessage = useMemo(
    () => copy.shareMessage(appConfig.name || 'Bible Reader', chapterLabel, shareUrl),
    [chapterLabel, copy, shareUrl],
  )

  useScrollLock(true)

  const requestClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => onClose(), PANEL_TRANSITION_MS)
  }

  const handleCopyMessage = async () => {
    const ok = await copyText(shareMessage)
    if (ok) {
      setCopyFailed(false)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      return
    }
    setCopied(false)
    setCopyFailed(true)
    window.setTimeout(() => setCopyFailed(false), 2500)
  }

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: appConfig.name || 'Bible Reader',
        text: shareMessage,
        url: shareUrl,
      })
    } catch (err) {
      if (err?.name === 'AbortError') return
      await handleCopyMessage()
    }
  }

  const copyLabel = copied
    ? copy.copiedMessage
    : copyFailed
      ? copy.copyFailedMessage
      : copy.copyMessage

  return createPortal(
    <>
      <div
        className={`chapter-share-backdrop panel-backdrop ${motionClass}`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        className={`chapter-share-panel ${motionClass}`}
        role="dialog"
        aria-modal="true"
        aria-label={copy.ariaLabel}
      >
        <BottomSheetHandle
          onClose={requestClose}
          label={copy.close}
          className="chapter-share-sheet-handle"
        />
        <div className="chapter-share-body">
          <h2 className="chapter-share-title">{copy.title}</h2>
          <p className="chapter-share-message">{shareMessage}</p>
          <div className="chapter-share-actions">
            {canNativeShare && (
              <button
                type="button"
                className="chapter-share-btn chapter-share-btn--primary"
                onClick={handleNativeShare}
              >
                {copy.shareNative}
              </button>
            )}
            <button
              type="button"
              className={`chapter-share-btn${copyFailed ? ' is-failed' : ''}${copied ? ' is-copied' : ''}`}
              onClick={handleCopyMessage}
            >
              {copyLabel}
            </button>
            <button type="button" className="chapter-share-btn" onClick={requestClose}>
              {copy.close}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
