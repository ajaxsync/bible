import { useState } from 'react'
import { PANEL_TRANSITION_MS } from '../hooks/useAnimatedPanel.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import LightningIcon from './LightningIcon.jsx'
import './StaminaHelpDialog.css'

const COPY = {
  chs: {
    title: '为何有【续航】功能？',
    body: '维持【续航】意味着你持续阅读圣经，然而你和神的关系则远超过一个数字。让你的【续航】提醒你要每天与神交流，以及投入他的话语中。',
    gotIt: '我知道了',
    close: '关闭',
  },
  cht: {
    title: '為何有【續航】功能？',
    body: '維持【續航】意味著你持續閱讀聖經，然而你和神的關係則遠超過一個數字。讓你的【續航】提醒你要每天與神交流，以及投入他的話語中。',
    gotIt: '我知道了',
    close: '關閉',
  },
  en: {
    title: 'Why Stamina?',
    body: 'Keeping your stamina means you keep reading the Bible, but your relationship with God is far more than a number. Let stamina remind you to meet with God daily and invest in his word.',
    gotIt: 'Got it',
    close: 'Close',
  },
}

export default function StaminaHelpDialog({ lang, onClose }) {
  const [closing, setClosing] = useState(false)
  const copy = COPY[lang]
  const motionClass = closing ? 'is-closing' : 'is-open'

  useScrollLock(true)

  const requestClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => onClose(), PANEL_TRANSITION_MS)
  }

  return (
    <>
      <div
        className={`stamina-help-backdrop panel-backdrop ${motionClass}`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        className={`stamina-help-panel ${motionClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stamina-help-title"
        aria-describedby="stamina-help-body"
      >
        <BottomSheetHandle
          onClose={requestClose}
          label={copy.close}
          className="stamina-help-sheet-handle"
        />
        <div className="stamina-help-scroll">
          <div className="stamina-help-icon" aria-hidden>
            <LightningIcon size={36} />
          </div>
          <h3 id="stamina-help-title" className="stamina-help-title">{copy.title}</h3>
          <p id="stamina-help-body" className="stamina-help-body">{copy.body}</p>
          <button type="button" className="stamina-help-btn" onClick={requestClose}>
            {copy.gotIt}
          </button>
        </div>
      </div>
    </>
  )
}
