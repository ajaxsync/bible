#!/usr/bin/env node
/**
 * 扫描 public/json，生成离线全量下载用的 cache-manifest.json
 */
import { readdir, stat, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const jsonRoot = path.join(root, 'public', 'json')
const PRIMARY_VERSIONS = ['cunp', 'cunps', 'niv']

async function listJsonFiles(dir, prefix) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listJsonFiles(full, `${prefix}/${entry.name}`))
    } else if (entry.name.endsWith('.json') && !entry.name.includes('.jin')) {
      const rel = `json${prefix}/${entry.name}`.replace(/\\/g, '/')
      const { size } = await stat(full)
      files.push({ path: rel, bytes: size })
    }
  }
  return files
}

async function main() {
  const chapterFiles = []
  for (const versionId of PRIMARY_VERSIONS) {
    const versionDir = path.join(jsonRoot, versionId)
    try {
      chapterFiles.push(...await listJsonFiles(versionDir, `/${versionId}`))
    } catch {
      console.warn(`跳过缺失目录: ${versionId}`)
    }
  }

  const versesDir = path.join(jsonRoot, 'verses')
  const verseFiles = await listJsonFiles(versesDir, '/verses')

  chapterFiles.sort((a, b) => a.path.localeCompare(b.path))
  verseFiles.sort((a, b) => a.path.localeCompare(b.path))

  const chapterBytes = chapterFiles.reduce((sum, f) => sum + f.bytes, 0)
  const verseBytes = verseFiles.reduce((sum, f) => sum + f.bytes, 0)

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    chapters: chapterFiles.map((f) => f.path),
    verses: verseFiles.map((f) => f.path),
    chapterBytes,
    verseBytes,
    totalBytes: chapterBytes + verseBytes,
  }

  const outPath = path.join(jsonRoot, 'cache-manifest.json')
  await writeFile(outPath, JSON.stringify(manifest), 'utf-8')
  const mb = (manifest.totalBytes / 1024 / 1024).toFixed(1)
  console.log(`写入 ${outPath}`)
  console.log(`  整章: ${chapterFiles.length}，经节: ${verseFiles.length}，合计约 ${mb} MB`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
