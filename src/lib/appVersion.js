import { App } from '@capacitor/app'
import { isNativeApp } from './platform.js'
import packageJson from '../../package.json'

/**
 * @returns {Promise<{ version: string, build: string | null, source: 'native' | 'web' }>}
 */
export async function getAppVersionInfo() {
  if (isNativeApp()) {
    try {
      const info = await App.getInfo()
      return {
        version: info.version || packageJson.version,
        build: info.build != null ? String(info.build) : null,
        source: 'native',
      }
    } catch {
      // 回退到 package.json
    }
  }

  return {
    version: packageJson.version || '0.0.0',
    build: null,
    source: 'web',
  }
}

/** 展示文案：原生「1.0.1 (2)」；网页「0.1.0」 */
export function formatAppVersionLabel(info, isZh) {
  if (!info?.version) return isZh ? '未知' : 'Unknown'
  if (info.build) return `${info.version} (${info.build})`
  return info.version
}
