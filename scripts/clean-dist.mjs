/**
 * 仅清理 dist 中的构建产物（JS/CSS/HTML），保留 json 目录。
 * Windows 上递归删除 3 万+ json 文件易触发 ENOTEMPTY。
 */
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'

function safeRm(path) {
  if (!existsSync(path)) return
  rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
}

if (!existsSync(dist)) {
  console.log('[clean-dist] dist/ 不存在，跳过')
  process.exit(0)
}

safeRm(join(dist, 'assets'))

for (const name of readdirSync(dist)) {
  if (
    name.endsWith('.html')
    || name === 'sw.js'
    || name === 'manifest.webmanifest'
    || name.startsWith('workbox-')
  ) {
    safeRm(join(dist, name))
  }
}

console.log('[clean-dist] 已清理 dist 构建产物（保留 json/）')
