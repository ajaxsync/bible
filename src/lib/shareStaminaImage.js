import { getFontEmbedCSS, toPng } from 'html-to-image'

const CAPTURE_PADDING_PX = 40

function getShareBackgroundColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  return value || '#ffffff'
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

function inlineComputedStyles(root) {
  const restores = []

  root.querySelectorAll('*').forEach((node) => {
    if (!(node instanceof HTMLElement)) return

    const computed = getComputedStyle(node)
    const snapshot = {
      color: node.style.color,
      backgroundColor: node.style.backgroundColor,
      borderColor: node.style.borderColor,
      border: node.style.border,
      fill: node.style.fill,
      stroke: node.style.stroke,
    }
    restores.push({ node, snapshot })

    if (computed.color) node.style.color = computed.color
    if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      node.style.backgroundColor = computed.backgroundColor
    }
    if (computed.borderColor) node.style.borderColor = computed.borderColor
    if (computed.border && computed.border !== 'none') node.style.border = computed.border

    const resolvedColor = computed.color || getComputedStyle(node.parentElement ?? root).color
    if (node instanceof SVGElement) {
      if (!computed.fill || computed.fill === 'none' || computed.fill.includes('current')) {
        node.style.fill = computed.fill === 'none' ? 'none' : resolvedColor
      } else {
        node.style.fill = computed.fill
      }
      if (!computed.stroke || computed.stroke.includes('current')) {
        node.style.stroke = resolvedColor
      } else if (computed.stroke !== 'none') {
        node.style.stroke = computed.stroke
      }
    } else {
      if (computed.fill && computed.fill !== 'none') node.style.fill = computed.fill
      if (computed.stroke && computed.stroke !== 'none') node.style.stroke = computed.stroke
    }
  })

  return () => {
    restores.forEach(({ node, snapshot }) => {
      Object.entries(snapshot).forEach(([key, value]) => {
        node.style[key] = value
      })
    })
  }
}

export async function captureElementAsPng(element) {
  if (!element) throw new Error('missing-element')

  const rect = element.getBoundingClientRect()
  const contentWidth = Math.ceil(rect.width)
  if (contentWidth <= 0) throw new Error('capture-size-zero')

  const backgroundColor = getShareBackgroundColor()
  const original = {
    boxSizing: element.style.boxSizing,
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    padding: element.style.padding,
    background: element.style.background,
  }

  element.style.boxSizing = 'border-box'
  element.style.width = `${contentWidth}px`
  element.style.maxWidth = `${contentWidth}px`
  element.style.padding = `${CAPTURE_PADDING_PX}px`
  element.style.background = backgroundColor

  const watermark = document.createElement('p')
  watermark.className = 'stamina-share-watermark'
  watermark.setAttribute('aria-hidden', 'true')
  watermark.textContent = '©️ Bible Reader'
  element.appendChild(watermark)

  const restoreStyles = inlineComputedStyles(element)

  try {
    await waitForPaint()

    if (element.offsetWidth <= 0 || element.offsetHeight <= 0) {
      throw new Error('capture-size-zero')
    }

    const fontEmbedCSS = await getFontEmbedCSS(document.documentElement)

    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor,
      skipFonts: false,
      fontEmbedCSS,
    })

    if (dataUrl.length < 5000) {
      throw new Error('capture-empty')
    }

    return dataUrl
  } finally {
    watermark.remove()
    restoreStyles()
    element.style.boxSizing = original.boxSizing
    element.style.width = original.width
    element.style.maxWidth = original.maxWidth
    element.style.padding = original.padding
    element.style.background = original.background
  }
}

export async function shareDataUrlImage(dataUrl, { title }) {
  if (!navigator.share) {
    throw new Error('share-not-supported')
  }

  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const file = new File([blob], 'stamina.png', { type: 'image/png' })

  try {
    await navigator.share({ files: [file], title })
  } catch (err) {
    if (err?.name === 'AbortError') return
    throw err
  }
}

export function downloadDataUrl(dataUrl, filename = 'stamina.png') {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

export async function shareStaminaImage(element, { title }) {
  const dataUrl = await captureElementAsPng(element)
  await shareDataUrlImage(dataUrl, { title })
  return dataUrl
}

export function downloadStaminaImage(element, filename = 'stamina.png') {
  return captureElementAsPng(element).then((dataUrl) => downloadDataUrl(dataUrl, filename))
}
