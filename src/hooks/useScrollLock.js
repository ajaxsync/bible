import { useEffect } from 'react'

let lockCount = 0
let savedScrollTop = 0
let scrollEl = null

const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]'
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'])

function isScrollable(el) {
  if (!el) return false
  const style = getComputedStyle(el)
  const allowsScroll = style.overflowY === 'auto'
    || style.overflowY === 'scroll'
    || style.overflowY === 'overlay'
  return allowsScroll && el.scrollHeight > el.clientHeight
}

function findScrollableInDialog(target) {
  if (!(target instanceof Element)) return null
  const dialog = target.closest(DIALOG_SELECTOR)
  if (!dialog) return null

  let node = target
  while (node && node !== dialog) {
    if (isScrollable(node)) return node
    node = node.parentElement
  }
  return null
}

function handleWheel(event) {
  const scrollable = findScrollableInDialog(event.target)
  if (!scrollable) {
    event.preventDefault()
    return
  }

  const { deltaY } = event
  const atTop = scrollable.scrollTop <= 0
  const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1
  if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
    event.preventDefault()
  }
}

function handleTouchMove(event) {
  if (findScrollableInDialog(event.target)) return
  event.preventDefault()
}

function handleKeyDown(event) {
  if (!SCROLL_KEYS.has(event.key)) return
  if (event.target instanceof Element) {
    if (event.target.closest(DIALOG_SELECTOR)) return
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return
  }
  event.preventDefault()
}

function lockScroll() {
  scrollEl = document.querySelector('.app-main')
  savedScrollTop = scrollEl?.scrollTop ?? 0

  document.documentElement.classList.add('scroll-locked')
  scrollEl?.classList.add('scroll-locked')

  document.addEventListener('wheel', handleWheel, { passive: false, capture: true })
  document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
  document.addEventListener('keydown', handleKeyDown, { capture: true })
}

function unlockScroll() {
  document.removeEventListener('wheel', handleWheel, { capture: true })
  document.removeEventListener('touchmove', handleTouchMove, { capture: true })
  document.removeEventListener('keydown', handleKeyDown, { capture: true })

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
