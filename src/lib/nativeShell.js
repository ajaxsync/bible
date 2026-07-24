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

/**
 * 状态栏不压住 Header：尽量关闭 overlay；Android 15+ 强制沉浸时用高度垫高顶栏。
 */
export async function syncNativeStatusBar() {
  if (!isNativeApp()) return

  try {
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {
    // Android 15+ 等可能不支持，走下方 getInfo 垫高
  }

  try {
    await StatusBar.setBackgroundColor({ color: readCssColor('--bg', '#ffffff') })
  } catch {
    // 部分机型 / Android 15+ 忽略
  }

  try {
    // 浅色顶栏用深色图标；深色主题用浅色图标
    const bg = readCssColor('--bg', '#ffffff').toLowerCase()
    const isDarkBg = bg === '#1a1a1a' || bg === '#000' || bg === '#000000'
    await StatusBar.setStyle({ style: isDarkBg ? Style.Light : Style.Dark })
  } catch {
    // 忽略
  }

  try {
    const info = await StatusBar.getInfo()
    const root = document.documentElement
    if (info?.overlays && info.height > 0) {
      // 仍叠在 WebView 上：用实测高度垫开 Header
      root.style.setProperty('--safe-area-inset-top', `${Math.ceil(info.height)}px`)
    } else {
      root.style.setProperty('--safe-area-inset-top', '0px')
    }
  } catch {
    // 忽略
  }
}

/** Capacitor 原生壳：状态栏避让 + 关掉启动页 */
export async function initNativeShell() {
  if (!isNativeApp()) return

  document.documentElement.classList.add('is-native-app')

  await syncNativeStatusBar()

  try {
    // 无淡出，避免纯色→启动页之间再闪一下
    await SplashScreen.hide({ fadeOutDuration: 0 })
  } catch {
    // 忽略
  }

  window.setTimeout(() => {
    dismissLaunchSplash()
  }, LAUNCH_SPLASH_MS)
}
