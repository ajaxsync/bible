import { useEffect, useState } from 'react'
import { usePwaUpdate } from '../context/PwaUpdateContext.jsx'
import { useVersion } from '../context/VersionContext.jsx'
import './PwaUpdatePrompt.css'

const COPY = {
  chs: {
    title: '发现新版本',
    desc: '应用已更新，刷新后即可使用最新界面与功能。',
    update: '立即更新',
    later: '稍后再说',
    updating: '更新中…',
  },
  cht: {
    title: '發現新版本',
    desc: '應用已更新，刷新後即可使用最新介面與功能。',
    update: '立即更新',
    later: '稍後再說',
    updating: '更新中…',
  },
  en: {
    title: 'Update available',
    desc: 'A new version is ready. Refresh to get the latest improvements.',
    update: 'Update now',
    later: 'Later',
    updating: 'Updating…',
  },
}

export default function PwaUpdatePrompt() {
  const { version } = useVersion()
  const { needRefresh, updating, applyUpdate } = usePwaUpdate()
  const [open, setOpen] = useState(false)
  const lang = version.lang === 'en' ? 'en' : version.lang === 'cht' ? 'cht' : 'chs'
  const copy = COPY[lang]

  useEffect(() => {
    if (needRefresh) setOpen(true)
  }, [needRefresh])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && needRefresh) {
        setOpen(true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [needRefresh])

  if (!needRefresh || !open) return null

  return (
    <div className="pwa-update-root" role="presentation">
      <div className="pwa-update-backdrop" aria-hidden />
      <div
        className="pwa-update-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pwa-update-title"
        aria-describedby="pwa-update-desc"
      >
        <h2 id="pwa-update-title" className="pwa-update-title">{copy.title}</h2>
        <p id="pwa-update-desc" className="pwa-update-desc">{copy.desc}</p>
        <div className="pwa-update-actions">
          <button
            type="button"
            className="pwa-update-btn"
            onClick={() => setOpen(false)}
            disabled={updating}
          >
            {copy.later}
          </button>
          <button
            type="button"
            className="pwa-update-btn pwa-update-btn-primary"
            onClick={applyUpdate}
            disabled={updating}
          >
            {updating ? copy.updating : copy.update}
          </button>
        </div>
      </div>
    </div>
  )
}
