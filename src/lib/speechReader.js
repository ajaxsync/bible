const LANG_BCP47 = {
  chs: 'zh-CN',
  cht: 'zh-TW',
  en: 'en-US',
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

function findVoice(bcp47) {
  const voices = window.speechSynthesis.getVoices()
  const target = bcp47.toLowerCase()
  const primary = target.split('-')[0]

  return (
    voices.find((v) => v.lang.replace('_', '-').toLowerCase() === target)
    || voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(primary))
    || null
  )
}

export class SpeechReader {
  constructor({ onVerseChange, onStatusChange, onComplete }) {
    this.onVerseChange = onVerseChange
    this.onStatusChange = onStatusChange
    this.onComplete = onComplete
    this.queue = []
    this.index = 0
    this.lang = 'chs'
    this.rate = 1
    this.status = 'idle'
    this._boundVoicesChanged = () => {
      window.speechSynthesis.getVoices()
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
    const voice = findVoice(bcp47)
    if (voice) utter.voice = voice
    utter.lang = bcp47
    utter.rate = this.rate

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
