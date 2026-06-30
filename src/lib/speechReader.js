const LANG_BCP47 = {
  chs: 'zh-CN',
  cht: 'zh-TW',
  en: 'en-US',
}

export const SPEECH_LANGS = Object.keys(LANG_BCP47)

export const SPEECH_RATES = [0.5, 0.8, 1, 1.5, 2]

const SPEECH_RATE_STORAGE_KEY = 'bible-speech-rate'

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
  return typeof window !== 'undefined' && 'speechSynthesis' in window
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

function normalizeLang(lang) {
  return LANG_BCP47[lang] || 'zh-CN'
}

function normalizeVoiceLang(voiceLang) {
  return voiceLang.replace('_', '-').toLowerCase()
}

export function getVoicesForLang(lang) {
  if (!isSpeechSupported()) return []

  const bcp47 = normalizeLang(lang).toLowerCase()
  const primary = bcp47.split('-')[0]
  const seen = new Set()

  return window.speechSynthesis.getVoices()
    .filter((voice) => {
      const voiceLang = normalizeVoiceLang(voice.lang)
      return voiceLang === bcp47
        || voiceLang.startsWith(`${primary}-`)
        || voiceLang === primary
    })
    .filter((voice) => {
      if (seen.has(voice.voiceURI)) return false
      seen.add(voice.voiceURI)
      return true
    })
    .sort((a, b) => {
      if (a.localService !== b.localService) return a.localService ? -1 : 1
      if (a.default !== b.default) return a.default ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

function findDefaultVoice(bcp47) {
  const voices = window.speechSynthesis.getVoices()
  const target = bcp47.toLowerCase()
  const primary = target.split('-')[0]

  return (
    voices.find((v) => normalizeVoiceLang(v.lang) === target)
    || voices.find((v) => normalizeVoiceLang(v.lang).startsWith(primary))
    || null
  )
}

export class SpeechReader {
  constructor({ onVerseChange, onStatusChange, onComplete, onVoicesChanged }) {
    this.onVerseChange = onVerseChange
    this.onStatusChange = onStatusChange
    this.onComplete = onComplete
    this.onVoicesChanged = onVoicesChanged
    this.queue = []
    this.index = 0
    this.lang = 'chs'
    this.rate = loadSpeechRate()
    this.voiceURIs = loadAllSpeechVoices()
    this.status = 'idle'
    this._boundVoicesChanged = () => {
      window.speechSynthesis.getVoices()
      this.onVoicesChanged?.()
    }

    if (isSpeechSupported()) {
      window.speechSynthesis.addEventListener('voiceschanged', this._boundVoicesChanged)
      window.speechSynthesis.getVoices()
    }
  }

  destroy() {
    if (!isSpeechSupported()) return
    window.speechSynthesis.removeEventListener('voiceschanged', this._boundVoicesChanged)
    this.stop()
  }

  _setStatus(status) {
    this.status = status
    this.onStatusChange?.(status)
  }

  play(queue, lang) {
    if (!isSpeechSupported() || !queue.length) return false

    this.stop(false)
    this.queue = queue
    this.index = 0
    this.lang = lang
    this._setStatus('playing')
    this._speakCurrent()
    return true
  }

  pause() {
    if (this.status !== 'playing' || !isSpeechSupported()) return
    window.speechSynthesis.pause()
    this._setStatus('paused')
  }

  resume() {
    if (this.status !== 'paused' || !isSpeechSupported()) return
    window.speechSynthesis.resume()
    this._setStatus('playing')
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
    if (!isSpeechSupported()) return

    const pauseAfter = this.status === 'paused'
    window.speechSynthesis.cancel()
    this._pauseAfterStart = pauseAfter
    this._setStatus('playing')
    this._speakCurrent()
  }

  _resolveVoice(lang) {
    const uri = this.voiceURIs[lang]
    if (uri && isSpeechSupported()) {
      const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === uri)
      if (match) return match
    }
    return findDefaultVoice(normalizeLang(lang))
  }

  stop(clearVerse = true) {
    if (isSpeechSupported()) window.speechSynthesis.cancel()
    this.queue = []
    this.index = 0
    this._setStatus('idle')
    if (clearVerse) this.onVerseChange?.(null)
  }

  getProgress() {
    if (!this.queue.length) return { index: 0, total: 0 }
    return { index: this.index, total: this.queue.length }
  }

  _speakCurrent() {
    if (!isSpeechSupported()) return

    if (this.index >= this.queue.length) {
      this.onComplete?.()
      this.stop(true)
      return
    }

    const { verseNum, text } = this.queue[this.index]
    this.onVerseChange?.(verseNum)

    const utter = new SpeechSynthesisUtterance(text)
    const bcp47 = normalizeLang(this.lang)
    const voice = this._resolveVoice(this.lang)
    if (voice) utter.voice = voice
    utter.lang = bcp47
    utter.rate = this.rate

    if (this._pauseAfterStart) {
      utter.onstart = () => {
        this._pauseAfterStart = false
        window.speechSynthesis.pause()
        this._setStatus('paused')
      }
    }

    utter.onend = () => {
      this.index += 1
      this._speakCurrent()
    }

    utter.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return
      this.stop(true)
    }

    window.speechSynthesis.speak(utter)
  }
}
