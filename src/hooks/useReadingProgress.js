import { useEffect, useState } from 'react'

function computeProgress(el) {
  if (!el) return 0
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 0) return 0
  const ratio = el.scrollTop / maxScroll
  return Math.min(1, Math.max(0, ratio))
}

function resolveScrollTarget() {
  const main = document.querySelector('.app-main')
  if (main && main.scrollHeight > main.clientHeight + 1) {
    return main
  }
  return document.scrollingElement || document.documentElement
}

export function useReadingProgress(deps = []) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setProgress(computeProgress(resolveScrollTarget()))
      })
    }

    update()

    const main = document.querySelector('.app-main')
    main?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    const observeRoot = main || document.getElementById('root') || document.body
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(observeRoot)

    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(observeRoot, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(frame)
      main?.removeEventListener('scroll', update)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return progress
}
