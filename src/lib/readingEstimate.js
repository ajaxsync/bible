/** 中文约每分钟可读字数 */
const CHARS_PER_MINUTE_ZH = 350
/** 英文约每分钟可读词数 */
const WORDS_PER_MINUTE_EN = 220

function collectVerseText(chapterData) {
  if (!chapterData?.sections) return ''
  const parts = []
  for (const section of chapterData.sections) {
    if (section.type === 'heading' && section.heading) {
      parts.push(section.heading)
    }
    if (section.contents) {
      for (const item of section.contents) {
        if (item.verseText) parts.push(item.verseText)
      }
    }
  }
  return parts.join('')
}

export function countChapterChars(chapterData, lang) {
  const text = collectVerseText(chapterData)
  if (!text) return 0

  if (lang === 'en') {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  // 中文：去掉空白后按字符计
  return text.replace(/\s+/g, '').length
}

export function estimateReadingMinutes(count, lang) {
  if (count <= 0) return 0
  const rate = lang === 'en' ? WORDS_PER_MINUTE_EN : CHARS_PER_MINUTE_ZH
  return Math.max(1, Math.ceil(count / rate))
}

export function formatReadingEstimate(chapterData, lang) {
  const count = countChapterChars(chapterData, lang)
  const minutes = estimateReadingMinutes(count, lang)

  if (lang === 'en') {
    if (count <= 0) return 'About 1 min read'
    return `${count.toLocaleString('en')} words · about ${minutes} min`
  }

  if (lang === 'cht') {
    if (count <= 0) return '預計閱讀約 1 分鐘'
    return `本文共 ${count.toLocaleString('zh-TW')} 字，預計閱讀約 ${minutes} 分鐘`
  }

  if (count <= 0) return '预计阅读约 1 分钟'
  return `本文共 ${count.toLocaleString('zh-CN')} 字，预计阅读约 ${minutes} 分钟`
}
