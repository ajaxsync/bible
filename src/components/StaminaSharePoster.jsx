import { useMemo, useState } from 'react'
import { PANEL_TRANSITION_MS } from '../hooks/useAnimatedPanel.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import { copyText } from '../lib/copyText.js'
import { downloadDataUrl } from '../lib/shareStaminaImage.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import './StaminaSharePoster.css'

const COPY = {
  chs: {
    download: '下载图片',
    copyMessage: '复制文案',
    copiedMessage: '已复制',
    copyFailedMessage: '复制失败',
    close: '关闭',
    ariaLabel: '续航分享',
    shareMessage: (url) =>
      `我在用 Bible Reader 培养每日读经习惯，「续航」功能帮我坚持打卡。你也来试试：\n${url}`,
  },
  cht: {
    download: '下載圖片',
    copyMessage: '複製文案',
    copiedMessage: '已複製',
    copyFailedMessage: '複製失敗',
    close: '關閉',
    ariaLabel: '續航分享',
    shareMessage: (url) =>
      `我在用 Bible Reader 培養每日讀經習慣，「續航」功能幫我堅持打卡。你也來試試：\n${url}`,
  },
  en: {
    download: 'Save image',
    copyMessage: 'Copy message',
    copiedMessage: 'Copied',
    copyFailedMessage: 'Copy failed',
    close: 'Close',
    ariaLabel: 'Share stamina',
    shareMessage: (url) =>
      `I use Bible Reader to build a daily reading habit — Stamina keeps me on track. Try it:\n${url}`,
  },
}

export default function StaminaSharePoster({ lang, dataUrl, onClose }) {
  const [closing, setClosing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const copy = COPY[lang]
  const motionClass = closing ? 'is-closing' : 'is-open'

  const shareMessage = useMemo(
    () => copy.shareMessage(window.location.origin),
    [copy],
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

  const copyLabel = copied
    ? copy.copiedMessage
    : copyFailed
      ? copy.copyFailedMessage
      : copy.copyMessage

  return (
    <>
      <div
        className={`stamina-poster-backdrop panel-backdrop ${motionClass}`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        className={`stamina-poster-panel ${motionClass}`}
        role="dialog"
        aria-modal="true"
        aria-label={copy.ariaLabel}
      >
        <BottomSheetHandle
          onClose={requestClose}
          label={copy.close}
          className="stamina-poster-sheet-handle"
        />
        <div className="stamina-poster-scroll">
          <div className="stamina-poster-preview">
            <img src={dataUrl} alt="" className="stamina-poster-image" />
          </div>
          <p className="stamina-poster-message-text">{shareMessage}</p>
          <div className="stamina-poster-actions">
            <button
              type="button"
              className="stamina-poster-action-btn stamina-poster-action-btn--download"
              onClick={() => downloadDataUrl(dataUrl)}
            >
              {copy.download}
            </button>
            <button
              type="button"
              className={`stamina-poster-action-btn stamina-poster-action-btn--copy${copyFailed ? ' is-failed' : ''}${copied ? ' is-copied' : ''}`}
              onClick={handleCopyMessage}
            >
              {copyLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
