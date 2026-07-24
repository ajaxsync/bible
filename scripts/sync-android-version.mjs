import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = join(root, 'package.json')
const gradlePath = join(root, 'android', 'app', 'build.gradle')

const APK_NAME_START = '// --- bible-apk-output-name:start (managed by sync-android-version.mjs) ---'
const APK_NAME_END = '// --- bible-apk-output-name:end ---'

/**
 * semver x.y.z → versionCode = x*10000 + y*100 + z
 * 例：0.1.0 → 100；1.0.1 → 10001；1.2.3 → 10203
 */
export function versionNameToCode(versionName) {
  const match = String(versionName).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
  if (!match) {
    throw new Error(`package.json version 须为 x.y.z（如 1.0.1），当前: ${versionName}`)
  }
  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  if (minor > 99 || patch > 99) {
    throw new Error(`minor/patch 须 ≤ 99（当前 ${versionName}），以便映射 versionCode`)
  }
  return major * 10000 + minor * 100 + patch
}

function apkOutputNameBlock() {
  return `${APK_NAME_START}
android.applicationVariants.configureEach { variant ->
    variant.outputs.configureEach { output ->
        // release: bible_reader_x.y.z.apk; debug: bible_reader_x.y.z-debug.apk
        def ver = variant.versionName
        if (variant.buildType.name == "release") {
            output.outputFileName = "bible_reader_\${ver}.apk"
        } else {
            output.outputFileName = "bible_reader_\${ver}-\${variant.buildType.name}.apk"
        }
    }
}
${APK_NAME_END}
`
}

function ensureApkOutputName(gradle) {
  const block = apkOutputNameBlock()
  const start = gradle.indexOf(APK_NAME_START)
  const end = gradle.indexOf(APK_NAME_END)
  if (start !== -1 && end !== -1 && end > start) {
    return `${gradle.slice(0, start)}${block}${gradle.slice(end + APK_NAME_END.length).replace(/^\r?\n/, '')}`
  }
  return `${gradle.trimEnd()}\n\n${block}`
}

function syncAndroidVersion() {
  if (!existsSync(gradlePath)) {
    console.warn('[sync-android-version] 未找到 android/app/build.gradle，跳过（需先 cap add android）')
    return
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const versionName = pkg.version
  const versionCode = versionNameToCode(versionName)

  let gradle = readFileSync(gradlePath, 'utf8')
  if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+"[^"]*"/.test(gradle)) {
    throw new Error('android/app/build.gradle 中未找到 versionCode / versionName')
  }

  gradle = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`)

  gradle = ensureApkOutputName(gradle)

  writeFileSync(gradlePath, gradle)
  console.log(`[sync-android-version] ${versionName} → versionCode ${versionCode}`)
  console.log(`[sync-android-version] APK 命名: bible_reader_${versionName}.apk（release）/ bible_reader_${versionName}-debug.apk`)
}

syncAndroidVersion()
