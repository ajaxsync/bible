import { useState } from 'react'
import { useVersion } from '../context/VersionContext.jsx'
import { useReadingStamina } from '../context/ReadingStaminaContext.jsx'
import { useScrollLock } from '../hooks/useScrollLock.js'
import { PANEL_TRANSITION_MS } from '../hooks/useAnimatedPanel.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import './StaminaPrompt.css'

const COPY = {
  chs: {
    title: '续航完成！',
    desc: (streak) => `今日阅读续航已达成，已连续 ${streak} 天。`,
    calendar: '查看续航日历',
    continue: '继续阅读',
  },
  cht: {
    title: '續航完成！',
    desc: (streak) => `今日閱讀續航已達成，已連續 ${streak} 天。`,
    calendar: '查看續航日曆',
    continue: '繼續閱讀',
  },
  en: {
    title: 'Stamina complete!',
    desc: (streak) => `Today's reading goal reached. ${streak}-day streak!`,
    calendar: 'View calendar',
    continue: 'Keep reading',
  },
}

export default function StaminaPrompt() {
  const { version } = useVersion()
  const {
    promptOpen,
    completionStreak,
    closePrompt,
    openPanelFromPrompt,
  } = useReadingStamina()
  const [closing, setClosing] = useState(false)

  const lang = version.lang === 'en' ? 'en' : version.lang === 'cht' ? 'cht' : 'chs'
  const copy = COPY[lang]

  useScrollLock(promptOpen)

  if (!promptOpen) return null

  const requestClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => closePrompt(), PANEL_TRANSITION_MS)
  }

  const motionClass = closing ? 'is-closing' : 'is-open'

  return (
    <div className="stamina-prompt-root" role="presentation">
      <div
        className={`stamina-prompt-backdrop panel-backdrop ${motionClass}`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        className={`stamina-prompt-dialog ${motionClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stamina-prompt-title"
        aria-describedby="stamina-prompt-desc"
      >
        <BottomSheetHandle onClose={requestClose} label={lang === 'en' ? 'Close' : '关闭'} className="stamina-prompt-sheet-handle" />
        <div className="stamina-prompt-body">
          <h2 id="stamina-prompt-title" className="stamina-prompt-title">{copy.title}</h2>
          <p id="stamina-prompt-desc" className="stamina-prompt-desc">
            {copy.desc(completionStreak)}
          </p>
          <div className="stamina-prompt-actions">
            <button type="button" className="stamina-prompt-btn" onClick={requestClose}>
              {copy.continue}
            </button>
            <button
              type="button"
              className="stamina-prompt-btn stamina-prompt-btn-primary"
              onClick={() => {
                setClosing(true)
                window.setTimeout(() => openPanelFromPrompt(), PANEL_TRANSITION_MS)
              }}
            >
              {copy.calendar}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
