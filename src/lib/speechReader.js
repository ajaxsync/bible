import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'
import { isNativeApp } from './platform.js'

const LANG_BCP47 = {
  chs: 'zh-CN',
  cht: 'zh-TW',
  en: 'en-US',
}

export const SPEECH_LANGS = Object.keys(LANG_BCP47)

export const SPEECH_RATES = [0.5, 0.8, 1, 1.5, 2]

const SPEECH_RATE_STORAGE_KEY = 'bible-speech-rate'

/** @type {{ ready: boolean, supported: boolean, engine: 'native' | 'web' | null, ttsReady: boolean }} */
const supportState = {
  ready: false,
  supported: typeof window !== 'undefined' && (isNativeApp() || 'speechSynthesis' in window),
  engine: null,
  ttsReady: false,
}

/** @type {Array<{ name: string, lang: string, voiceURI: string, localService: boolean }> | null} */
let cachedVoices = null

function speechVoiceStorageKey(lang) {
  return `bible-speech-voice-${lang}`
}

export function loadSpeechVoice(lang) {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(speechVoiceStorageKey(lang)) || ''
}

export function storeSpeechVoice(lang, voiceURI) {
  if (typeof window === 'undefined') return
  const key = speechVoiceStorageKey(lang)
  if (!voiceURI) localStorage.removeItem(key)
  else localStorage.setItem(key, voiceURI)
}

function loadAllSpeechVoices() {
  return Object.fromEntries(SPEECH_LANGS.map((lang) => [lang, loadSpeechVoice(lang)]))
}

export function loadSpeechRate() {
  if (typeof window === 'undefined') return 1
  const raw = localStorage.getItem(SPEECH_RATE_STORAGE_KEY)
  if (!raw) return 1
  const value = parseFloat(raw)
  return SPEECH_RATES.includes(value) ? value : 1
}

export function storeSpeechRate(rate) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SPEECH_RATE_STORAGE_KEY, String(rate))
}

export function isSpeechSupported() {
  return supportState.supported
}

export function isSpeechSupportReady() {
  return supportState.ready
}

export function isNativeSpeechEngine() {
  return supportState.engine === 'native'
}

/** 原生 TTS 引擎是否已完成初始化（模拟器/缺语音包时可能为 false） */
export function isNativeTtsReady() {
  return supportState.ttsReady
}

export function normalizeLang(lang) {
  return LANG_BCP47[lang] || 'zh-CN'
}

function normalizeVoiceLang(voiceLang = '') {
  return String(voiceLang).replace('_', '-').toLowerCase()
}

function filterVoicesForLang(voices, lang) {
  const bcp47 = normalizeLang(lang).toLowerCase()
  const primary = bcp47.split('-')[0]
  const wantChinese = primary === 'zh'
  const wantTraditional = bcp47.includes('tw') || bcp47.includes('hk') || bcp47.includes('hant')
  const seen = new Set()

  return voices
    .filter((voice) => {
      const voiceLang = normalizeVoiceLang(voice.lang)
      const name = String(voice.name || '').toLowerCase()
      if (voiceLang === bcp47 || voiceLang.startsWith(`${primary}-`) || voiceLang === primary) return true
      // 小米 / 部分引擎用 cmn-Hans-CN、zh_CN、Chinese 等
      if (wantChinese) {
        if (voiceLang.startsWith('zh') || voiceLang.startsWith('cmn')) return true
        if (name.includes('chinese') || name.includes('中文') || name.includes('普通话') || name.includes('國語')) {
          return true
        }
      }
      return false
    })
    .filter((voice) => {
      if (seen.has(voice.voiceURI)) return false
      seen.add(voice.voiceURI)
      return true
    })
    .sort((a, b) => {
      if (wantChinese && wantTraditional) {
        const score = (v) => {
          const l = normalizeVoiceLang(v.lang)
          if (l.includes('tw') || l.includes('hk') || l.includes('hant')) return 0
          return 1
        }
        const diff = score(a) - score(b)
        if (diff !== 0) return diff
      } else if (wantChinese) {
        const score = (v) => {
          const l = normalizeVoiceLang(v.lang)
          if (l.includes('cn') || l.includes('hans') || l === 'zh') return 0
          return 1
        }
        const diff = score(a) - score(b)
        if (diff !== 0) return diff
      }
      if (a.localService !== b.localService) return a.localService ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

function resolveNativeVoiceId(lang, preferredURI) {
  const voices = getVoicesForLang(lang)
  if (preferredURI && voices.some((v) => v.voiceURI === preferredURI)) {
    return preferredURI
  }
  return voices[0]?.voiceURI || undefined
}

function mapNativeVoices(voices) {
  return voices.map((voice) => ({
    name: voice.name,
    lang: voice.language,
    voiceURI: voice.id,
    localService: !voice.isNetworkConnectionRequired,
  }))
}

function mapWebVoices(voices) {
  return voices.map((voice) => ({
    name: voice.name,
    lang: voice.lang,
    voiceURI: voice.voiceURI,
    localService: Boolean(voice.localService),
  }))
}

export function getVoicesForLang(lang) {
  if (!cachedVoices) return []
  return filterVoicesForLang(cachedVoices, lang)
}

export async function refreshSpeechVoices() {
  if (supportState.engine === 'native') {
    try {
      const { voices } = await SpeechSynthesis.getVoices()
      cachedVoices = mapNativeVoices(voices || [])
    } catch {
      cachedVoices = []
    }
    return cachedVoices
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = mapWebVoices(window.speechSynthesis.getVoices())
    return cachedVoices
  }

  cachedVoices = []
  return cachedVoices
}

/**
 * 等待 Android TTS 引擎初始化完成（插件 initialize 不会等回调）。
 * @returns {Promise<boolean>}
 */
async function waitForNativeTtsReady(timeoutMs = 8000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const { isAvailable } = await SpeechSynthesis.isAvailable()
      if (isAvailable) return true
    } catch {
      // 继续重试
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150))
  }
  return false
}

/**
 * 探测朗读能力：原生 App 用系统 TTS，浏览器用 Web Speech。
 * 原生壳始终展示入口（避免 TTS 异步初始化竞态把按钮藏掉）；引擎未就绪时播放再提示。
 * @returns {Promise<boolean>}
 */
export async function probeSpeechSupport() {
  if (typeof window === 'undefined') {
    supportState.ready = true
    supportState.supported = false
    supportState.engine = null
    return false
  }

  if (isNativeApp()) {
    // App 内优先原生引擎；不因 isAvailable 瞬时 false 隐藏入口
    supportState.engine = 'native'
    supportState.supported = true
    supportState.ttsReady = false
    try {
      await SpeechSynthesis.initialize().catch(() => {})
      supportState.ttsReady = await waitForNativeTtsReady()
      await refreshSpeechVoices()
    } catch {
      supportState.ttsReady = false
    }
    supportState.ready = true
    return true
  }

  const webOk = 'speechSynthesis' in window
  supportState.engine = webOk ? 'web' : null
  supportState.supported = webOk
  supportState.ttsReady = webOk
  if (webOk) await refreshSpeechVoices()
  supportState.ready = true
  return supportState.supported
}

export function getChapterVerseTotal(chapterData) {
  let max = 0
  for (const section of chapterData?.sections || []) {
    if (!section.contents) continue
    for (const item of section.contents) {
      if (item.verseNum > max) max = item.verseNum
    }
  }
  return max
}

export function getVerseText(chapterData, verseNum) {
  const parts = []
  for (const section of chapterData?.sections || []) {
    if (!section.contents) continue
    for (const item of section.contents) {
      if (item.verseNum === verseNum) {
        const chunk = (item.verseText || '').trim()
        if (chunk) parts.push(chunk)
      }
    }
  }
  return parts.join('')
}

export function buildVerseQueue(chapterData, fromVerse = 1) {
  const byVerse = new Map()

  for (const section of chapterData?.sections || []) {
    if (!section.contents) continue
    for (const item of section.contents) {
      const { verseNum, verseText } = item
      if (!verseNum) continue
      const chunk = (verseText || '').trim()
      if (!chunk) continue
      byVerse.set(verseNum, byVerse.has(verseNum) ? byVerse.get(verseNum) + chunk : chunk)
    }
  }

  return [...byVerse.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([num]) => num >= fromVerse)
    .map(([verseNum, text]) => ({ verseNum, text }))
}

function findDefaultVoiceURI(lang) {
  const voices = getVoicesForLang(lang)
  return voices[0]?.voiceURI || ''
}

/** Web Speech 引擎 */
class WebSpeechEngine {
  constructor({ onEnd, onError, onStart, onVoicesChanged }) {
    this.onEnd = onEnd
    this.onError = onError
    this.onStart = onStart
    this.onVoicesChanged = onVoicesChanged
    this._utter = null
    this._boundVoicesChanged = () => {
      refreshSpeechVoices()
      this.onVoicesChanged?.()
    }
    window.speechSynthesis.addEventListener('voiceschanged', this._boundVoicesChanged)
    window.speechSynthesis.getVoices()
    refreshSpeechVoices()
  }

  destroy() {
    window.speechSynthesis.removeEventListener('voiceschanged', this._boundVoicesChanged)
    this.cancel()
  }

  speak(text, { lang, rate, voiceURI }) {
    const utter = new SpeechSynthesisUtterance(text)
    const bcp47 = normalizeLang(lang)
    utter.lang = bcp47
    utter.rate = rate

    if (voiceURI) {
      const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI)
      if (match) utter.voice = match
    } else {
      const fallbackURI = findDefaultVoiceURI(lang)
      const match = fallbackURI
        ? window.speechSynthesis.getVoices().find((v) => v.voiceURI === fallbackURI)
        : null
      if (match) utter.voice = match
    }

    utter.onstart = () => this.onStart?.()
    utter.onend = () => this.onEnd?.()
    utter.onerror = (event) => this.onError?.(event)

    this._utter = utter
    window.speechSynthesis.speak(utter)
  }

  cancel() {
    window.speechSynthesis.cancel()
    this._utter = null
  }

  pause() {
    window.speechSynthesis.pause()
  }

  resume() {
    window.speechSynthesis.resume()
  }
}

/** Capacitor 原生 TTS 引擎（Android TextToSpeech / iOS AVSpeech） */
class NativeSpeechEngine {
  constructor({ onEnd, onError, onStart, onVoicesChanged }) {
    this.onEnd = onEnd
    this.onError = onError
    this.onStart = onStart
    this.onVoicesChanged = onVoicesChanged
    this._utteranceId = null
    this._listeners = []
    this._ignoreEnd = false
    this._ready = this._setup()
  }

  async _setup() {
    try {
      await SpeechSynthesis.initialize().catch(() => {})
      const startHandle = await SpeechSynthesis.addListener('start', (event) => {
        if (event.utteranceId !== this._utteranceId) return
        this.onStart?.()
      })
      const endHandle = await SpeechSynthesis.addListener('end', (event) => {
        if (event.utteranceId !== this._utteranceId) return
        if (this._ignoreEnd) {
          this._ignoreEnd = false
          return
        }
        this.onEnd?.()
      })
      const errorHandle = await SpeechSynthesis.addListener('error', (event) => {
        if (event.utteranceId && this._utteranceId && event.utteranceId !== this._utteranceId) return
        this.onError?.({ error: event.error || 'error' })
      })
      this._listeners = [startHandle, endHandle, errorHandle]
      await refreshSpeechVoices()
      this.onVoicesChanged?.()
    } catch {
      // 忽略初始化失败，后续 speak 会再报错
    }
  }

  async destroy() {
    this._ignoreEnd = true
    try {
      await SpeechSynthesis.cancel()
    } catch {
      // ignore
    }
    await Promise.all(this._listeners.map((handle) => handle?.remove?.().catch(() => {})))
    this._listeners = []
    try {
      await SpeechSynthesis.removeAllListeners()
    } catch {
      // ignore
    }
  }

  async speak(text, { lang, rate, voiceURI }) {
    await this._ready
    if (!supportState.ttsReady) {
      supportState.ttsReady = await waitForNativeTtsReady(4000)
    }
    if (!supportState.ttsReady) {
      throw new Error('tts-unavailable')
    }

    await refreshSpeechVoices()
    const voiceId = resolveNativeVoiceId(lang, voiceURI)

    this._ignoreEnd = false
    const payload = {
      text,
      language: normalizeLang(lang),
      rate,
      queueStrategy: 'Flush',
    }
    if (voiceId) payload.voiceId = voiceId

    try {
      const result = await SpeechSynthesis.speak(payload)
      this._utteranceId = result.utteranceId
      supportState.ttsReady = true
    } catch (err) {
      // 指定音色失败时回退为仅语言
      if (voiceId) {
        const result = await SpeechSynthesis.speak({
          text,
          language: normalizeLang(lang),
          rate,
          queueStrategy: 'Flush',
        })
        this._utteranceId = result.utteranceId
        supportState.ttsReady = true
        return
      }
      throw err
    }
  }

  async cancel() {
    this._ignoreEnd = true
    this._utteranceId = null
    try {
      await SpeechSynthesis.cancel()
    } catch {
      // ignore
    }
  }

  async pause() {
    await SpeechSynthesis.pause()
  }

  async resume() {
    await SpeechSynthesis.resume()
  }
}

export class SpeechReader {
  constructor({ onVerseChange, onStatusChange, onComplete, onVoicesChanged, onPlayError }) {
    this.onVerseChange = onVerseChange
    this.onStatusChange = onStatusChange
    this.onComplete = onComplete
    this.onVoicesChanged = onVoicesChanged
    this.onPlayError = onPlayError
    this.queue = []
    this.index = 0
    this.lang = 'chs'
    this.rate = loadSpeechRate()
    this.voiceURIs = loadAllSpeechVoices()
    this.status = 'idle'
    this.engine = null
    this._pauseAfterStart = false
    this._speakingGeneration = 0
    this._ready = this._init()
  }

  async _init() {
    await probeSpeechSupport()
    if (!supportState.supported) return

    const handlers = {
      onStart: () => {
        if (this._pauseAfterStart) {
          this._pauseAfterStart = false
          void this._pauseEngine()
          this._setStatus('paused')
        }
      },
      onEnd: () => {
        if (this.status !== 'playing') return
        this.index += 1
        void this._speakCurrent()
      },
      onError: (event) => {
        if (event?.error === 'interrupted' || event?.error === 'canceled') return
        this.onPlayError?.(event?.error || 'error')
        this.stop(true)
      },
      onVoicesChanged: () => this.onVoicesChanged?.(),
    }

    if (supportState.engine === 'native') {
      this.engine = new NativeSpeechEngine(handlers)
    } else {
      this.engine = new WebSpeechEngine(handlers)
    }
  }

  async whenReady() {
    await this._ready
    return supportState.supported
  }

  destroy() {
    void this.engine?.destroy?.()
    this.engine = null
    this.stop()
  }

  _setStatus(status) {
    this.status = status
    this.onStatusChange?.(status)
  }

  play(queue, lang) {
    if (!supportState.supported || !this.engine || !queue.length) return false

    this.stop(false)
    this.queue = queue
    this.index = 0
    this.lang = lang
    this._setStatus('playing')
    void this._speakCurrent()
    return true
  }

  pause() {
    if (this.status !== 'playing' || !this.engine) return
    void this._pauseEngine()
  }

  async _pauseEngine() {
    try {
      await this.engine.pause()
      this._setStatus('paused')
    } catch {
      // 部分机型 pause 不可用：停在当前节，resume 时重播该节
      this._speakingGeneration += 1
      try {
        await this.engine.cancel()
      } catch {
        // ignore
      }
      this._setStatus('paused')
    }
  }

  resume() {
    if (this.status !== 'paused' || !this.engine) return
    void this._resumeEngine()
  }

  async _resumeEngine() {
    try {
      await this.engine.resume()
      this._setStatus('playing')
    } catch {
      this._setStatus('playing')
      void this._speakCurrent()
    }
  }

  togglePause() {
    if (this.status === 'playing') this.pause()
    else if (this.status === 'paused') this.resume()
  }

  setRate(rate) {
    const next = Number(rate)
    if (!Number.isFinite(next) || next <= 0 || next === this.rate) return

    this.rate = next
    this._restartIfActive()
  }

  getRate() {
    return this.rate
  }

  setVoice(lang, voiceURI) {
    const next = voiceURI || ''
    if ((this.voiceURIs[lang] || '') === next) return

    this.voiceURIs[lang] = next
    storeSpeechVoice(lang, next)

    if (this.lang !== lang) return
    this._restartIfActive()
  }

  getVoiceURI(lang) {
    return this.voiceURIs[lang] || ''
  }

  _restartIfActive() {
    if (this.status !== 'playing' && this.status !== 'paused') return
    if (!this.engine) return

    const pauseAfter = this.status === 'paused'
    this._speakingGeneration += 1
    void this.engine.cancel()
    this._pauseAfterStart = pauseAfter
    this._setStatus('playing')
    void this._speakCurrent()
  }

  stop(clearVerse = true) {
    this._speakingGeneration += 1
    this._pauseAfterStart = false
    void this.engine?.cancel?.()
    this.queue = []
    this.index = 0
    this._setStatus('idle')
    if (clearVerse) this.onVerseChange?.(null)
  }

  getProgress() {
    if (!this.queue.length) return { index: 0, total: 0 }
    return { index: this.index, total: this.queue.length }
  }

  async _speakCurrent() {
    if (!this.engine || !supportState.supported) return

    const generation = this._speakingGeneration

    if (this.index >= this.queue.length) {
      this.onComplete?.()
      this.stop(true)
      return
    }

    const { verseNum, text } = this.queue[this.index]
    this.onVerseChange?.(verseNum)

    try {
      await this.engine.speak(text, {
        lang: this.lang,
        rate: this.rate,
        voiceURI: this.voiceURIs[this.lang] || '',
      })
      if (generation !== this._speakingGeneration) {
        void this.engine.cancel()
      }
    } catch (err) {
      if (generation === this._speakingGeneration) {
        const code = err?.message || 'error'
        this.onPlayError?.(code)
        this.stop(true)
      }
    }
  }
}
