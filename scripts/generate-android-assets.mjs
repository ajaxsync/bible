#!/usr/bin/env node
/**
 * 从 public/favicon.svg 生成 Android 启动图标与 Splash 图。
 * 风格与 PWA 图标一致：背景 #f7f6f3，居中书本图标。
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const resDir = join(root, 'android', 'app', 'src', 'main', 'res')
const svg = readFileSync(join(root, 'public', 'favicon.svg'))

const BACKGROUND = '#f7f6f3'
const TEXT = '#37352f'
const ICON_PADDING = 0.14
const SPLASH_TITLE = 'Bible Reader'
const SPLASH_TAGLINE = '向下扎根，向上结果'

const LAUNCHER_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
}

const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
}

const SPLASH_PORT = {
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
}

const SPLASH_LAND = {
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
}

async function iconBuffer(size, paddingRatio = ICON_PADDING) {
  const padding = Math.round(size * paddingRatio)
  const inner = Math.max(1, size - padding * 2)
  const rendered = await sharp(svg).resize(inner, inner).png().toBuffer()
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: rendered, gravity: 'center' }])
    .png()
    .toBuffer()
}

async function squareIcon(size, { transparent = false } = {}) {
  if (transparent) return iconBuffer(size)
  const padding = Math.round(size * ICON_PADDING)
  const inner = Math.max(1, size - padding * 2)
  const rendered = await sharp(svg).resize(inner, inner).png().toBuffer()
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: rendered, gravity: 'center' }])
    .png()
    .toBuffer()
}

async function splashBuffer(width, height) {
  const iconSize = Math.round(Math.min(width, height) * 0.2)
  const icon = await iconBuffer(iconSize, 0.08)
  const titleSize = Math.max(22, Math.round(Math.min(width, height) * 0.065))
  const subtitleSize = Math.max(14, Math.round(titleSize * 0.42))
  const iconTop = Math.round(height * 0.2)
  const titleY = iconTop + iconSize + Math.round(height * 0.12)
  const subtitleY = titleY + Math.round(titleSize * 1.35)
  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%"
        y="${titleY}"
        text-anchor="middle"
        font-family="Arial, Helvetica, 'Microsoft YaHei', 'Noto Sans SC', sans-serif"
        font-size="${titleSize}"
        font-weight="700"
        fill="${TEXT}"
      >${SPLASH_TITLE}</text>
      <text
        x="50%"
        y="${subtitleY}"
        text-anchor="middle"
        font-family="Arial, Helvetica, 'Microsoft YaHei', 'Noto Sans SC', sans-serif"
        font-size="${subtitleSize}"
        font-weight="500"
        fill="${TEXT}"
        opacity="0.72"
      >${SPLASH_TAGLINE}</text>
    </svg>
  `)
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([
      { input: icon, top: iconTop, left: Math.round((width - iconSize) / 2) },
      { input: overlay },
    ])
    .png()
    .toBuffer()
}

async function writePng(dir, filename, buffer) {
  mkdirSync(dir, { recursive: true })
  const outPath = join(dir, filename)
  await sharp(buffer).png().toFile(outPath)
  return outPath
}

async function main() {
  console.log('Generating Android launcher icons from favicon.svg…')

  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const dir = join(resDir, folder)
    const square = await squareIcon(size)
    await writePng(dir, 'ic_launcher.png', square)
    await writePng(dir, 'ic_launcher_round.png', square)
    console.log(`  ${folder}/ic_launcher.png (${size}×${size})`)
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir = join(resDir, folder)
    const foreground = await squareIcon(size, { transparent: true })
    await writePng(dir, 'ic_launcher_foreground.png', foreground)
    console.log(`  ${folder}/ic_launcher_foreground.png (${size}×${size})`)
  }

  console.log('Generating Android splash screens…')

  const defaultSplash = await splashBuffer(480, 320)
  await writePng(join(resDir, 'drawable'), 'splash.png', defaultSplash)
  console.log('  drawable/splash.png (480×320)')

  for (const [folder, [width, height]] of Object.entries(SPLASH_PORT)) {
    const splash = await splashBuffer(width, height)
    await writePng(join(resDir, folder), 'splash.png', splash)
    console.log(`  ${folder}/splash.png (${width}×${height})`)
  }

  for (const [folder, [width, height]] of Object.entries(SPLASH_LAND)) {
    const splash = await splashBuffer(width, height)
    await writePng(join(resDir, folder), 'splash.png', splash)
    console.log(`  ${folder}/splash.png (${width}×${height})`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
