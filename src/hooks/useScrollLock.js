import { useEffect } from 'react'

let lockCount = 0
let savedScrollTop = 0
let scrollEl = null

function lockScroll() {
  scrollEl = document.querySelector('.app-main')
  savedScrollTop = scrollEl?.scrollTop ?? 0
  document.documentElement.classList.add('scroll-locked')
  scrollEl?.classList.add('scroll-locked')
}

function unlockScroll() {
  document.documentElement.classList.remove('scroll-locked')
  if (scrollEl) {
    scrollEl.classList.remove('scroll-locked')
    scrollEl.scrollTop = savedScrollTop
  }
  scrollEl = null
}

export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined

    lockCount += 1
    if (lockCount === 1) lockScroll()

    return () => {
      lockCount -= 1
      if (lockCount === 0) unlockScroll()
    }
  }, [locked])
}
