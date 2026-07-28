import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { isNativeApp } from './platform.js'

/** Web 品牌启动页展示时长 */
const LAUNCH_SPLASH_MS = 1200
const LAUNCH_SPLASH_FADE_MS = 280

function dismissLaunchSplash() {
  const root = document.documentElement
  const el = document.getElementById('launch-splash')
  if (!el) {
    root.classList.remove('is-native-app', 'launch-splash-hiding')
    return
  }

  root.classList.add('launch-splash-hiding')
  window.setTimeout(() => {
    el.remove()
    root.classList.remove('is-native-app', 'launch-splash-hiding')
  }, LAUNCH_SPLASH_FADE_MS)
}

function readCssColor(varName, fallback) {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return value || fallback
  } catch {
    return fallback
  }
}

/** 读取 CSS env(safe-area-inset-top) 的实际像素 */
function readEnvSafeAreaTop() {
  try {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top, 0px);'
    document.documentElement.appendChild(probe)
    const px = parseFloat(getComputedStyle(probe).paddingTop) || 0
    probe.remove()
    return Math.ceil(px)
  } catch {
    return 0
  }
}

/**
 * Android 15+ / 小米等：系统常强制 edge-to-edge，overlaysWebView=false 无效。
 * 用 StatusBar 高度与 env() 取较大值垫开 Header，避免通知栏遮挡。
 * （不依赖 adjustMargins，避免与 CSS 安全区双重留白）
 */
function resolveTopInset({ barHeight, envTop }) {
  let inset = Math.max(envTop, 0)

  if (barHeight > 0) {
    inset = Math.max(inset, barHeight)
  }

  // 仍拿不到高度时给保守兜底（含刘海机常见状态栏区域）
  if (inset <= 0) {
    const approx = Math.round(Math.max(40, (window.screen?.height || 800) * 0.045))
    inset = Math.min(approx, 72)
  }

  return inset
}

/**
 * 状态栏不压住 Header：尽量关闭 overlay；强制沉浸时用高度垫高顶栏。
 */
export async function syncNativeStatusBar() {
  if (!isNativeApp()) return

  try {
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {
    // Android 15+ 忽略
  }

  try {
    await StatusBar.setBackgroundColor({ color: readCssColor('--bg', '#ffffff') })
  } catch {
    // Android 15+ 忽略
  }

  try {
    const bg = readCssColor('--bg', '#ffffff').toLowerCase()
    const isDarkBg = bg === '#1a1a1a' || bg === '#000' || bg === '#000000'
    await StatusBar.setStyle({ style: isDarkBg ? Style.Light : Style.Dark })
  } catch {
    // 忽略
  }

  let barHeight = 0
  try {
    const info = await StatusBar.getInfo()
    barHeight = Math.ceil(Number(info?.height) || 0)
  } catch {
    // 忽略
  }

  const envTop = readEnvSafeAreaTop()
  const insetTop = resolveTopInset({ barHeight, envTop })
  document.documentElement.style.setProperty('--safe-area-inset-top', `${insetTop}px`)

  // 底部手势条：优先 env，没有则在原生壳给一点兜底
  const envBottom = (() => {
    try {
      const probe = document.createElement('div')
      probe.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom, 0px);'
      document.documentElement.appendChild(probe)
      const px = parseFloat(getComputedStyle(probe).paddingBottom) || 0
      probe.remove()
      return Math.ceil(px)
    } catch {
      return 0
    }
  })()
  if (envBottom > 0) {
    document.documentElement.style.setProperty('--safe-area-inset-bottom', `${envBottom}px`)
  }
}

/** Capacitor 原生壳：状态栏避让 + 关掉启动页 */
export async function initNativeShell() {
  if (!isNativeApp()) return

  document.documentElement.classList.add('is-native-app')

  await syncNativeStatusBar()

  // 旋转 / 从多任务返回后再同步一次（部分机型冷启动时 height 为 0）
  try {
    App.addListener('resume', () => {
      window.setTimeout(() => {
        void syncNativeStatusBar()
      }, 50)
    })
  } catch {
    // 忽略
  }

  window.addEventListener('resize', () => {
    void syncNativeStatusBar()
  }, { passive: true })

  // 延迟再测：等系统 insets 稳定
  window.setTimeout(() => {
    void syncNativeStatusBar()
  }, 300)

  try {
    await SplashScreen.hide({ fadeOutDuration: 0 })
  } catch {
    // 忽略
  }

  window.setTimeout(() => {
    dismissLaunchSplash()
  }, LAUNCH_SPLASH_MS)
}
