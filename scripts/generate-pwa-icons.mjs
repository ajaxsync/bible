#!/usr/bin/env node
/**
 * 从 public/favicon.svg 生成 PWA 所需的 PNG 图标。
 * Chrome / Android 安装性检查要求 192×192、512×512 的 PNG（SVG 不足以触发 beforeinstallprompt）。
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const svg = readFileSync(join(publicDir, 'favicon.svg'))
const BACKGROUND = '#f7f6f3'

async function writePng(size, filename, { maskable = false } = {}) {
  const padding = maskable ? Math.round(size * 0.12) : 0
  const inner = size - padding * 2

  const iconBuffer = await sharp(svg).resize(inner, inner).png().toBuffer()

  const pipeline = padding > 0
    ? sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: BACKGROUND,
        },
      }).composite([{ input: iconBuffer, gravity: 'center' }])
    : sharp(iconBuffer).resize(size, size)

  const outPath = join(publicDir, filename)
  await pipeline.png().toFile(outPath)
  console.log(`  ${filename} (${size}×${size}${maskable ? ', maskable' : ''})`)
}

async function main() {
  console.log('Generating PWA icons from favicon.svg…')
  await writePng(192, 'icon-192.png')
  await writePng(512, 'icon-512.png')
  await writePng(192, 'icon-192-maskable.png', { maskable: true })
  await writePng(512, 'icon-512-maskable.png', { maskable: true })
  await writePng(180, 'apple-touch-icon.png', { maskable: true })
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
