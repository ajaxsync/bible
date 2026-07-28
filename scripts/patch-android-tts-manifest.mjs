/**
 * Android 11+ 包可见性：声明可查询系统 TTS 服务，否则 TextToSpeech 无法绑定引擎
 *（小米等真机常见「朗读无声 / not bound to TTS engine」）。
 *
 * 在 cap sync 之后写入 android/app/src/main/AndroidManifest.xml
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')

const QUERIES_BLOCK = `    <queries>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
        <package android:name="com.google.android.tts" />
        <package android:name="com.xiaomi.mibrain.speech" />
        <package android:name="com.miui.voiceassist" />
    </queries>
`

function patchAndroidTtsManifest() {
  if (!existsSync(manifestPath)) {
    console.warn('[patch-android-tts] 未找到 AndroidManifest.xml，跳过')
    return
  }

  let xml = readFileSync(manifestPath, 'utf8')

  if (xml.includes('android.intent.action.TTS_SERVICE')) {
    console.log('[patch-android-tts] Manifest 已含 TTS_SERVICE queries')
    return
  }

  if (/<queries>[\s\S]*?<\/queries>/.test(xml)) {
    xml = xml.replace(
      /<queries>([\s\S]*?)<\/queries>/,
      (match, inner) => {
        if (inner.includes('TTS_SERVICE')) return match
        return `<queries>${inner}
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
        <package android:name="com.google.android.tts" />
        <package android:name="com.xiaomi.mibrain.speech" />
        <package android:name="com.miui.voiceassist" />
    </queries>`
      },
    )
  } else if (xml.includes('</manifest>')) {
    xml = xml.replace('</manifest>', `${QUERIES_BLOCK}</manifest>`)
  } else {
    throw new Error('[patch-android-tts] 无法解析 AndroidManifest.xml')
  }

  writeFileSync(manifestPath, xml)
  console.log('[patch-android-tts] 已写入 TTS_SERVICE queries')
}

patchAndroidTtsManifest()
