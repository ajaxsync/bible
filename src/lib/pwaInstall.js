let deferredPrompt = null
const listeners = new Set()

export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

export function isIosDevice() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

function getInstallState() {
  if (isAppInstalled()) return 'installed'
  if (deferredPrompt) return 'ready'
  if (isIosDevice()) return 'ios'
  return 'unavailable'
}

function notifyListeners() {
  const state = getInstallState()
  for (const listener of listeners) listener(state)
}

export function initPwaInstall() {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    notifyListeners()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notifyListeners()
  })

  notifyListeners()
}

export function subscribePwaInstall(listener) {
  listeners.add(listener)
  listener(getInstallState())
  return () => listeners.delete(listener)
}

export async function promptPwaInstall() {
  if (!deferredPrompt) return 'unavailable'
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  notifyListeners()
  return outcome
}
