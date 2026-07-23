import { Capacitor } from '@capacitor/core'

/** 是否运行在 Capacitor 原生壳（Android / iOS App） */
export function isNativeApp() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}
