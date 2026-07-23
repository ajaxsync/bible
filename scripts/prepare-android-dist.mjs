/**
 * Android 包体精简与 Capacitor WebView 兼容处理。
 * - 去掉 verses 源数据（约 18MB）
 * - 去掉 crossorigin（本地 assets 无 CORS 头会导致 JS 加载失败 → 白屏）
 * - 去掉 PWA 残留文件
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const versesDir = join(dist, 'json', 'verses')

if (!existsSync(dist)) {
  console.error('[prepare-android-dist] dist/ 不存在，请先执行 build')
  process.exit(1)
}

if (existsSync(versesDir)) {
  rmSync(versesDir, { recursive: true, force: true })
  console.log('[prepare-android-dist] 已移除 dist/json/verses')
} else {
  console.log('[prepare-android-dist] 无 verses 目录，跳过')
}

const indexPath = join(dist, 'index.html')
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, 'utf8').replace(/\s+crossorigin/g, '')
  writeFileSync(indexPath, html)
  console.log('[prepare-android-dist] 已移除 index.html 中的 crossorigin')
}

for (const name of readdirSync(dist)) {
  if (
    name === 'sw.js'
    || name === 'manifest.webmanifest'
    || name.startsWith('workbox-')
  ) {
    rmSync(join(dist, name), { force: true })
    console.log(`[prepare-android-dist] 已移除 ${name}`)
  }
}

function dirSizeMb(dir) {
  if (!existsSync(dir)) return 0
  let total = 0
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    total += st.isDirectory() ? dirSizeMb(p) * 1024 * 1024 : st.size
  }
  return total / (1024 * 1024)
}

const jsonMb = dirSizeMb(join(dist, 'json')).toFixed(1)
console.log(`[prepare-android-dist] dist/json 约 ${jsonMb} MB（将打入 APK）`)
