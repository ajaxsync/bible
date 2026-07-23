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

/** Capacitor 原生壳：立刻关掉系统纯色闪屏，直接露出带文字启动页 */
export async function initNativeShell() {
  if (!isNativeApp()) return

  document.documentElement.classList.add('is-native-app')

  try {
    await StatusBar.setStyle({ style: Style.Dark })
  } catch {
    // 部分设备 / 模拟器可能不支持，忽略
  }

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
