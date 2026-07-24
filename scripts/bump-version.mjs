/**
 * 交互升级 package.json 的 version（不写 Gradle；由 sync:android / preview:android 同步）。
 *
 *   npm run version
 *   npm run version -- patch|minor|major|1.2.3   # 非交互（可选）
 */
import { createInterface } from 'node:readline'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = join(root, 'package.json')

function parseSemver(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) throw new Error(`无效版本: ${version}（须为 x.y.z）`)
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

function bump(kind, current) {
  const v = parseSemver(current)
  if (kind === 'major') return `${v.major + 1}.0.0`
  if (kind === 'minor') return `${v.major}.${v.minor + 1}.0`
  if (kind === 'patch') return `${v.major}.${v.minor}.${v.patch + 1}`
  parseSemver(kind)
  return kind
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(String(answer || '').trim())
    })
  })
}

async function chooseKind(current) {
  const patch = bump('patch', current)
  const minor = bump('minor', current)
  const major = bump('major', current)

  console.log(`\n当前版本: ${current}`)
  console.log('请选择升级方式：')
  console.log(`  1) patch   ${current} → ${patch}   （日常小改）`)
  console.log(`  2) minor   ${current} → ${minor}`)
  console.log(`  3) major   ${current} → ${major}`)
  console.log('  4) 自定义  输入 x.y.z')
  console.log('  0) 取消')

  const choice = await ask('\n输入序号: ')
  if (choice === '0' || choice === '') {
    console.log('已取消')
    process.exit(0)
  }
  if (choice === '1' || choice.toLowerCase() === 'patch') return 'patch'
  if (choice === '2' || choice.toLowerCase() === 'minor') return 'minor'
  if (choice === '3' || choice.toLowerCase() === 'major') return 'major'
  if (choice === '4' || choice.toLowerCase() === 'custom') {
    const custom = await ask('输入新版本 (x.y.z): ')
    if (!custom) {
      console.log('已取消')
      process.exit(0)
    }
    return custom
  }

  // 也允许直接输入 patch / 1.2.3
  if (['patch', 'minor', 'major'].includes(choice.toLowerCase())) {
    return choice.toLowerCase()
  }
  if (/^\d+\.\d+\.\d+$/.test(choice)) return choice

  console.error(`无效选项: ${choice}`)
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const prev = pkg.version
const cliArg = process.argv[2]?.trim()
const kind = cliArg || (await chooseKind(prev))
const next = bump(kind, prev)

if (next === prev) {
  console.log(`[version] 版本未变: ${prev}`)
  process.exit(0)
}

pkg.version = next
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
console.log(`[version] ${prev} → ${next}`)
console.log('[version] 下一步: npm run preview:android  （全量构建并打开 Android Studio）')
